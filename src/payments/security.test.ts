import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {paymentConfig,initiationAllowed} from '../../server/payments/config.ts';
import {razorpayProvider,signatureMatches} from '../../server/payments/provider.ts';
import {paymentHandler} from '../../server/payments/http.ts';
import {canCelebrate} from '../orders/customerPresentation.tsx';
import {orderCommands} from '../admin/orders/detailModel.ts';
import {publicPayment,orderStatusLabel,awaitsOnlinePayment,type OrderPayment} from './model.ts';
import {orderProgress,OrderProgress} from '../orders/customerPresentation.tsx';
import {historyPayment} from '../orders/historyModel.ts';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AdminPayment} from './AdminPayment.tsx';
import {completedTestCapture,duePayments} from '../../server/payments/queue.ts';
import {readFileSync} from 'node:fs';

test('reserved and failed online checkouts never present a confirmed fulfilment lifecycle',()=>{
 const payment:OrderPayment={mode:'test',state:'FAILED',reservation:'active',amountPaise:100,expiresAt:9999999999999,createdAt:1,updatedAt:2};
 const order={id:'a'.repeat(32),status:'Confirmed',payment,history:[{action:'Confirmed',at:1}]} as any;
 for(const [state,label] of [['CREATED','Awaiting payment'],['PENDING','Awaiting payment'],['FAILED','Payment failed'],['AUTHORIZED','Awaiting capture'],['VERIFICATION_PENDING','Verifying payment'],['MANUAL_REVIEW','Payment needs review']] as const){
  payment.state=state;assert.equal(orderStatusLabel(order),label);assert.equal(awaitsOnlinePayment(payment),true);assert.equal(canCelebrate(order),false);assert.deepEqual(orderProgress(order),[]);
  const html=renderToStaticMarkup(createElement(OrderProgress,{order}));assert.match(html,/after your online payment is captured and verified/);assert.doesNotMatch(html,/Completed|Upcoming|Shipment Details/);
  assert.equal(historyPayment(order).closed,true);
 }
 payment.state='CANCELLED';payment.reservation='released';assert.equal(orderStatusLabel(order),'Payment expired');
 payment.state='CAPTURED';payment.reservation='consumed';payment.capturedAt=3;assert.equal(orderStatusLabel(order),'Confirmed');assert.equal(canCelebrate(order),true);assert.equal(orderProgress(order).length,5);
 assert.equal(orderStatusLabel({...order,payment:undefined,status:'Placed'}),'Placed');assert.equal(orderProgress({...order,payment:undefined}).length,5);
});

test('captured payment presentation distinguishes missing timestamps from earlier failures',()=>{
 const payment:OrderPayment={mode:'test',state:'CAPTURED',reservation:'consumed',amountPaise:100,expiresAt:1,createdAt:1,updatedAt:3,capturedAt:3,failedAt:2};
 const html=renderToStaticMarkup(createElement(AdminPayment,{order:{id:'a'.repeat(32),payment} as any,onRefresh:()=>{}}));
 assert.match(html,/<dt>State<\/dt><dd[^>]*>CAPTURED<\/dd>/);
 assert.match(html,/<dt>Authorization time<\/dt><dd[^>]*>Not recorded<\/dd>/);
 assert.match(html,/<dt>Earlier failed attempt<\/dt>/);
 assert.doesNotMatch(html,/<dt>Authorized<\/dt>/);
});

const fixture={RAZORPAY_MODE:'test',RAZORPAY_KEY_ID:'rzp_test_fixture123456',RAZORPAY_KEY_SECRET:'synthetic-secret-for-tests',RAZORPAY_WEBHOOK_SECRET:'synthetic-webhook-for-tests'};
test('payment configuration fails closed, mode never falls back and production test access is explicit',()=>{
 for(const patch of [{RAZORPAY_MODE:undefined},{RAZORPAY_KEY_ID:'rzp_live_fixture123456'},{RAZORPAY_KEY_SECRET:''},{RAZORPAY_WEBHOOK_SECRET:''},{RAZORPAY_KEY_SECRET:' quoted '}])assert.throws(()=>paymentConfig({...fixture,...patch}),{code:'configuration'});
 const c=paymentConfig(fixture);assert.equal(initiationAllowed(c,'customer',{VERCEL_ENV:'production',RAZORPAY_TEST_ENVIRONMENT:'true'}),false);
 assert.equal(initiationAllowed(c,'customer',{VERCEL_ENV:'production',RAZORPAY_TEST_UIDS:'customer'}),true);assert.equal(initiationAllowed(c,'other',{RAZORPAY_TEST_UIDS:'customer'}),false);
 assert.equal(initiationAllowed(c,'customer',{RAZORPAY_TEST_ENVIRONMENT:'true',NODE_ENV:'development'}),true);
 const live=paymentConfig({...fixture,RAZORPAY_MODE:'live',RAZORPAY_KEY_ID:'rzp_live_fixture123456'});assert.equal(initiationAllowed(live,'customer',{}),false);assert.equal(initiationAllowed(live,'customer',{RAZORPAY_LIVE_ACTIVATED:'true'}),true);
});

