import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {serverFirebase} from '../server/firebase.ts';
import {paymentService} from '../server/payments/service.ts';
import {settlePayment} from '../server/payments/settlement.ts';
import {retireTestPaymentSchedules} from './retire-test-payment-schedules.ts';

if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('Loopback emulators required');
process.env.PARINAYA_SERVER_EMULATORS='true';process.env.METADATA_SERVER_DETECTION='none';
const env={RAZORPAY_MODE:'test',RAZORPAY_KEY_ID:'rzp_test_fixture123456',RAZORPAY_KEY_SECRET:'synthetic-secret-for-tests',RAZORPAY_WEBHOOK_SECRET:'synthetic-webhook-for-tests',NODE_ENV:'development'};

test('cutover queues, terminal TEST maintenance and Preview guards',async t=>{
 const rules=await initializeTestEnvironment({projectId:'parinaya-silks',firestore:{host:'127.0.0.1',port:8080,rules:await readFile('firestore.rules','utf8')}}),db=serverFirebase().database;
 const key=(mode:string)=>'rzp_'+mode+'_fixture123456';
 const snapshot=async(name:string)=>Object.fromEntries((await db.collection(name).get()).docs.map(d=>[d.id,d.data()]));
 try{
  for(const mode of ['test','live'] as const)await t.test(mode+' queue fills both batch limits despite earlier other-mode and rotated-key records',async()=>{
   await rules.clearFirestore();const batch=db.batch(),active={...env,RAZORPAY_MODE:mode,RAZORPAY_KEY_ID:key(mode)};
   // More than a full batch of both wrong-mode and wrong-key records sort first.
   for(const collection of ['paymentAttempts','paymentEvents'])for(const group of ['foreign-mode','foreign-key'])for(let i=0;i<25;i++)batch.set(db.doc(collection+'/a-'+group+'-'+i),{mode:group==='foreign-mode'?(mode==='test'?'live':'test'):mode,keyId:group==='foreign-key'?key(mode)+'Rotated':key(mode==='test'?'live':'test'),nextCheckAt:0,processing:'accepted',sentinel:'unchanged'});
   for(let i=0;i<20;i++){
    for(const kind of ['event','attempt']){
     const id=(kind==='event'?'e':'f')+i.toString(16).padStart(31,'0');batch.set(db.doc('orders/'+id),{uid:'fixture',totalPaise:'100',payment:{mode,expiresAt:Date.now()+600000}});
     batch.set(db.doc('paymentAttempts/'+id),{orderId:id,uid:'fixture',mode,keyId:key(mode),creation:'new',nextCheckAt:kind==='event'?Date.now()+600000:1});
     if(kind==='event'){batch.set(db.doc('paymentEvents/'+id),{mode,keyId:key(mode),providerOrderId:'order_Event'+i,processing:'accepted',nextCheckAt:1});batch.set(db.doc('paymentProviderOrders/order_Event'+i),{orderId:id,mode});}
    }
   }
   await batch.commit();const beforeEvents=await snapshot('paymentEvents'),beforeAttempts=await snapshot('paymentAttempts');
   const provider=new Proxy({},{get(){throw Error('Unstarted attempts must not call Razorpay');}}) as any;
   const result=await paymentService(db,{} as any,active,provider).work();assert.deepEqual(result,{processed:20,pending:0,checked:20});
   for(const collection of ['paymentEvents','paymentAttempts']){
    const after=await snapshot(collection),before=collection==='paymentEvents'?beforeEvents:beforeAttempts;
    for(const id of Object.keys(before).filter(id=>id.startsWith('a-')))assert.deepEqual(after[id],before[id],'foreign queue records unchanged');
   }
   assert.equal((await db.collection('paymentEvents').where('processing','==','processed').get()).size,20);
   assert.equal((await db.doc('paymentOperations/worker').get()).get('mode'),mode);
   assert.equal((await db.doc('paymentOperations/worker').get()).get('keyId'),key(mode));
  });

  const captured=(id:string,mode='test')=>({id,uid:'fixture',revision:1,history:[{action:'Confirmed',at:1}],totalPaise:'100',payment:{mode,state:'CAPTURED',reservation:'consumed',capturedAt:1,amountPaise:100,providerOrderId:'order_'+id,providerPaymentId:'pay_'+id,refundedPaise:0}});
  const attempt=(id:string,mode='test')=>({orderId:id,uid:'fixture',mode,keyId:key(mode),creation:'known',providerOrderId:'order_'+id,nextCheckAt:1,refunds:[],sentinel:'preserve-evidence'});
  await t.test('terminal TEST settlement retires polling; LIVE, refund and unresolved cases retain it',async()=>{
   await rules.clearFirestore();
   for(const kind of ['terminal','live','refund','active','review']){
    const mode=kind==='live'?'live':'test',order=captured(kind,mode);
    if(kind==='active'){order.payment.state='AUTHORIZED';order.payment.reservation='active';delete (order.payment as any).capturedAt;}
    if(kind==='review')order.payment.state='MANUAL_REVIEW';
    await db.doc('orders/'+kind).set(order);await db.doc('paymentAttempts/'+kind).set(attempt(kind,mode));
    await settlePayment(db,kind,{state:kind==='active'?'AUTHORIZED':'CAPTURED',...(kind==='refund'?{refunds:[{id:'rfnd_pending',payment_id:'pay_refund',amount:50,currency:'INR',status:'pending',created_at:1}]}:{})});
    const after=(await db.doc('paymentAttempts/'+kind).get()).data()!;assert.equal(Number.isSafeInteger(after.nextCheckAt),kind!=='terminal');assert.equal(after.sentinel,'preserve-evidence');
    assert.deepEqual((await db.doc('orders/'+kind).get()).get('history'),order.history);
   }
   // Retirement never blocks an explicit later refund reconciliation.
   await settlePayment(db,'terminal',{state:'CAPTURED',refunds:[{id:'rfnd_later',payment_id:'pay_terminal',amount:50,currency:'INR',status:'pending',created_at:1}]});
   assert.equal((await db.doc('orders/terminal').get()).get('payment.state'),'REFUND_PENDING');assert.ok((await db.doc('paymentAttempts/terminal').get()).get('nextCheckAt')>Date.now());
  });

  await t.test('maintenance is dry-run by default, count-checked, idempotent and deletes only the scheduling field',async()=>{
   await rules.clearFirestore();
   for(const id of ['one','two','live','active','review']){
    const mode=id==='live'?'live':'test',order=captured(id,mode);
    if(id==='active')order.payment.reservation='active';if(id==='review')order.payment.state='MANUAL_REVIEW';
    await db.doc('orders/'+id).set(order);await db.doc('paymentAttempts/'+id).set(attempt(id,mode));
   }
   await db.doc('paymentEvents/preserved').set({processing:'accepted',evidence:'synthetic'});
   const before=await snapshot('paymentAttempts'),orders=await snapshot('orders'),events=await snapshot('paymentEvents');
   const preview=await retireTestPaymentSchedules(db);assert.equal(preview.candidates,2);assert.equal(preview.retired,0);assert.deepEqual(await snapshot('paymentAttempts'),before);
   await assert.rejects(retireTestPaymentSchedules(db,{apply:true,expectedCount:3}));assert.deepEqual(await snapshot('paymentAttempts'),before);
   const applied=await retireTestPaymentSchedules(db,{apply:true,expectedCount:2});assert.equal(applied.retired,2);assert.equal(applied.changedSincePreview,0);
   const after=await snapshot('paymentAttempts');for(const id of Object.keys(before)){const expected={...before[id]};if(['one','two'].includes(id))delete expected.nextCheckAt;assert.deepEqual(after[id],expected);}
   assert.deepEqual(await snapshot('orders'),orders);assert.deepEqual(await snapshot('paymentEvents'),events);
   assert.equal((await retireTestPaymentSchedules(db,{apply:true,expectedCount:0})).retired,0);
  });

  await t.test('Preview service calls reject before authentication, Firestore or provider access',async()=>{
   const forbidden=new Proxy({},{get(){throw Error('Preview accessed a protected dependency');}}) as any;
   const service=paymentService(forbidden,forbidden,{...env,RAZORPAY_MODE:'live',RAZORPAY_KEY_ID:key('live'),RAZORPAY_LIVE_ACTIVATED:'true',VERCEL_ENV:'preview'},forbidden);
   for(const action of ['create-order','resume','verify','status','reconcile','capabilities'])await assert.rejects(service.customer('fixture',action,{}),{code:'permission'});
   await assert.rejects(service.reconcile('a'.repeat(32)),{code:'permission'});
   await assert.rejects(service.work(),{code:'permission'});await assert.rejects(service.webhook(Buffer.from('{}'),'signature','event'),{code:'permission'});
  });
 }finally{await rules.clearFirestore();await rules.cleanup();}
});
