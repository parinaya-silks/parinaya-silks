import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {loyaltyService} from '../server/loyalty.ts';
import {repairDeliveryAwards} from '../server/loyaltyRepair.ts';
import {emptyBalance,loyaltyQuote,loyaltySnapshot,type LoyaltySettings} from '../src/loyalty/model.ts';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('Loopback emulators required');

test('delivery awards are atomic and unique across payment ordering, retries, returns and dry-run repair',async()=>{
 const app=initializeApp({projectId:'parinaya-silks'},'delivery-award-tests'),db=getFirestore(app,'(default)'),service=loyaltyService(db);
 const settings:LoyaltySettings={revision:1,config:{enabled:true,earnSpendPaise:10000,earnPoints:10,pointValuePaise:100,minRedeemPoints:10,maxPercent:20,allowCoupons:true}};
 const ids:string[]=[],uids:string[]=[];
 async function seed(n:number,status='Shipped',paymentStatus='due'){
  const id=n.toString(16).padStart(32,'0'),uid='delivery-award-'+n;ids.push(id);uids.push(uid);
  const quote=loyaltyQuote(settings,emptyBalance(),100000n,false,0),snapshot=loyaltySnapshot(settings,quote,[100000n],100000n)!;
  await db.runTransaction(async tx=>{service.placed(tx,uid,emptyBalance(),snapshot,id,'LOCAL');tx.set(db.doc('orders/'+id),{uid,reference:'LOCAL',status,paymentStatus,shippingPaise:'0',revision:1,loyalty:snapshot,refunds:[],request:null,unrelated:'preserved'});});return id;
 }
 async function update(id:string,patch:Record<string,unknown>,fail=false){return db.runTransaction(async tx=>{const ref=db.doc('orders/'+id),old=(await tx.get(ref)).data()!;const change=await service.transition(tx,{...old,id} as Parameters<typeof service.transition>[1],patch,undefined,undefined,'fixture');if(change)change.commit();tx.update(ref,{...patch,...(change?{loyalty:change.snapshot}:{}),revision:old.revision+1});if(fail)throw Error('Fixture transaction failure');});}
 const account=async(n:number)=>(await db.doc('loyaltyAccounts/delivery-award-'+n).get()).data()!;
 try{
  const one=await seed(1);await update(one,{status:'Processing'});assert.equal((await account(1)).net,0);
  await update(one,{status:'Shipped',paymentStatus:'collected'});assert.equal((await account(1)).net,0,'Collection before delivery cannot earn');
  await Promise.all([update(one,{status:'Delivered'}),update(one,{status:'Delivered'})]);assert.equal((await account(1)).net,100);assert.equal((await db.collection(`loyaltyAccounts/delivery-award-1/ledger`).where('kind','==','Earned').get()).size,1);
  await update(one,{paymentStatus:'collected'});await update(one,{status:'Delivered'});assert.equal((await account(1)).net,100,'Later collection and repeated delivery cannot duplicate');
  const two=await seed(2);await assert.rejects(update(two,{status:'Delivered'},true));assert.equal((await account(2)).net,0);assert.equal((await db.doc(`loyaltyAccounts/delivery-award-2/ledger/${two}_earned`).get()).exists,false);
  await Promise.all([update(two,{status:'Delivered'}),update(two,{paymentStatus:'collected'})]);assert.equal((await account(2)).net,100);assert.equal((await account(2)).pending,0);
  const unpaid=await seed(3);await update(unpaid,{status:'Delivered'});assert.equal((await account(3)).net,100);assert.equal((await db.doc('orders/'+unpaid).get()).get('paymentStatus'),'due');assert.equal((await db.doc('orders/'+unpaid).get()).get('collection'),undefined);
  await update(unpaid,{request:{kind:'return',status:'resolved'}});assert.equal((await account(3)).net,0);await update(unpaid,{status:'Delivered'});assert.equal((await account(3)).net,0,'Resolved unpaid returns never regain earnings');
  const historical=await seed(4,'Delivered');const before=(await db.doc('orders/'+historical).get()).data();assert.equal((await repairDeliveryAwards(db,[historical]))[0].result,'eligible-dry-run');assert.deepEqual((await db.doc('orders/'+historical).get()).data(),before);assert.equal((await account(4)).net,0);
  const repaired=await Promise.all([repairDeliveryAwards(db,[historical],true),repairDeliveryAwards(db,[historical],true)]);assert.equal(repaired.flat().filter(r=>r.result==='credited').length,1);assert.equal((await account(4)).net,100);assert.equal((await db.doc('orders/'+historical).get()).get('unrelated'),'preserved');assert.equal((await repairDeliveryAwards(db,[historical],true))[0].result,'already-awarded');
  const prior=await seed(11,'Delivered');await db.doc(`loyaltyAccounts/delivery-award-11/ledger/${prior}_earned`).set({kind:'Earned',points:100});
  assert.equal((await repairDeliveryAwards(db,[prior],true))[0].result,'already-awarded');await assert.rejects(update(prior,{status:'Delivered'}),{code:'schema'});assert.equal((await account(11)).net,0,'Inconsistent existing awards stop rather than duplicate');
  const corrupt=await seed(12,'Delivered');await db.doc('loyaltyAccounts/delivery-award-12').update({pending:0});await assert.rejects(repairDeliveryAwards(db,[corrupt]));assert.equal((await db.doc(`loyaltyAccounts/delivery-award-12/ledger/${corrupt}_earned`).get()).exists,false,'Dry run validates balance conservation without writes');
  for(const [n,patch] of [[5,{refunds:[{amountPaise:1}]}],[6,{'loyalty.reversed':1}],[7,{'loyalty.config.enabled':false}],[8,{loyalty:null}],[9,{'loyalty.expected':9999}],[10,{request:{kind:'return',status:'approved'}}]] as const){const id=await seed(n,'Delivered');await db.doc('orders/'+id).update(patch);assert.notEqual((await repairDeliveryAwards(db,[id],true))[0].result,'credited');assert.equal((await account(n)).net,0);}
 }finally{for(const id of ids)await db.doc('orders/'+id).delete();for(const uid of uids)await db.recursiveDelete(db.doc('loyaltyAccounts/'+uid));await db.terminate();await deleteApp(app);}
});