test('worker query restricts mode and credential identity before its batch limit and has exact manifest indexes',()=>{
 const indexes=JSON.parse(readFileSync('firestore.indexes.json','utf8')).indexes;
 for(const collection of ['paymentEvents','paymentAttempts'] as const)for(const mode of ['test','live'] as const){
  const calls:unknown[]=[],query={where(...args:unknown[]){calls.push(['where',...args]);return query;},orderBy(...args:unknown[]){calls.push(['orderBy',...args]);return query;},limit(n:number){calls.push(['limit',n]);return query;}};
  const config={...paymentConfig(fixture),mode,keyId:'rzp_'+mode+'_fixture123456'};
  duePayments({collection:(name:string)=>{assert.equal(name,collection);return query;}} as any,collection,config,1234);
  assert.deepEqual(calls,[['where','mode','==',mode],['where','keyId','==',config.keyId],['where','nextCheckAt','<=',1234],['orderBy','nextCheckAt'],['limit',20]]);
  assert.ok(indexes.some((v:any)=>v.collectionGroup===collection&&v.queryScope==='COLLECTION'&&JSON.stringify(v.fields)===JSON.stringify([{fieldPath:'mode',order:'ASCENDING'},{fieldPath:'keyId',order:'ASCENDING'},{fieldPath:'nextCheckAt',order:'ASCENDING'}])));
 }
});

test('only clean consumed TEST captures qualify for retiring periodic schedules',()=>{
 const a={mode:'test',keyId:fixture.RAZORPAY_KEY_ID,orderId:'internal',uid:'fixture',creation:'known',providerOrderId:'order_fixture',refunds:[]};
 const o={id:'internal',uid:'fixture',totalPaise:'100',payment:{mode:'test',state:'CAPTURED',reservation:'consumed',capturedAt:1,amountPaise:100,providerOrderId:'order_fixture',providerPaymentId:'pay_fixture'}};
 assert.equal(completedTestCapture(a,o),true);
 for(const patch of [{mode:'live'},{keyId:'rzp_test_other'},{orderId:'other'},{uid:'other'},{creation:'unknown'},{providerOrderId:'order_other'},{refunds:[{status:'pending'}]}])assert.equal(completedTestCapture({...a,...patch},o),false);
 for(const patch of [{mode:'live'},{state:'MANUAL_REVIEW'},{state:'AUTHORIZED'},{state:'REFUND_PENDING'},{reservation:'active'},{reservation:'released'},{capturedAt:undefined},{amountPaise:101},{reason:'requires-review'},{refundReviewRequired:true},{refundedPaise:1},{refundState:'REFUND_FAILED'}])assert.equal(completedTestCapture(a,{...o,payment:{...o.payment,...patch}}),false);
});

