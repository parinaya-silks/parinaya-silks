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
import {publicPayment,type OrderPayment} from './model.ts';

const fixture={RAZORPAY_MODE:'test',RAZORPAY_KEY_ID:'rzp_test_fixture123456',RAZORPAY_KEY_SECRET:'synthetic-secret-for-tests',RAZORPAY_WEBHOOK_SECRET:'synthetic-webhook-for-tests'};
test('payment configuration fails closed, mode never falls back and production test access is explicit',()=>{
 for(const patch of [{RAZORPAY_MODE:undefined},{RAZORPAY_KEY_ID:'rzp_live_fixture123456'},{RAZORPAY_KEY_SECRET:''},{RAZORPAY_WEBHOOK_SECRET:''},{RAZORPAY_KEY_SECRET:' quoted '}])assert.throws(()=>paymentConfig({...fixture,...patch}),{code:'configuration'});
 const c=paymentConfig(fixture);assert.equal(initiationAllowed(c,'customer',{VERCEL_ENV:'production',RAZORPAY_TEST_ENVIRONMENT:'true'}),false);
 assert.equal(initiationAllowed(c,'customer',{VERCEL_ENV:'production',RAZORPAY_TEST_UIDS:'customer'}),true);assert.equal(initiationAllowed(c,'other',{RAZORPAY_TEST_UIDS:'customer'}),false);
 assert.equal(initiationAllowed(c,'customer',{RAZORPAY_TEST_ENVIRONMENT:'true',NODE_ENV:'development'}),true);
 const live=paymentConfig({...fixture,RAZORPAY_MODE:'live',RAZORPAY_KEY_ID:'rzp_live_fixture123456'});assert.equal(initiationAllowed(live,'customer',{}),false);assert.equal(initiationAllowed(live,'customer',{RAZORPAY_LIVE_ACTIVATED:'true'}),true);
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
