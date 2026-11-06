import {createHash} from 'node:crypto';
import type {Firestore} from 'firebase-admin/firestore';
import {FieldValue} from 'firebase-admin/firestore';
import type {catalogService} from '../catalog.ts';
import {ProductError} from '../../src/products/model.ts';
import {exact,referenceId,type OrderRecord} from '../../src/orders/model.ts';
import {publicPayment} from '../../src/payments/model.ts';
import {paymentConfig,initiationAllowed} from './config.ts';
import {razorpayProvider,signatureMatches,type PaymentProvider,type ProviderOrder,type ProviderPayment} from './provider.ts';
import {settlePayment} from './settlement.ts';

type Context=ReturnType<typeof catalogService>['paymentContext'];
const hash=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
const providerId=(v:unknown,prefix:string)=>{if(typeof v!=='string'||!new RegExp('^'+prefix+'_[A-Za-z0-9]{1,80}$').test(v))throw new ProductError('invalid','Invalid payment reference.');return v;};
export function paymentService(db:Firestore,context:Context,env:NodeJS.ProcessEnv=process.env,suppliedProvider?:PaymentProvider){
 const config=()=>paymentConfig(env),provider=()=>suppliedProvider||razorpayProvider(config());
 async function readyForInitiation(uid:string){
  const c=config();if(!initiationAllowed(c,uid,env))return false;
  if(env.VERCEL_ENV!=='production')return true;
  const heartbeat=(await db.doc('paymentOperations/worker').get()).data();
  return (env.PAYMENT_WORKER_SECRET||'').length>=32&&heartbeat?.mode===c.mode&&heartbeat?.keyId===c.keyId&&Number.isSafeInteger(heartbeat?.at)&&heartbeat.at>Date.now()-300000;
 }
 async function limit(uid:string){const minute=Math.floor(Date.now()/60000),ref=db.doc('paymentRateLimits/'+hash(uid+'_'+minute));await db.runTransaction(async tx=>{const saved=await tx.get(ref),count=saved.data()?.count||0;if(count>=30)throw new ProductError('rate-limited','Too many payment checks. Please wait a minute.');tx.set(ref,{count:count+1,expiresAt:Date.now()+3600000});});}
 async function owned(uid:string,id:string,admin=false){const doc=await db.doc('orders/'+referenceId(id)).get();if(!doc.exists||!doc.data()?.payment||(!admin&&doc.data()?.uid!==uid))throw new ProductError('not-found','Payment not found.');return {...doc.data(),id} as OrderRecord;}
 async function sameMode(id:string){const a=(await db.doc('paymentAttempts/'+id).get()).data(),c=config();if(!a||a.mode!==c.mode||a.keyId!==c.keyId)throw new ProductError('configuration','This payment requires its original payment account configuration.');return a;}
 const matches=(o:ProviderOrder,id:string,amount:number)=>o.receipt===id&&o.notes?.internalOrderId===id&&o.amount===amount&&o.currency==='INR'&&Number.isSafeInteger(o.amount)&&['created','attempted','paid'].includes(o.status);
 async function bind(id:string,o:ProviderOrder){
  await db.runTransaction(async tx=>{const aRef=db.doc('paymentAttempts/'+id),a=await tx.get(aRef),ref=db.doc('orders/'+id),order=await tx.get(ref),mapping=db.doc('paymentProviderOrders/'+providerId(o.id,'order')),existing=await tx.get(mapping);
   if(!matches(o,id,Number(order.data()?.totalPaise))||existing.exists&&existing.data()?.orderId!==id||a.data()?.providerOrderId&&a.data()?.providerOrderId!==o.id)throw new ProductError('schema','Payment mapping requires review.');
   if(a.data()?.providerOrderId===o.id&&order.data()?.payment?.providerOrderId===o.id)return;
   if(order.data()?.payment?.capturedAt)throw new ProductError('schema','Captured payment mapping cannot be replaced.');
   tx.set(mapping,{orderId:id,mode:a.data()!.mode});tx.update(aRef,{providerOrderId:o.id,creation:'known',updatedAt:Date.now()});tx.update(ref,{'payment.providerOrderId':o.id,'payment.state':order.data()?.payment?.state==='MANUAL_REVIEW'?'MANUAL_REVIEW':'PENDING','payment.updatedAt':Date.now()});
  });
  console.info(JSON.stringify({event:'payment_provider_order_bound',orderId:id}));
 }
 async function reconcile(id:string){
  let a=await sameMode(id);const order=await owned(a.uid,id),p=provider();
  if(!a.providerOrderId){
   if(a.creation==='new'){if(Date.now()>order.payment!.expiresAt)await settlePayment(db,id,{state:'PENDING',expire:true,unstarted:true});else await db.doc('paymentAttempts/'+id).update({nextCheckAt:Date.now()+60000});return;}
   const found=await p.find(id,a.createdAt);
   if(found.length>1){await settlePayment(db,id,{state:'MANUAL_REVIEW',reason:'multiple-provider-orders'});return;}
   if(!found.length){if(Date.now()>order.payment!.expiresAt)await settlePayment(db,id,{state:'MANUAL_REVIEW',reason:'provider-order-create-outcome-unknown'});else await db.doc('paymentAttempts/'+id).update({nextCheckAt:Date.now()+60000});return;}
   await bind(id,found[0]);a=await sameMode(id);
  }
  const [remote,payments]=await Promise.all([p.order(a.providerOrderId),p.payments(a.providerOrderId)]);
  if(remote.id!==a.providerOrderId||!matches(remote,id,Number(order.totalPaise))||payments.some(v=>v.order_id!==a.providerOrderId||v.currency!=='INR'||v.amount!==Number(order.totalPaise)||!/^pay_[A-Za-z0-9]{1,80}$/.test(v.id))){await settlePayment(db,id,{state:'MANUAL_REVIEW',reason:'provider-order-or-amount-mismatch'});return;}
  const captures=payments.filter(v=>['captured','refunded'].includes(v.status)&&v.captured===true);
  if(captures.length>1){await settlePayment(db,id,{state:'MANUAL_REVIEW',reason:'multiple-captured-payments'});return;}
  const captured=captures[0];
  if(captured){
   if(remote.status!=='paid'||remote.amount_paid!==Number(order.totalPaise)){await settlePayment(db,id,{state:'VERIFICATION_PENDING',reason:'order-capture-reconciliation-pending'});return;}
   const raw=await p.refunds(captured.id),refunds=raw.map(r=>({id:providerId(r.id,'rfnd'),payment_id:r.payment_id,amount:r.amount,currency:r.currency,status:r.status,created_at:r.created_at}));
   if(refunds.some(r=>r.payment_id!==captured.id||r.currency!=='INR'||!Number.isSafeInteger(r.amount)||r.amount<=0||!['pending','processed','failed'].includes(r.status))||refunds.filter(r=>r.status==='processed').reduce((sum,r)=>sum+r.amount,0)!==captured.amount_refunded)throw new ProductError('unavailable','Refund reconciliation is incomplete.');
   await settlePayment(db,id,{state:'CAPTURED',payment:captured,refunds});
  }else if(remote.status==='paid'){await settlePayment(db,id,{state:'MANUAL_REVIEW',reason:'paid-order-without-capture-evidence'});}
  else{const authorized=payments.find(v=>v.status==='authorized'),failed=payments.find(v=>v.status==='failed');await settlePayment(db,id,{state:authorized?'AUTHORIZED':failed?'FAILED':'PENDING',payment:authorized||failed,expire:Date.now()>order.payment!.expiresAt});}
 }
 async function view(uid:string,id:string,admin=false){const order=await owned(uid,id,admin),p=order.payment!;return {id,reference:order.reference,status:order.status,payment:admin?p:publicPayment(p)};}
 async function customer(token:string,action:string,body:Record<string,unknown>){
  const user=await context.authenticate(token);await limit(user.uid);
  if(action==='capabilities'){exact(body,[]);try{const c=config();return {online:await readyForInitiation(user.uid),mode:c.mode};}catch{return {online:false};}}
  if(action==='create-order'){
   exact(body,['addressId','couponCode','fingerprint','operationId'],['source','points']);const c=config();if(!await readyForInitiation(user.uid))throw new ProductError('permission','Online payments are not enabled for this account.');
   const result=await context.orders.reserve(user.uid,user.email||'',{...body,action:'orders:place'},c);
   if(!result.order)return result;
   const id=result.order.id;await sameMode(id);console.info(JSON.stringify({event:'payment_attempt_reserved',orderId:id,mode:c.mode}));
   const claimed=await db.runTransaction(async tx=>{const ref=db.doc('paymentAttempts/'+id),doc=await tx.get(ref),order=await tx.get(db.doc('orders/'+id));if(!doc.exists)throw new ProductError('conflict','This checkout already produced a different order.');if(doc.data()!.mode!==c.mode||doc.data()!.keyId!==c.keyId)throw new ProductError('configuration','This payment requires its original payment account configuration.');if(doc.data()!.creation!=='new'||order.data()?.payment?.reservation!=='active'||Date.now()>=order.data()?.payment?.expiresAt)return false;tx.update(ref,{creation:'creating',creationStartedAt:Date.now()});return true;});
   // This POST is executed once. A lost response or process restart is reconciled by receipt.
   if(claimed){try{await bind(id,await provider().create(Number(result.order.totalPaise),id));}catch{await db.doc('paymentAttempts/'+id).update({creation:'unknown',lastError:'provider-order-create-unconfirmed',nextCheckAt:Date.now()+60000});}}
   const a=await sameMode(id),current=await view(user.uid,id);
   return {...current,...(a.providerOrderId&&current.payment.reservation==='active'&&['PENDING','FAILED'].includes(current.payment.state)&&Date.now()<current.payment.expiresAt?{checkout:{key:c.keyId,order_id:a.providerOrderId,amount:current.payment.amountPaise,currency:'INR',mode:c.mode}}:{})};
  }
  if(action==='resume'){
   exact(body,['id']);const id=referenceId(body.id);await owned(user.uid,id);const c=config();if(!await readyForInitiation(user.uid))throw new ProductError('permission','Online payments are not enabled for this account.');
   await reconcile(id);const result=await view(user.uid,id),a=await sameMode(id);
   return {...result,...(a.providerOrderId&&result.payment.reservation==='active'&&['PENDING','FAILED'].includes(result.payment.state)&&Date.now()<result.payment.expiresAt?{checkout:{key:c.keyId,order_id:a.providerOrderId,amount:result.payment.amountPaise,currency:'INR',mode:c.mode}}:{})};
  }
  if(action==='status'){
   exact(body,[],['id','operationId']);if(body.id!==undefined&&body.operationId!==undefined)throw new ProductError('invalid','Choose one payment reference.');let id=body.operationId===undefined?body.id:hash(JSON.stringify([user.uid,referenceId(body.operationId)])).slice(0,32);if(id===undefined)id=(await db.doc('paymentCheckoutLocks/'+user.uid).get()).data()?.orderId;
   if(!id)return {active:null};referenceId(id);await owned(user.uid,id as string);
   let checked=true;try{await reconcile(id as string);}catch{checked=false;console.warn(JSON.stringify({event:'payment_reconciliation_deferred',reason:'provider-or-configuration-unavailable'}));}
   return {...await view(user.uid,id as string),reconciled:checked};
  }
  if(action==='verify'){
   exact(body,['id','razorpay_order_id','razorpay_payment_id','razorpay_signature']);const id=referenceId(body.id),order=await owned(user.uid,id),a=await sameMode(id),c=config();
   const orderId=providerId(body.razorpay_order_id,'order'),paymentId=providerId(body.razorpay_payment_id,'pay');
   if(a.providerOrderId!==orderId||!signatureMatches(c.keySecret,a.providerOrderId+'|'+paymentId,body.razorpay_signature))throw new ProductError('permission','Payment signature verification failed.');
   const remote=await provider().payment(paymentId);
   if(remote.id!==paymentId||remote.order_id!==a.providerOrderId||remote.amount!==Number(order.totalPaise)||remote.currency!=='INR'){await settlePayment(db,id,{state:'MANUAL_REVIEW',reason:'callback-payment-mismatch'});return view(user.uid,id);}
   console.info(JSON.stringify({event:'payment_callback_signature_verified',orderId:id}));await reconcile(id);return view(user.uid,id);
  }
  if(action==='reconcile'){
   exact(body,['id']);const uid=await context.administrator(token),id=referenceId(body.id);await owned(uid,id,true);
   // Access-record revocation participates in the audit transaction as well as the claim check above.
   await db.runTransaction(async tx=>{if((await tx.get(db.doc('adminAccess/'+uid))).data()?.enabled!==true)throw new ProductError('permission','Active administrator permission is required.');tx.create(db.collection('paymentReconciliation').doc(),{orderId:id,actor:uid,action:'requested',createdAt:FieldValue.serverTimestamp()});});
   await reconcile(id);return view(uid,id,true);
  }
  throw new ProductError('invalid','Unsupported payment action.');
 }
 async function webhook(raw:Buffer,signature:unknown,eventId:unknown){
  const c=config();if(!signatureMatches(c.webhookSecret,raw,signature))throw new ProductError('permission','Invalid webhook signature.');
  if(typeof eventId!=='string'||!/^[A-Za-z0-9_-]{1,160}$/.test(eventId))throw new ProductError('invalid','A webhook event identifier is required.');
  let payload:any;try{payload=JSON.parse(raw.toString('utf8'));}catch{throw new ProductError('invalid','Invalid webhook JSON.');}
  if(!['payment.authorized','payment.captured','payment.failed','order.paid','refund.created','refund.processed','refund.failed'].includes(payload?.event))throw new ProductError('invalid','Unsupported webhook event.');
  const refund=payload.payload?.refund?.entity,payment=payload.payload?.payment?.entity,order=payload.payload?.order?.entity;
  let providerOrderId:string|null=null,paymentId:string|null=null;
  if(payload.event.startsWith('refund.')){providerId(refund?.id,'rfnd');paymentId=providerId(refund?.payment_id,'pay');}
  else if(payload.event==='order.paid'){providerOrderId=providerId(order?.id,'order');}
  else{paymentId=providerId(payment?.id,'pay');providerOrderId=providerId(payment?.order_id,'order');}
  const ref=db.doc('paymentEvents/'+hash(eventId)),bodyHash=hash(raw);
  const duplicate=await db.runTransaction(async tx=>{const existing=await tx.get(ref);if(existing.exists){if(existing.data()?.bodyHash!==bodyHash)throw new ProductError('conflict','Webhook event identity conflict.');return true;}tx.create(ref,{eventId,bodyHash,event:payload.event,providerOrderId,paymentId,mode:c.mode,keyId:c.keyId,processing:'accepted',nextCheckAt:Date.now(),createdAt:Date.now()});return false;});
  console.info(JSON.stringify({event:duplicate?'payment_webhook_duplicate':'payment_webhook_accepted',eventType:payload.event,eventHash:hash(eventId)}));return {accepted:true};
 }
 async function work(){
  const deadline=Date.now()+35000,c=config(),events=await db.collection('paymentEvents').where('nextCheckAt','<=',Date.now()).limit(20).get();let processed=0,pending=0,checked=0;
  for(const event of events.docs){if(Date.now()>deadline-18000)break;const e=event.data();if(e.processing==='processed'||e.mode!==c.mode||e.keyId!==c.keyId)continue;try{const remoteId=e.providerOrderId||(await provider().payment(e.paymentId)).order_id,mapping=await db.doc('paymentProviderOrders/'+providerId(remoteId,'order')).get();if(!mapping.exists)throw new Error('unmapped');await reconcile(mapping.data()!.orderId);await event.ref.update({processing:'processed',processedAt:Date.now(),nextCheckAt:FieldValue.delete()});processed++;}catch{await event.ref.update({lastError:'reconciliation-pending',nextCheckAt:Date.now()+60000});pending++;}}
  const attempts=await db.collection('paymentAttempts').where('nextCheckAt','<=',Date.now()).limit(20).get();
  for(const attempt of attempts.docs){if(Date.now()>deadline-18000)break;if(attempt.data().mode!==c.mode||attempt.data().keyId!==c.keyId)continue;checked++;try{await reconcile(attempt.id);}catch{await attempt.ref.update({lastError:'reconciliation-pending',nextCheckAt:Date.now()+60000});pending++;}}
  await db.doc('paymentOperations/worker').set({at:Date.now(),mode:c.mode,keyId:c.keyId,processed,pending});
  console.info(JSON.stringify({event:'payment_worker',processed,pending}));
  return {processed,pending,checked};
 }
 return {customer,webhook,work,reconcile};
}