test('Preview rejects payment HTTP actions even with approved origin, LIVE activation and worker authorization',async()=>{
 for(const mode of ['test','live']){
  const env={...fixture,VERCEL_ENV:'preview',VERCEL:'1',NODE_ENV:'production',RAZORPAY_MODE:mode,RAZORPAY_KEY_ID:'rzp_'+mode+'_fixture123456',RAZORPAY_LIVE_ACTIVATED:'true',RAZORPAY_TEST_UIDS:'fixture',PAYMENT_WORKER_SECRET:'synthetic-worker-secret-at-least-32'};
  assert.throws(()=>paymentConfig(env),{code:'permission'});
  assert.equal(initiationAllowed({...paymentConfig(fixture),mode} as any,'fixture',env),false);
  let initializations=0;const server=createServer(paymentHandler(()=>{initializations++;throw Error('Must not initialize');},env)).listen(0,'127.0.0.1');await once(server,'listening');
  try{for(const action of ['capabilities','create-order','resume','verify','status','reconcile','worker','webhook']){
   const get=['status','capabilities'].includes(action),r=await fetch('http://127.0.0.1:'+(server.address() as any).port+'/api/payments/'+action,{method:get?'GET':'POST',headers:{'x-forwarded-proto':'https',Origin:'https://www.parinayasarees.com',Authorization:'Bearer '+(action==='worker'?env.PAYMENT_WORKER_SECRET:'synthetic'),'Content-Type':'application/json'},...(!get?{body:'{}'}:{})});
   assert.equal(r.status,403,action);assert.equal((await r.json()).code,'permission');
  }assert.equal(initializations,0);}finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
 }
});
test('HMAC verifies original bytes, rejects malformed signatures and tampering',()=>{
 const raw=Buffer.from('{ "event": "payment.captured" }\n'),sig=createHmac('sha256',fixture.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex');
 assert.ok(signatureMatches(fixture.RAZORPAY_WEBHOOK_SECRET,raw,sig));
 for(const altered of [JSON.stringify(JSON.parse(raw.toString())),raw.toString()+' '])assert.equal(signatureMatches(fixture.RAZORPAY_WEBHOOK_SECRET,altered,sig),false);
 for(const sig of [undefined,'','f'.repeat(63),'z'.repeat(64),'f'.repeat(64)])assert.equal(signatureMatches(fixture.RAZORPAY_WEBHOOK_SECRET,raw,sig),false);
});
test('provider sends integer server amount and never retries a timed-out create',async()=>{
 let calls=0;const provider=razorpayProvider(paymentConfig(fixture),async(url,options)=>{calls++;assert.equal(url,'https://api.razorpay.com/v1/orders');assert.deepEqual(JSON.parse(String(options!.body)),{amount:159900,currency:'INR',receipt:'a'.repeat(32),partial_payment:false,notes:{internalOrderId:'a'.repeat(32)}});throw Error('Synthetic timeout');});
 for(const amount of [NaN,1,100.5,Number.MAX_SAFE_INTEGER+1])await assert.rejects(provider.create(amount,'a'.repeat(32)),{code:'invalid'});assert.equal(calls,0);await assert.rejects(provider.create(159900,'a'.repeat(32)),{code:'unavailable'});assert.equal(calls,1);
});
test('HTTP exported handler rejects unauthenticated, cross-origin, oversized, pre-parsed webhook and unsupported inputs',async()=>{
 let received:Buffer|undefined;const service={customer:async()=>({online:false}),work:async()=>({}),webhook:async(raw:Buffer)=>{received=raw;return {accepted:true};}};
 const handler=paymentHandler(async()=>service as any,{NODE_ENV:'production'}),server=createServer(handler).listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+(server.address() as any).port+'/api/payments/';
 try{
  let r=await fetch(base+'create-order',{method:'POST',headers:{'x-forwarded-proto':'https','Content-Type':'application/json'},body:'{}'});assert.equal(r.status,401);
  r=await fetch(base+'create-order',{method:'POST',headers:{'x-forwarded-proto':'https',Authorization:'Bearer synthetic',Origin:'https://evil.test','Content-Type':'application/json'},body:'{}'});assert.equal(r.status,403);
  r=await fetch(base+'create-order');assert.equal(r.status,405);
  r=await fetch(base+'status?amount=1',{headers:{'x-forwarded-proto':'https',Authorization:'Bearer synthetic'}});assert.equal(r.status,400);
  r=await fetch(base+'worker',{method:'POST',headers:{'x-forwarded-proto':'https','Content-Type':'application/json'},body:'{}'});assert.equal(r.status,403);
  r=await fetch(base+'webhook',{method:'POST',headers:{'x-forwarded-proto':'https','Content-Type':'application/json'},body:'x'.repeat(65537)});assert.equal(r.status,400);
  const raw='{ "original": true }\n';r=await fetch(base+'webhook?action=webhook',{method:'POST',headers:{'x-forwarded-proto':'https','Content-Type':'application/json'},body:raw});assert.equal(r.status,202);assert.equal(received!.toString(),raw);
  r=await fetch(base+'webhook?action=verify',{method:'POST',headers:{'x-forwarded-proto':'https','Content-Type':'application/json'},body:raw});assert.equal(r.status,400);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});
test('pending or held online orders cannot celebrate or expose payment mutation controls',()=>{
 const p:OrderPayment={mode:'test',state:'PENDING',reservation:'active',amountPaise:100,expiresAt:1,createdAt:1,updatedAt:1,providerOrderId:'order_private',providerPaymentId:'pay_private',reason:'private-diagnostic'};
 const order={id:'a'.repeat(32),status:'Placed',payment:p} as any;
 assert.equal(canCelebrate(order),false);assert.deepEqual(orderCommands(order),['note']);
 p.state='CAPTURED';p.reservation='consumed';assert.equal(canCelebrate(order),true);assert.deepEqual(orderCommands(order),['Confirmed','note']);
 p.state='MANUAL_REVIEW';assert.equal(canCelebrate(order),false);assert.equal('providerPaymentId' in publicPayment(p),false);assert.equal('reason' in publicPayment(p),false);
});


test('webhook acceptance budget includes cold service initialization and never sends a false success',async()=>{
 const handler=paymentHandler(()=>new Promise<never>(()=>{}),{NODE_ENV:'development'}),server=createServer(handler).listen(0,'127.0.0.1');await once(server,'listening');
 try{const start=Date.now(),r=await fetch('http://127.0.0.1:'+(server.address() as any).port+'/api/payments/webhook',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(6000)});assert.equal(r.status,503);assert.equal((await r.json()).code,'unavailable');assert.ok(Date.now()-start<5500);}finally{server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));}
});
