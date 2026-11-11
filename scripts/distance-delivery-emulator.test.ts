import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,setLogLevel} from 'firebase/firestore';
import type {DecodedIdToken} from 'firebase-admin/auth';
import {serverFirebase} from '../server/firebase.ts';
import {catalogService} from '../server/catalog.ts';
import {deliveryQuotes} from '../server/deliveryQuotes.ts';
import {paymentService} from '../server/payments/service.ts';
import {emptyProduct} from '../src/products/model.ts';
import {blankAddress} from '../src/delivery/model.ts';
import {initialDistanceShipping} from '../src/shipping/model.ts';
import {disabledLoyalty} from '../src/loyalty/model.ts';
import type {PaymentProvider} from '../server/payments/provider.ts';

if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||process.env.VERCEL)throw Error('Loopback emulators only.');
process.env.DISTANCE_DELIVERY_ENABLED='true';process.env.PARINAYA_SERVER_EMULATORS='true';setLogLevel('silent');
test('distance delivery: trusted settings, private quotes, cutoff, COD and online reservation/recovery',async()=>{
 const rules=await initializeTestEnvironment({projectId:'parinaya-silks',firestore:{host:'127.0.0.1',port:8080,rules:await readFile('firestore.rules','utf8')}}),db=serverFirebase().database,op=()=>randomUUID().replaceAll('-','');
 let distance=5000,calls=0;
 const route=async(origin:any,address:any)=>{calls++;assert.equal(origin.latitude,17.4);return {distanceMeters:distance,destination:address.coordinates||{latitude:17.5,longitude:78.5}};};
 const service=catalogService({database:db,routeCalculator:route,auth:{verifyIdToken:async role=>({uid:role,email:role+'@example.test',aud:'parinaya-silks',admin:['owner','claim'].includes(role)}) as unknown as DecodedIdToken},media:{} as any});
 const call=(body:Record<string,unknown>,uid='customer')=>service.privileged(uid,body) as Promise<any>;
 const pid='q'.repeat(20),cid='d'.repeat(20),aid='a'.repeat(32),origin={name:'Synthetic dispatch',fullAddress:'Fixture address',latitude:17.4,longitude:78.4,mapsUrl:'',active:true};
 const review=(uid='customer',extra:Record<string,unknown>={})=>call({action:'orders:review',addressId:aid,couponCode:null,...extra},uid);
 const body=(r:any)=>({action:'orders:place',addressId:aid,couponCode:r.couponCode,points:r.loyalty.requestedPoints,fingerprint:r.fingerprint,deliveryQuoteId:r.shipping.quoteId,operationId:op()});
 const save=async(extra:Record<string,unknown>)=>{const current=await call({action:'settings:get'},'owner');return call({action:'settings:save',shipping:null,appearance:null,expectedShippingRevision:current.shipping.revision,expectedAppearanceRevision:current.appearance.revision,operationId:op(),...extra},'owner');};
 try{
  await rules.clearFirestore();await db.doc('adminAccess/owner').set({enabled:true});await db.doc('adminAccess/record').set({enabled:true});
  for(const role of ['customer','claim','record'])await assert.rejects(call({action:'settings:get'},role),{code:'permission'});
  await db.doc('categories/'+cid).set({enabled:true,name:'Fixture'});
  await db.doc('products/'+pid).set({...emptyProduct(),schemaVersion:1,revision:1,status:'Published',name:'Distance fixture',description:'Local only',slug:'distance-fixture',sku:'DISTANCE',categoryId:cid,pricePaise:1000000,inventory:{mode:'simple',quantity:20},lowStockThreshold:0,coverMediaId:'f'.repeat(32),images:[{mediaId:'f'.repeat(32),alt:'Fixture',url:'https://res.cloudinary.com/parinaya-emulator/image/upload/v1/fixture.jpg',width:300,height:400}],createdAt:new Date(),updatedAt:new Date()});
  for(const uid of ['customer','other','online']){
   await call({action:'addresses:save',id:aid,expectedRevision:0,operationId:op(),address:{...blankAddress(),recipientName:'Synthetic Customer',mobileNumber:'+919876543210',pinCode:'500072',line1:'Flat 1',locality:'KPHB',city:'Hyderabad',state:'Telangana',...(uid==='other'?{coordinates:{latitude:17.5,longitude:78.5}}:{})}},uid);
   await db.doc(`customerShopping/${uid}/bag/${pid}--simple`).set({productId:pid,variantId:null,quantity:1,createdAt:new Date(),updatedAt:new Date()});
  }
  assert.equal((await review()).shipping.state,'unavailable');assert.equal(calls,0);
  await save({shipping:initialDistanceShipping(),dispatch:origin,expectedDispatchRevision:0,cod:{enabled:true},expectedCodRevision:0});
  let r=await review();assert.equal(r.shipping.free,true);assert.equal(r.shipping.shippingPaise,'0');assert.equal(r.totalPaise,'1000000');assert.equal(r.address.coordinates,undefined,'Legacy/manual address remains valid');
  const stable=await review('customer',{deliveryQuoteId:r.shipping.quoteId});assert.equal(stable.fingerprint,r.fingerprint);assert.equal(calls,1,'Reuse valid quote without repeated provider calls');
  assert.equal((await db.doc('products/'+pid).get()).get('inventory.quantity'),20,'Quoting never reserves stock');
  assert.equal((await db.collection('orders').get()).size,0);
  await assert.rejects(review('other',{deliveryQuoteId:r.shipping.quoteId}),{code:'conflict'});
  await assert.rejects(call({...body(r),shippingPaise:1}),{code:'invalid'});
  await db.doc('deliveryQuotes/'+r.shipping.quoteId).update({feePaise:9});await assert.rejects(call(body(r)),{code:'conflict'});
  r=await review();await db.doc('deliveryQuotes/'+r.shipping.quoteId).update({expiresAt:Date.now()-1});await assert.rejects(call(body(r)),{code:'conflict'});
  r=await review();await db.doc(`customerShopping/customer/addresses/${aid}`).update({revision:2,line1:'Changed flat'});await assert.rejects(call(body(r)),{code:'conflict'});
  r=await review();await save({dispatch:{...origin,name:'Updated origin'},expectedDispatchRevision:1});await assert.rejects(call(body(r)),{code:'conflict'});
  r=await review();await save({shipping:{...initialDistanceShipping(),freeThresholdPaise:1000001}});await assert.rejects(call(body(r)),{code:'conflict'});
  r=await review();assert.equal(r.shipping.shippingPaise,'4000');assert.equal(r.shipping.remainingPaise,'1');
  distance=30001;assert.equal((await review('other')).shipping.state,'unavailable');distance=5000;
  await db.doc('coupons/TEN').set({code:'TEN',kind:'percent',value:10,enabled:true,minimumPaise:0,startsAt:null,endsAt:null,capPaise:null,globalLimit:null,perCustomerLimit:null,uses:0,revision:1});
  await save({shipping:initialDistanceShipping()});
  await db.doc('siteSettings/loyalty').set({schemaVersion:1,revision:1,config:{...disabledLoyalty(),enabled:true,earnSpendPaise:10000,earnPoints:1,pointValuePaise:100,minRedeemPoints:1,maxPercent:50,allowCoupons:true}});
  await db.doc('loyaltyAccounts/customer').set({schemaVersion:1,revision:1,net:1000,reserved:0,pending:0});
  r=await review('customer',{couponCode:'TEN',points:10});assert.equal(r.discountPaise,'100000');assert.equal(r.shipping.shippingPaise,'4000','Coupon reduces eligibility before shipping');assert.equal(r.loyalty.discountPaise,'1000');assert.equal(r.totalPaise,'903000','Points deducted after shipping eligibility');
  const accepted=body(r),result=await call(accepted),id=result.order.id;assert.equal(result.order.shippingPaise,'4000');assert.equal(result.order.calculationPolicy,'road-distance-post-coupon-before-points-v2');assert.ok(result.order.deliverySnapshot);assert.equal((await db.doc('products/'+pid).get()).get('inventory.quantity'),19);
  assert.equal((await db.doc('coupons/TEN').get()).get('uses'),1);assert.equal((await db.doc('loyaltyAccounts/customer').get()).get('reserved'),10);
  const historical=(await db.doc('orders/'+id).get()).data();
  await save({cod:{enabled:false},expectedCodRevision:1});assert.equal((await call(accepted)).order.id,id,'Accepted operation recovers after COD disabled');assert.deepEqual((await db.doc('orders/'+id).get()).data(),historical);
  let other=await review('other');assert.ok(other.address.coordinates);await assert.rejects(call(body(other),'other'),{code:'permission'});assert.equal((await db.doc('products/'+pid).get()).get('inventory.quantity'),19);
  const env={RAZORPAY_MODE:'test',RAZORPAY_KEY_ID:'rzp_test_fixture123456',RAZORPAY_KEY_SECRET:'synthetic-key-secret',RAZORPAY_WEBHOOK_SECRET:'synthetic-hook-secret',RAZORPAY_TEST_ENVIRONMENT:'true',NODE_ENV:'development'};
  let providerOrder:any;const provider={async create(amount:number,receipt:string){return providerOrder={id:'order_Fixture',amount,currency:'INR',receipt,status:'created',amount_paid:0,notes:{internalOrderId:receipt}};},async order(){return providerOrder;},async find(){return providerOrder?[providerOrder]:[];},async payments(){return [];},async refunds(){return [];},async payment(){throw Error('No payment in this fixture');}} as PaymentProvider;
  const payments=paymentService(db,service.paymentContext,env,provider),online=await review('online'),{action,...paymentBody}=body(online);
  const initiated:any=await payments.customer('online','create-order',paymentBody);assert.ok(initiated.checkout);assert.equal((await db.doc('orders/'+initiated.id).get()).get('payment.reservation'),'active','COD OFF does not block Razorpay');
  await save({dispatch:{...origin,active:false},expectedDispatchRevision:2});const resumed:any=await payments.customer('online','resume',{id:initiated.id});assert.equal(resumed.id,initiated.id,'Accepted payment continues even if new delivery calculation is unavailable');assert.equal((await review('other')).shipping.state,'unavailable');
  const noGoogle=catalogService({database:db,auth:{verifyIdToken:async uid=>({uid,aud:'parinaya-silks'}) as DecodedIdToken},media:{} as any});
  await save({dispatch:origin,expectedDispatchRevision:3});const previousKey=process.env.GOOGLE_MAPS_API_KEY;delete process.env.GOOGLE_MAPS_API_KEY;try{const missing:any=await noGoogle.privileged('other',{action:'orders:review',addressId:aid,couponCode:null});assert.equal(missing.shipping.state,'unavailable');assert.match(missing.shipping.message,/unavailable/);}finally{if(previousKey!==undefined)process.env.GOOGLE_MAPS_API_KEY=previousKey;}
  const customer=rules.authenticatedContext('customer').firestore();for(const path of ['siteSettings/dispatchLocation','siteSettings/codAvailability','siteSettings/shipping','deliveryQuotes/'+r.shipping.quoteId]){await assertFails(getDoc(doc(customer,path)));await assertFails(setDoc(doc(customer,path),{enabled:true}));}
  assert.deepEqual((await db.doc('orders/'+id).get()).data(),historical,'Settings never recalculate completed historical snapshots');
 }finally{await rules.cleanup();}
});
