import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,setLogLevel} from 'firebase/firestore';
import {catalogService} from '../server/catalog.ts';
import {serverFirebase} from '../server/firebase.ts';
import {emptyProduct} from '../src/products/model.ts';
import {blankAddress} from '../src/delivery/model.ts';
import {initialShipping} from '../src/shipping/model.ts';
import type {DecodedIdToken} from 'firebase-admin/auth';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('Loopback emulators required');
process.env.PARINAYA_SERVER_EMULATORS='true';setLogLevel('silent');
test('coupon management and real checkout preserve usage, transaction limits, exact retries and historical snapshots',async()=>{
 const env=await initializeTestEnvironment({projectId:'parinaya-silks',firestore:{host:'127.0.0.1',port:8080,rules:await readFile('firestore.rules','utf8')}}),db=serverFirebase().database,op=()=>randomUUID().replaceAll('-',''),pid='q'.repeat(20),cid='c'.repeat(20),aid='a'.repeat(32);
 const service=catalogService({database:db,auth:{verifyIdToken:async token=>{if(token==='guest')throw Object.assign(Error(),{code:'auth/invalid-id-token'});return {uid:token,email:token+'@example.test',aud:'parinaya-silks',admin:['owner','claim'].includes(token)} as unknown as DecodedIdToken;}},media:{} as any}),call=(body:Record<string,unknown>,role='owner')=>service.privileged(role,body);
 const coupon={code:'ONCE10',kind:'percent',value:10,enabled:true,minimumPaise:0,capPaise:5000,globalLimit:1,perCustomerLimit:null,startsAt:null,endsAt:null},save=(input:Record<string,unknown>= coupon,expectedRevision=0,operationId=op())=>call({action:'coupons:save',coupon:input,expectedRevision,operationId});
 try{await env.clearFirestore();for(const uid of ['owner','record'])await db.doc('adminAccess/'+uid).set({enabled:true});
  for(const role of ['customer-a','claim','record'])for(const action of ['coupons:list','coupons:get','coupons:save'])await assert.rejects(call({action},role),{code:'permission'});await assert.rejects(call({action:'coupons:list'},'guest'),{code:'unauthorized'});
  const id=op();await save(coupon,0,id);await save(coupon,0,id);await assert.rejects(save({...coupon,value:20},0,id),{code:'conflict'});await assert.rejects(save(),{code:'conflict'});await assert.rejects(call({action:'coupons:delete',coupon,expectedRevision:1,operationId:op()}),{code:'invalid'});
  await db.doc('coupons/ONCE10').update({legacyNote:'preserved'});const current=await call({action:'coupons:get',code:'ONCE10'}) as any;assert.equal(current.revision,1);assert.equal(current.uses,0);assert.equal('operationHash' in current,false);
  await db.doc('categories/'+cid).set({enabled:true,name:'Silk'});await db.doc('products/'+pid).set({...emptyProduct(),name:'Coupon fixture',description:'Local only',slug:'coupon-fixture',sku:'COUPON',categoryId:cid,status:'Published',schemaVersion:1,revision:1,pricePaise:100000,inventory:{mode:'simple',quantity:10},coverMediaId:'f'.repeat(32),images:[{mediaId:'f'.repeat(32),alt:'Fixture',url:'https://res.cloudinary.com/parinaya-emulator/image/upload/v1/fixture.jpg',width:300,height:400}],createdAt:new Date(),updatedAt:new Date()});await db.doc('siteSettings/shipping').set({...initialShipping(),schemaVersion:1,revision:1});
  for(const uid of ['customer-a','customer-b']){await db.doc(`customerShopping/${uid}/addresses/${aid}`).set({...blankAddress(),recipientName:'Synthetic Customer',mobileNumber:'+919876543210',pinCode:'500034',line1:'Example',locality:'Example',city:'Hyderabad',state:'Telangana',revision:1,createdAt:new Date(),updatedAt:new Date()});await db.doc(`customerShopping/${uid}/bag/${pid}--simple`).set({productId:pid,variantId:null,quantity:1,createdAt:new Date(),updatedAt:new Date()});}
  const review=(uid:string,code='ONCE10')=>call({action:'orders:review',addressId:aid,couponCode:code},uid) as Promise<any>;
  const a=await review('customer-a'),b=await review('customer-b');assert.equal(a.discountPaise,'5000');assert.equal((await db.doc('coupons/ONCE10').get()).get('uses'),0,'Review never redeems');
  const bodies=[a,b].map(r=>({action:'orders:place',addressId:aid,couponCode:'ONCE10',fingerprint:r.fingerprint,operationId:op()}));const race=await Promise.allSettled(bodies.map((body,i)=>call(body,i?'customer-b':'customer-a')));assert.equal(race.filter(r=>r.status==='fulfilled').length,1);const winner=race.findIndex(r=>r.status==='fulfilled'),uid=winner?'customer-b':'customer-a',accepted=(race[winner] as PromiseFulfilledResult<any>).value.order;
  assert.equal((await db.doc('coupons/ONCE10').get()).get('uses'),1);assert.equal((await db.collection('orders').get()).size,1);assert.equal((await db.doc('products/'+pid).get()).get('inventory.quantity'),9);
  assert.equal((await call(bodies[winner],uid)).order.id,accepted.id);assert.equal((await db.doc('coupons/ONCE10').get()).get('uses'),1);
  const before=(await db.doc('orders/'+accepted.id).get()).data();await save({...coupon,value:20},1);assert.equal((await db.doc('coupons/ONCE10').get()).get('uses'),1);assert.equal((await db.doc('coupons/ONCE10').get()).get('legacyNote'),'preserved');assert.deepEqual((await db.doc('orders/'+accepted.id).get()).data(),before,'Admin edit cannot rewrite accepted snapshots');
  await call(bodies[winner],uid);assert.equal((await db.doc('coupons/ONCE10').get()).get('uses'),1);await assert.rejects(save({...coupon,value:30},1),{code:'conflict'});
  // A settings save and another real redemption contend on the same document without losing counts.
  const unlimited={...coupon,code:'MORE10',globalLimit:null};await save(unlimited);const remaining=winner?'customer-a':'customer-b',r=await review(remaining,'MORE10');const place={action:'orders:place',addressId:aid,couponCode:'MORE10',fingerprint:r.fingerprint,operationId:op()};
  const both=await Promise.allSettled([call(place,remaining),save({...unlimited,value:15},1)]);assert.equal(both[1].status,'fulfilled');const result=both[0].status==='fulfilled'?both[0].value as any:null,uses=(await db.doc('coupons/MORE10').get()).get('uses');assert.equal(uses,result?.order?1:0);assert.ok(result?.order||result?.changed||both[0].status==='rejected');
  const fresh=await review(remaining,'MORE10');await save({...unlimited,value:25},2);const changed=await call({...place,operationId:op(),fingerprint:fresh.fingerprint},remaining) as any;assert.equal(changed.changed,true,'Changed settings require renewed review');assert.equal((await db.doc('coupons/MORE10').get()).get('uses'),uses);
  await db.doc('coupons/LEGACY').set({code:'LEGACY',kind:'fixed',value:100,enabled:true,revision:1,uses:0});assert.equal((await call({action:'coupons:get',code:'LEGACY'}) as any).endsAt,null);assert.equal((await review(remaining,'LEGACY')).discountPaise,'100');
  // Complete list uses deterministic ID pages; optional fields do not hide legacy rows.
  for(let i=0;i<28;i++)await db.doc('coupons/PAGE'+String(i).padStart(2,'0')).set({...coupon,code:'PAGE'+String(i).padStart(2,'0'),revision:1,uses:0});const first=await call({action:'coupons:list'}) as any,second=await call({action:'coupons:list',cursor:first.nextCursor}) as any;assert.equal(first.items.length,25);assert.equal(second.items.length,6);assert.equal(new Set([...first.items,...second.items].map(c=>c.code)).size,31);
  // Sequence restriction is derived from token-owned Delivered orders, irrespective of COD collection.
  await save({...coupon,code:'THIRD',globalLimit:null,eligibleOrderNumber:3});
  for(let n=0;n<=3;n++){
   const customer='sequence-'+n;
   await db.doc(`customerShopping/${customer}/addresses/${aid}`).set((await db.doc(`customerShopping/customer-a/addresses/${aid}`).get()).data()!);
   await db.doc(`customerShopping/${customer}/bag/${pid}--simple`).set({productId:pid,variantId:null,quantity:1});
   for(let i=0;i<n;i++)await db.doc(`orders/sequence-${n}-${i}`).set({uid:customer,status:'Delivered',paymentStatus:'due'});
   for(const status of ['Placed','Confirmed','Processing','Shipped','Cancelled','Rejected','Failed','Pending'])await db.doc(`orders/sequence-${n}-${status}`).set({uid:customer,status});
   if(n===2)assert.equal((await review(customer,'THIRD')).discountPaise,'5000');else await assert.rejects(review(customer,'THIRD'),{code:'conflict'});
  }
  await assert.rejects(review('guest','THIRD'),{code:'unauthorized'});
  await assert.rejects(call({action:'orders:review',addressId:aid,couponCode:'THIRD',uid:'sequence-2',deliveredOrders:2},'sequence-0'),{code:'invalid'});
  const seq=await review('sequence-2','THIRD'),submission={action:'orders:place',addressId:aid,couponCode:'THIRD',fingerprint:seq.fingerprint,operationId:op()};
  await db.doc('orders/sequence-2-0').update({status:'Processing'});
  await assert.rejects(call(submission,'sequence-2'),{code:'conflict'});
  assert.equal((await db.doc('coupons/THIRD').get()).get('uses'),0,'Failed eligibility must not consume a use');
  await db.doc('orders/sequence-2-0').update({status:'Delivered'});
  assert.equal((await call({...submission,fingerprint:'0'.repeat(64),operationId:op()},'sequence-2') as any).changed,true);
  assert.equal((await db.doc('coupons/THIRD').get()).get('uses'),0,'Renewed review must not consume a use');
  const sequenceBodies=[submission,{...submission,operationId:op()}];const simultaneous=await Promise.allSettled(sequenceBodies.map(body=>call(body,'sequence-2')));
  assert.equal(simultaneous.filter(x=>x.status==='fulfilled'&&!!(x.value as any).order).length,1);
  const acceptedSequence=(simultaneous[0] as PromiseFulfilledResult<any>).value?.order||(simultaneous[1] as PromiseFulfilledResult<any>).value.order;
  const successfulBody=sequenceBodies[simultaneous.findIndex(x=>x.status==='fulfilled')];
  // Retry the accepted operation, even after the customer's delivered count changes.
  if(successfulBody){await db.doc('orders/sequence-extra').set({uid:'sequence-2',status:'Delivered'});assert.equal((await call(successfulBody,'sequence-2') as any).order.id,acceptedSequence.id);await db.doc('orders/sequence-extra').delete();}
  assert.equal((await db.doc('coupons/THIRD').get()).get('uses'),1);
  await call({action:'adminOrders:update',id:acceptedSequence.id,expectedRevision:acceptedSequence.revision,operationId:op(),command:'Cancelled',note:'Local fixture cancellation'},'owner');
  await assert.rejects(review('sequence-2','THIRD'),{code:'conflict'});
  assert.equal((await db.doc('coupons/THIRD').get()).get('uses'),1,'Accepted cancellation retains usage consistently');
  const customer=env.authenticatedContext('customer-a').firestore();await assertFails(getDoc(doc(customer,'coupons','ONCE10')));await assertFails(setDoc(doc(customer,'coupons','UNTRUSTED'),coupon));await db.doc('adminAccess/owner').update({enabled:false});await assert.rejects(save({...coupon,value:30},2),{code:'permission'});
 }finally{await env.clearFirestore();await env.cleanup();}
});
