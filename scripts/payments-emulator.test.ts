import {createServer} from 'node:http';import {once} from 'node:events';import {paymentHandler} from '../server/payments/http.ts';
import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';import {randomUUID,createHmac} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,setLogLevel} from 'firebase/firestore';
import type {DecodedIdToken} from 'firebase-admin/auth';
import {serverFirebase} from '../server/firebase.ts';import {catalogService} from '../server/catalog.ts';
import {paymentService} from '../server/payments/service.ts';import type {PaymentProvider,ProviderOrder,ProviderPayment,ProviderRefund} from '../server/payments/provider.ts';
import {emptyProduct} from '../src/products/model.ts';import {blankAddress} from '../src/delivery/model.ts';import {initialShipping} from '../src/shipping/model.ts';

if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('Loopback emulators required');
process.env.PARINAYA_SERVER_EMULATORS='true';process.env.METADATA_SERVER_DETECTION='none';setLogLevel('silent');
test('online payments: authoritative existing checkout, reservations, capture, recovery, replay, refunds and isolation',async t=>{
 const rules=await initializeTestEnvironment({projectId:'parinaya-silks',firestore:{host:'127.0.0.1',port:8080,rules:await readFile('firestore.rules','utf8')}}),db=serverFirebase().database;
 const env={RAZORPAY_MODE:'test',RAZORPAY_KEY_ID:'rzp_test_fixture123456',RAZORPAY_KEY_SECRET:'synthetic-secret-for-tests',RAZORPAY_WEBHOOK_SECRET:'synthetic-webhook-for-tests',RAZORPAY_TEST_ENVIRONMENT:'true',NODE_ENV:'development'};
 const catalog=catalogService({database:db,routeCalculator:async(_origin,address)=>({distanceMeters:5000,destination:address.coordinates||{latitude:17.5,longitude:78.5}}),auth:{verifyIdToken:async token=>{if(token==='guest')throw Object.assign(Error(),{code:'auth/invalid-id-token'});return {uid:token,email:token+'@example.test',aud:'parinaya-silks',admin:['owner','claim'].includes(token)} as unknown as DecodedIdToken;}},media:{} as any});
 const orders=new Map<string,ProviderOrder>(),payments=new Map<string,ProviderPayment>(),refunds=new Map<string,ProviderRefund[]>();let creates=0,timeout=false,down=false,creationAbsent=false;
 const provider:PaymentProvider={
  async create(amount,receipt){creates++;if(down)throw Error('Provider unavailable');const id='order_Fixture'+creates,order={id,receipt,amount,currency:'INR',status:'created',amount_paid:0,notes:{internalOrderId:receipt}};if(!creationAbsent)orders.set(id,order);if(timeout)throw Error('Lost create response');return order;},
  async find(receipt){return [...orders.values()].filter(o=>o.receipt===receipt);},
  async order(id){if(down)throw Error('Provider unavailable');return structuredClone(orders.get(id)!);},
  async payments(id){if(down)throw Error('Provider unavailable');return structuredClone([...payments.values()].filter(p=>p.order_id===id));},
  async payment(id){return structuredClone(payments.get(id)!);},async refunds(id){return structuredClone(refunds.get(id)||[]);},
 };
 const service=()=>paymentService(db,catalog.paymentContext,env,provider);let svc=service();
 const op=()=>randomUUID().replaceAll('-',''),pid='q'.repeat(20),cid='c'.repeat(20),aid='a'.repeat(32);
 async function seed(uid:string,quantity=20,variant=false){
  await db.doc('categories/'+cid).set({enabled:true,name:'Silk'});await db.doc('products/'+pid).set({...emptyProduct(),name:'Synthetic saree',description:'Local only',slug:'payment-fixture',sku:'PAYMENT',categoryId:cid,status:'Published',schemaVersion:1,revision:1,pricePaise:100000,inventory:variant?{mode:'variants',variants:[{id:'v'.repeat(16),name:'Red',hex:'#ff0000',sku:'PAY-RED',quantity}]}:{mode:'simple',quantity},coverMediaId:'f'.repeat(32),images:[{mediaId:'f'.repeat(32),alt:'Fixture',url:'https://res.cloudinary.com/parinaya-emulator/image/upload/v1/fixture.jpg',width:300,height:400}],createdAt:new Date(),updatedAt:new Date()});
  await db.doc('siteSettings/shipping').set({...initialShipping(),schemaVersion:1,revision:1});
  await db.doc('siteSettings/dispatchLocation').set({name:'Local fixture',fullAddress:'Synthetic origin',latitude:17.4,longitude:78.4,mapsUrl:'',active:true,schemaVersion:1,revision:1});
  await db.doc(`customerShopping/${uid}/addresses/${aid}`).set({...blankAddress(),recipientName:'Synthetic Customer',mobileNumber:'+919876543210',pinCode:'500034',line1:'Example',locality:'Example',city:'Hyderabad',state:'Telangana',revision:1,createdAt:new Date(),updatedAt:new Date()});
  const variantId=variant?'v'.repeat(16):null;await db.doc(`customerShopping/${uid}/bag/${pid}--${variantId||'simple'}`).set({productId:pid,variantId,quantity:1,createdAt:new Date(),updatedAt:new Date()});
 }
 async function input(uid:string,couponCode:string|null=null,points=0){const r=await catalog.privileged(uid,{action:'orders:review',addressId:aid,couponCode,points}) as any;return {addressId:aid,couponCode,points,fingerprint:r.fingerprint,deliveryQuoteId:r.shipping.quoteId,operationId:op()};}
 const http=createServer(paymentHandler(()=>svc,{NODE_ENV:'development'})).listen(0,'127.0.0.1');await once(http,'listening');const base='http://127.0.0.1:'+(http.address() as {port:number}).port+'/api/payments/';
 async function call(uid:string,action:string,body:Record<string,unknown>={}){const get=['status','capabilities'].includes(action);const r=await fetch(base+action+(get?'?'+new URLSearchParams(Object.entries(body).map(([k,v])=>[k,String(v)])):''),{method:get?'GET':'POST',headers:{Authorization:'Bearer '+uid,...(!get?{'Content-Type':'application/json'}:{})},...(!get?{body:JSON.stringify(body)}:{})});const result=await r.json();if(!r.ok)throw Object.assign(Error('Fixture HTTP rejection'),{code:result.code,status:r.status});return result as any;}
 async function capture(id:string,status='captured'){const a=(await db.doc('paymentAttempts/'+id).get()).data()!,o=orders.get(a.providerOrderId)!,payment={id:'pay_'+id,order_id:o.id,amount:o.amount,currency:'INR',status,captured:status==='captured',method:'upi',created_at:Math.floor(Date.now()/1000),amount_refunded:0};payments.set(payment.id,payment);if(status==='captured'){o.status='paid';o.amount_paid=o.amount;}return payment;}
 const stored=async(id:string)=>(await db.doc('orders/'+id).get()).data()!;
 const event=async(id:string,n:string,type='payment.captured')=>{const a=(await db.doc('paymentAttempts/'+id).get()).data()!,p=[...payments.values()].find(p=>p.order_id===a.providerOrderId);const raw=Buffer.from(JSON.stringify({event:type,payload:{payment:{entity:p}}}));return svc.webhook(raw,createHmac('sha256',env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex'),n);};
 try{
 await rules.clearFirestore();await db.doc('adminAccess/owner').set({enabled:true});await db.doc('adminAccess/record').set({enabled:true});
 await t.test('creation is atomic, duplicate clicks/restarts reuse one provider order, and claims/ownership are enforced',async()=>{
  await seed('pay-a');const body=await input('pay-a'),before=creates;
  const race=await Promise.all([call('pay-a','create-order',body),call('pay-a','create-order',body)]),id=race[0].id;
  assert.equal(race[1].id,id);assert.equal(creates,before+1);assert.equal((await db.doc('products/'+pid).get()).get('inventory.quantity'),19);
  assert.equal((await stored(id)).status,'Placed');assert.equal((await stored(id)).paymentStatus,'pending');assert.equal((await db.collection('customerShopping/pay-a/bag').get()).size,1,'Bag retained until capture');
  svc=service();assert.equal((await call('pay-a','create-order',body)).id,id);assert.equal(creates,before+1);
  await assert.rejects(call('guest','status',{id}),{code:'unauthorized'});await assert.rejects(call('other','status',{id}),{code:'not-found'});
  for(const role of ['pay-a','claim','record'])await assert.rejects(call(role,'reconcile',{id}),{code:'permission'});
  await assert.rejects(call('pay-a','create-order',{...body,amount:1}),{code:'invalid'});
  await assert.rejects(call('pay-a','create-order',{...body,operationId:op()}),{code:'conflict'});
  await assert.rejects(catalog.privileged('pay-a',{action:'orders:place',...body,operationId:op()}),{code:'conflict'});
  await assert.rejects(catalog.privileged('owner',{action:'adminOrders:update',id,expectedRevision:1,operationId:op(),command:'Confirmed'}),{code:'conflict'});
  const p=await capture(id,'authorized');await svc.reconcile(id);assert.equal((await stored(id)).payment.state,'AUTHORIZED');assert.equal((await stored(id)).status,'Placed');
  const signature=createHmac('sha256',env.RAZORPAY_KEY_SECRET).update(p.order_id+'|'+p.id).digest('hex');
  await assert.rejects(call('pay-a','verify',{id,razorpay_order_id:p.order_id,razorpay_payment_id:p.id,razorpay_signature:'f'.repeat(64)}),{code:'permission'});
  await call('pay-a','verify',{id,razorpay_order_id:p.order_id,razorpay_payment_id:p.id,razorpay_signature:signature});assert.equal((await stored(id)).status,'Placed','A valid signature alone cannot fulfill');
  await capture(id);await Promise.all([call('pay-a','verify',{id,razorpay_order_id:p.order_id,razorpay_payment_id:p.id,razorpay_signature:signature}),call('pay-a','verify',{id,razorpay_order_id:p.order_id,razorpay_payment_id:p.id,razorpay_signature:signature})]);
  assert.equal((await stored(id)).payment.state,'CAPTURED');assert.equal((await stored(id)).status,'Confirmed');assert.equal((await stored(id)).history.filter((h:any)=>h.action==='Confirmed').length,1);assert.equal((await db.collection('customerShopping/pay-a/bag').get()).size,0);
  await Promise.all([event(id,'event_duplicate'),event(id,'event_duplicate')]);assert.equal((await db.collection('paymentEvents').get()).size,1);await svc.work();
  await event(id,'event_old','payment.failed');await svc.work();assert.equal((await stored(id)).payment.state,'CAPTURED');
  assert.equal((await db.doc('products/'+pid).get()).get('inventory.quantity'),19);assert.equal((await db.doc('adminNotifications/'+id+'_captured').get()).exists,true);
  const customer=await catalog.privileged('pay-a',{action:'orders:get',id}) as any;assert.equal(customer.payment.providerPaymentId,undefined);assert.equal(customer.payment.reason,undefined);
  assert.equal((await call('pay-a','status',{operationId:body.operationId})).id,id,'Original attempt recovers on another session');
  await call('owner','reconcile',{id});assert.equal((await db.collection('paymentReconciliation').get()).size,1);
  await assert.rejects(catalog.privileged('owner',{action:'adminOrders:update',id,expectedRevision:(await stored(id)).revision,operationId:op(),command:'collect'}),{code:'permission'});
 });
 await t.test('unknown provider order creation is reconciled without a second POST',async()=>{
  await seed('pay-timeout');timeout=true;const before=creates,body=await input('pay-timeout'),r=await call('pay-timeout','create-order',body);timeout=false;assert.equal(r.checkout,undefined);
  svc=service();await svc.reconcile(r.id);assert.ok((await stored(r.id)).payment.providerOrderId);await call('pay-timeout','create-order',body);assert.equal(creates,before+1);
  await capture(r.id);await call('pay-timeout','status',{id:r.id});assert.equal((await stored(r.id)).status,'Confirmed');
  await seed('pay-unknown');timeout=true;creationAbsent=true;const unknown=await call('pay-unknown','create-order',await input('pay-unknown'));timeout=false;creationAbsent=false;await db.doc('orders/'+unknown.id).update({'payment.expiresAt':Date.now()-1});await svc.reconcile(unknown.id);assert.equal((await stored(unknown.id)).payment.state,'MANUAL_REVIEW');assert.equal((await stored(unknown.id)).payment.reservation,'active');
 });
 await t.test('expired reservations release once; late capture is held and never invented as a refund',async()=>{
  await seed('pay-expire');const r=await call('pay-expire','create-order',await input('pay-expire'));await db.doc('orders/'+r.id).update({'payment.expiresAt':Date.now()-1});await Promise.all([svc.reconcile(r.id),svc.reconcile(r.id)]);
  assert.equal((await stored(r.id)).payment.reservation,'released');assert.equal((await stored(r.id)).payment.state,'CANCELLED');assert.equal((await db.doc('products/'+pid).get()).get('inventory.quantity'),20);
  await capture(r.id);await svc.reconcile(r.id);const late=await stored(r.id);assert.equal(late.payment.state,'MANUAL_REVIEW');assert.equal(late.status,'Cancelled');assert.equal(late.refundPaise,0);assert.equal((await db.doc('products/'+pid).get()).get('inventory.quantity'),20);
 });
 await t.test('two customers cannot buy the last variant; price and shipping changes require review',async()=>{
  await seed('pay-last-a',1,true);await seed('pay-last-b',1,true);const a=await input('pay-last-a'),b=await input('pay-last-b');const results=await Promise.allSettled([call('pay-last-a','create-order',a),call('pay-last-b','create-order',b)]);assert.equal(results.filter(r=>r.status==='fulfilled'&&r.value.id).length,1);assert.equal((await db.doc('products/'+pid).get()).get('inventory.variants')[0].quantity,0);
  await seed('pay-stale');const stale=await input('pay-stale');await db.doc('siteSettings/shipping').update({revision:2,flatFeePaise:25000});const result=await call('pay-stale','create-order',stale);assert.equal(result.changed,true);assert.equal((await db.doc('products/'+pid).get()).get('inventory.quantity'),20);
 });
 await t.test('coupon and loyalty reservations, delivery earning and provider refunds remain idempotent',async()=>{
  await seed('pay-loyal');await db.doc('siteSettings/loyalty').set({schemaVersion:1,revision:1,config:{enabled:true,earnSpendPaise:10000,earnPoints:10,pointValuePaise:100,minRedeemPoints:10,maxPercent:20,allowCoupons:true}});await db.doc('loyaltyAccounts/pay-loyal').set({schemaVersion:1,revision:1,net:100,reserved:0,pending:0});
  await catalog.privileged('owner',{action:'coupons:save',coupon:{code:'PAY10',kind:'percent',value:10,enabled:true,minimumPaise:0,capPaise:5000,globalLimit:10,perCustomerLimit:1,startsAt:null,endsAt:null},expectedRevision:0,operationId:op()});
  const body=await input('pay-loyal','PAY10',10),r=await call('pay-loyal','create-order',body);await call('pay-loyal','create-order',body);assert.equal((await db.doc('coupons/PAY10').get()).get('uses'),1);assert.equal((await db.doc('loyaltyAccounts/pay-loyal').get()).get('reserved'),10);
  const p=await capture(r.id);await svc.reconcile(r.id);
  for(const command of ['Processing','Shipped','Delivered']){const old=await stored(r.id);await catalog.privileged('owner',{action:'adminOrders:update',id:r.id,expectedRevision:old.revision,operationId:op(),command,...(command==='Shipped'?{courier:'Fixture courier',trackingNumber:'FIXTURE-123'}:{})});}
  assert.equal((await db.doc('loyaltyAccounts/pay-loyal').get()).get('reserved'),0);assert.equal((await db.collection('loyaltyAccounts/pay-loyal/ledger').where('kind','==','Earned').get()).size,1);await svc.reconcile(r.id);assert.equal((await db.collection('loyaltyAccounts/pay-loyal/ledger').where('kind','==','Earned').get()).size,1);
  refunds.set(p.id,[{id:'rfnd_Fixture1',payment_id:p.id,amount:1000,currency:'INR',status:'pending',created_at:1}]);await svc.reconcile(r.id);assert.equal((await stored(r.id)).payment.state,'REFUND_PENDING');assert.equal((await stored(r.id)).payment.refundedPaise,0);
  refunds.get(p.id)![0].status='processed';payments.get(p.id)!.amount_refunded=1000;await Promise.all([svc.reconcile(r.id),svc.reconcile(r.id)]);assert.equal((await stored(r.id)).payment.state,'PARTIALLY_REFUNDED');assert.equal((await stored(r.id)).refundPaise,1000);assert.equal((await db.doc('loyaltyAccounts/pay-loyal').get()).get('paymentReviewRequired'),true);
  await assert.rejects(input('pay-loyal',null,10),{code:'conflict'},'Provider refund review must prevent spending unallocated points');
  refunds.get(p.id)![0].status='failed';payments.get(p.id)!.amount_refunded=0;await svc.reconcile(r.id);assert.equal((await stored(r.id)).payment.state,'PARTIALLY_REFUNDED','Old processed refund cannot be downgraded');
 });
 await t.test('mismatched captures fail closed; payment unavailable preserves durable state; direct Firestore writes are denied',async()=>{
  await seed('pay-mismatch');const r=await call('pay-mismatch','create-order',await input('pay-mismatch')),p=await capture(r.id);payments.get(p.id)!.currency='USD';await svc.reconcile(r.id);assert.equal((await stored(r.id)).payment.state,'MANUAL_REVIEW');assert.equal((await stored(r.id)).status,'Placed');
  down=true;const status=await call('pay-mismatch','status',{id:r.id});assert.equal(status.reconciled,false);assert.equal(status.payment.state,'MANUAL_REVIEW');down=false;
  for(const uid of ['pay-mismatch','owner']){const client=rules.authenticatedContext(uid,{admin:uid==='owner'}).firestore();for(const collection of ['paymentAttempts','paymentEvents','paymentCheckoutLocks','paymentProviderOrders','paymentReconciliation','paymentRateLimits']){await assertFails(setDoc(doc(client,collection,'synthetic'),{state:'CAPTURED'}));await assertFails(getDoc(doc(client,collection,'synthetic')));}await assertFails(setDoc(doc(client,'orders',r.id),{paymentStatus:'paid'}));}
  await assert.rejects(svc.webhook(Buffer.from('{}'),'f'.repeat(64),'bad-event'),{code:'permission'});
 });
 await t.test('failed payments retain reservations until trusted expiry; authorized expiry remains held',async()=>{
  await seed('pay-decline');const r=await call('pay-decline','create-order',await input('pay-decline'));await capture(r.id,'failed');await svc.reconcile(r.id);assert.equal((await stored(r.id)).payment.state,'FAILED');assert.equal((await stored(r.id)).payment.reservation,'active');
  const failed=await stored(r.id);assert.equal(failed.status,'Placed');assert.equal(failed.paymentStatus,'pending');assert.equal(failed.collectedPaise,0);assert.equal(failed.history.some((h:any)=>h.action==='Confirmed'),false);
  const detail=await catalog.privileged('pay-decline',{action:'orders:get',id:r.id}) as any;assert.equal(detail.payment.state,'FAILED');assert.equal(detail.payment.capturedAt,undefined);
  const page=await catalog.privileged('pay-decline',{action:'orders:list',view:'cards'}) as any;assert.equal(page.items[0].payment.state,'FAILED');assert.equal(page.items[0].paymentStatus,'pending');
  await assert.rejects(catalog.privileged('owner',{action:'adminOrders:update',id:r.id,expectedRevision:failed.revision,operationId:op(),command:'Confirmed'}),{code:'conflict'});
  const before=creates,resume=await call('pay-decline','resume',{id:r.id});assert.equal(resume.checkout.order_id,(await stored(r.id)).payment.providerOrderId);assert.equal(creates,before);assert.equal((await db.doc('products/'+pid).get()).get('inventory.quantity'),19);
  await capture(r.id,'authorized');await db.doc('orders/'+r.id).update({'payment.expiresAt':Date.now()-1});await svc.reconcile(r.id);assert.equal((await stored(r.id)).payment.state,'AUTHORIZED');assert.equal((await stored(r.id)).payment.reservation,'active');
  payments.clear();await svc.reconcile(r.id);assert.equal((await stored(r.id)).payment.state,'MANUAL_REVIEW');assert.equal((await stored(r.id)).payment.reservation,'active');
 });
 await t.test('failed expiry releases stock, coupon and nonzero points once without breaking safe retry',async()=>{
  await seed('pay-failed-expiry');await db.doc('loyaltyAccounts/pay-failed-expiry').set({schemaVersion:1,revision:1,net:100,reserved:0,pending:0});
  const couponBefore=(await db.doc('coupons/PAY10').get()).get('uses'),r=await call('pay-failed-expiry','create-order',await input('pay-failed-expiry','PAY10',10)),before=creates;
  await capture(r.id,'failed');await svc.reconcile(r.id);assert.equal((await stored(r.id)).status,'Placed');assert.equal((await db.doc('loyaltyAccounts/pay-failed-expiry').get()).get('net'),90);assert.equal((await db.doc('loyaltyAccounts/pay-failed-expiry').get()).get('reserved'),10);assert.equal((await db.collection('loyaltyAccounts/pay-failed-expiry/ledger').where('kind','==','Earned').get()).size,0);assert.equal((await db.doc('products/'+pid).get()).get('inventory.quantity'),19);
  await call('pay-failed-expiry','resume',{id:r.id});assert.equal(creates,before);assert.equal((await db.doc('products/'+pid).get()).get('inventory.quantity'),19);
  await db.doc('orders/'+r.id).update({'payment.expiresAt':Date.now()-1});await db.doc('paymentAttempts/'+r.id).update({nextCheckAt:Date.now()-1});await svc.work();await svc.reconcile(r.id);
  const order=await stored(r.id),balance=(await db.doc('loyaltyAccounts/pay-failed-expiry').get()).data()!;
  assert.equal(order.status,'Cancelled');assert.equal(order.paymentStatus,'failed');assert.equal(order.payment.reservation,'released');assert.equal(order.stockRestored,true);assert.equal(order.collectedPaise,0);
  assert.equal((await db.doc('products/'+pid).get()).get('inventory.quantity'),20);assert.equal((await db.doc('coupons/PAY10').get()).get('uses'),couponBefore);assert.equal(balance.net,100);assert.equal(balance.reserved,0);assert.equal(balance.pending,0);
  const ledger=(await db.collection('loyaltyAccounts/pay-failed-expiry/ledger').get()).docs.map(doc=>doc.data());assert.equal(ledger.filter(e=>e.kind==='Released').length,1);assert.equal(100+ledger.reduce((sum,e)=>sum+e.points,0),balance.net);assert.equal(ledger.reduce((sum,e)=>sum+e.reservedDelta,0),balance.reserved);assert.equal(ledger.reduce((sum,e)=>sum+e.pendingDelta,0),balance.pending);
  assert.equal((await db.collection('inventoryAudit').where('orderId','==',r.id).get()).size,2);assert.equal(order.history.filter((h:any)=>h.action==='Cancelled').length,1);
  assert.equal((await call('pay-failed-expiry','resume',{id:r.id})).checkout,undefined);assert.equal(creates,before);
 });
 await t.test('captured payment survives an internal commit failure and a restarted service confirms once',async()=>{
  await seed('pay-commit');const r=await call('pay-commit','create-order',await input('pay-commit'));await capture(r.id);
  const failing=new Proxy(db,{get(target,key){if(key==='runTransaction')return ()=>Promise.reject(Error('Synthetic commit failure'));const v=Reflect.get(target,key);return typeof v==='function'?v.bind(target):v;}});
  await assert.rejects(paymentService(failing,catalog.paymentContext,env,provider).reconcile(r.id));assert.equal((await stored(r.id)).status,'Placed');assert.equal((await stored(r.id)).payment.reservation,'active');assert.equal((await db.doc('products/'+pid).get()).get('inventory.quantity'),19);
  svc=service();await Promise.all([svc.reconcile(r.id),svc.reconcile(r.id)]);assert.equal((await stored(r.id)).status,'Confirmed');assert.equal((await stored(r.id)).history.filter((v:any)=>v.action==='Confirmed').length,1);
 });
 await t.test('all seven signed webhook events process and duplicate delivery cannot repeat settlement',async()=>{
  await seed('pay-events');const r=await call('pay-events','create-order',await input('pay-events')),p=await capture(r.id);
  const types=['payment.authorized','payment.captured','payment.failed','order.paid','refund.created','refund.processed','refund.failed'];
  for(const type of types){
   const payload=type.startsWith('refund.')?{refund:{entity:{id:'rfnd_Event',payment_id:p.id}}}:type==='order.paid'?{order:{entity:{id:p.order_id}}}:{payment:{entity:p}};
   const raw=Buffer.from(JSON.stringify({event:type,payload})),signature=createHmac('sha256',env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex');
   await Promise.all([svc.webhook(raw,signature,'all-seven-'+type.replaceAll('.','-')),svc.webhook(raw,signature,'all-seven-'+type.replaceAll('.','-'))]);
  }
  await svc.work();
  for(const type of types){const events=await db.collection('paymentEvents').where('eventId','==','all-seven-'+type.replaceAll('.','-')).get();assert.equal(events.size,1);assert.equal(events.docs[0].get('processing'),'processed');}
  const order=await stored(r.id);assert.equal(order.payment.state,'CAPTURED');assert.equal(order.payment.reservation,'consumed');
  assert.equal(order.history.filter((entry:any)=>entry.action==='Confirmed').length,1);assert.equal((await db.doc('products/'+pid).get()).get('inventory.quantity'),19);
  assert.equal(order.refundPaise,0,'A refund webhook cannot invent a refund absent from the provider');
 });
 await t.test('full refunds, malformed webhook payloads and signed event-ID conflicts are handled',async()=>{
  await seed('pay-refund-full');const r=await call('pay-refund-full','create-order',await input('pay-refund-full'));const p=await capture(r.id);await svc.reconcile(r.id);
  refunds.set(p.id,[{id:'rfnd_Full',payment_id:p.id,amount:p.amount,currency:'INR',status:'processed',created_at:1}]);payments.get(p.id)!.status='refunded';payments.get(p.id)!.amount_refunded=p.amount;await svc.reconcile(r.id);assert.equal((await stored(r.id)).payment.state,'REFUNDED');assert.equal((await stored(r.id)).paymentStatus,'refunded');
  const sign=(raw:Buffer)=>createHmac('sha256',env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex');const malformed=Buffer.from('not JSON');await assert.rejects(svc.webhook(malformed,sign(malformed),'malformed'),{code:'invalid'});
  const raw=Buffer.from(JSON.stringify({event:'refund.processed',payload:{refund:{entity:{id:'rfnd_Full',payment_id:p.id}}}}));await svc.webhook(raw,sign(raw),'refund-full-event');await svc.work();
  const changed=Buffer.from(raw.toString()+' ');await assert.rejects(svc.webhook(changed,sign(changed),'refund-full-event'),{code:'conflict'});
 });
 await t.test('missing config, stale coupon and changed stock never initiate a provider order; rate limits are shared',async()=>{
  await seed('pay-invalid');const body=await input('pay-invalid'),before=creates;await assert.rejects(paymentService(db,catalog.paymentContext,{},provider).customer('pay-invalid','create-order',body),{code:'configuration'});assert.equal(creates,before);
  await db.doc('products/'+pid).update({'inventory.quantity':0,revision:2});assert.equal((await call('pay-invalid','create-order',body)).changed,true);assert.equal(creates,before);
  await seed('pay-coupon-expired');await catalog.privileged('owner',{action:'coupons:save',coupon:{code:'EXPIRES',kind:'fixed',value:100,enabled:true,minimumPaise:0,capPaise:null,globalLimit:null,perCustomerLimit:null,startsAt:null,endsAt:Date.now()+60000},expectedRevision:0,operationId:op()});const couponBody=await input('pay-coupon-expired','EXPIRES');await db.doc('coupons/EXPIRES').update({endsAt:Date.now()-1});await assert.rejects(call('pay-coupon-expired','create-order',couponBody),{code:'conflict'});assert.equal(creates,before);
  for(let i=0;i<30;i++)await call('pay-rate','capabilities');await assert.rejects(call('pay-rate','capabilities'),{code:'rate-limited'});
 });
 await t.test('mode changes and expired unstarted attempts cannot create a new provider order',async()=>{
  await seed('pay-unstarted');const body=await input('pay-unstarted');const result=await catalog.paymentContext.orders.reserve('pay-unstarted','pay-unstarted@example.test',{...body,action:'orders:place'}, {mode:'test',keyId:env.RAZORPAY_KEY_ID,keySecret:env.RAZORPAY_KEY_SECRET,webhookSecret:env.RAZORPAY_WEBHOOK_SECRET} as any);const id=result.order!.id,before=creates;
  const rotated=paymentService(db,catalog.paymentContext,{...env,RAZORPAY_KEY_ID:'rzp_test_rotated123'},provider);await assert.rejects(rotated.customer('pay-unstarted','create-order',body),{code:'configuration'});assert.equal(creates,before);
  await db.doc('orders/'+id).update({'payment.expiresAt':Date.now()-1});await call('pay-unstarted','create-order',body);assert.equal(creates,before);await svc.reconcile(id);await svc.reconcile(id);assert.equal((await stored(id)).payment.state,'CANCELLED');assert.equal((await stored(id)).paymentStatus,'failed');assert.equal((await db.doc('products/'+pid).get()).get('inventory.quantity'),20);
 });
 await t.test('amount and provider order mismatches cannot confirm a purchase',async()=>{
  for(const type of ['amount','order']){const uid='pay-wrong-'+type;await seed(uid);const r=await call(uid,'create-order',await input(uid)),p=await capture(r.id);if(type==='amount')payments.get(p.id)!.amount++;else orders.get(p.order_id)!.receipt='another-internal-order';await svc.reconcile(r.id);assert.equal((await stored(r.id)).payment.state,'MANUAL_REVIEW');assert.equal((await stored(r.id)).status,'Placed');}
 });
 await t.test('Production requires a healthy worker as well as an approved TEST UID',async()=>{
  const hosted=paymentService(db,catalog.paymentContext,{...env,VERCEL_ENV:'production',RAZORPAY_TEST_UIDS:'pay-hosted',PAYMENT_WORKER_SECRET:'synthetic-worker-secret-at-least-32'},provider);
  await db.doc('paymentOperations/worker').delete();assert.equal((await hosted.customer('pay-hosted','capabilities',{}) as any).online,false);await hosted.work();assert.equal((await hosted.customer('pay-hosted','capabilities',{}) as any).online,true);assert.equal((await hosted.customer('other-hosted','capabilities',{}) as any).online,false);
 });
 await t.test('compiled Vercel Web entrypoint preserves original webhook bytes and durable acceptance',()=>{
  const run=spawnSync(process.execPath,['scripts/payments-runtime.test.mjs'],{env:{...process.env,PAYMENT_RUNTIME_EMULATOR:'1'},encoding:'utf8',timeout:120000});assert.equal(run.status,0,run.stderr||run.error?.message||'Packaged payment runtime failed');assert.match(run.stdout,/original-byte HMAC accepted/);console.log('Packaged original-byte webhook acceptance and tamper rejection passed.');
 });
 }finally{http.closeAllConnections();await new Promise<void>(resolve=>http.close(()=>resolve()));await rules.clearFirestore();await rules.cleanup();}
});
