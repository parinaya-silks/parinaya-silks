import {FieldValue,type Firestore} from 'firebase-admin/firestore';
import {changeStock,type OrderRecord} from '../../src/orders/model.ts';
import type {ProductInput} from '../../src/products/model.ts';
import {ProductError} from '../../src/products/model.ts';
import {loyaltyService} from '../loyalty.ts';
import type {OrderPayment,PaymentState} from '../../src/payments/model.ts';
import type {ProviderPayment,ProviderRefund} from './provider.ts';
import {completedTestCapture} from './queue.ts';

export interface Observation {state:PaymentState;payment?:ProviderPayment;refunds?:ProviderRefund[];reason?:string;expire?:boolean;unstarted?:boolean}
export async function settlePayment(db:Firestore,id:string,seen:Observation){
 const result=await db.runTransaction(async tx=>{
  const ref=db.doc('orders/'+id),doc=await tx.get(ref),order={...doc.data(),id} as OrderRecord;
  if(!doc.exists||!order.payment)throw new ProductError('not-found','Payment not found.');
  const old=order.payment,lockRef=db.doc('paymentCheckoutLocks/'+order.uid),lock=await tx.get(lockRef),attemptRef=db.doc('paymentAttempts/'+id),attempt=await tx.get(attemptRef);
  const at=Date.now(),payment:OrderPayment={...old,updatedAt:at,verifiedAt:at};
  const previouslyCaptured=!!old.capturedAt;
  if(previouslyCaptured&&!['CAPTURED','REFUND_PENDING','PARTIALLY_REFUNDED','REFUNDED','MANUAL_REVIEW'].includes(seen.state))return;
  let release=!!seen.expire&&old.reservation==='active'&&!previouslyCaptured&&!['CAPTURED','AUTHORIZED','MANUAL_REVIEW'].includes(seen.state);
  if(seen.unstarted&&attempt.data()?.creation!=='new')release=false;
  let capture=seen.state==='CAPTURED'&&!previouslyCaptured&&old.reservation==='active';
  if(old.state==='MANUAL_REVIEW'){release=false;capture=false;}
  const authorizationUnresolved=!!old.authorizedAt&&!previouslyCaptured&&!['CAPTURED','AUTHORIZED','MANUAL_REVIEW'].includes(seen.state);
  if(authorizationUnresolved)release=false;
  const update:Record<string,unknown>={revision:order.revision+1,updatedAt:FieldValue.serverTimestamp()};
  if(seen.payment){payment.providerPaymentId=seen.payment.id;payment.method=seen.payment.method;}
  payment.state=old.state==='MANUAL_REVIEW'?'MANUAL_REVIEW':old.reservation==='released'&&seen.state!=='CAPTURED'?'CANCELLED':seen.state;
  if(authorizationUnresolved){payment.state='MANUAL_REVIEW';payment.reason='authorization-outcome-requires-review';}
  if(seen.reason)payment.reason=seen.reason;
  if(seen.state==='AUTHORIZED')payment.authorizedAt=old.authorizedAt||at;
  if(seen.state==='FAILED')payment.failedAt=old.failedAt||at;
  if(seen.state==='CAPTURED'){
   payment.capturedAt=old.capturedAt||at;
   if(old.reservation==='released'||old.state==='MANUAL_REVIEW'){payment.state='MANUAL_REVIEW';payment.reason='capture-after-release-or-review';capture=false;}
   else payment.reservation='consumed';
  }
  const rawRefunds=(attempt.data()?.refunds||[]) as ProviderRefund[],refunds=new Map(rawRefunds.map(r=>[r.id,r]));
  for(const r of seen.refunds||[]){const before=refunds.get(r.id);if(before?.status!=='processed')refunds.set(r.id,r);}
  const refunded=[...refunds.values()].filter(r=>r.status==='processed').reduce((sum,r)=>sum+BigInt(r.amount),0n);
  if(refunded>BigInt(old.amountPaise))throw new ProductError('schema','Payment refund reconciliation requires review.');
  payment.refundedPaise=Number(refunded);
  if(refunded>BigInt(old.refundedPaise||0))payment.refundedAt=at;
  if(previouslyCaptured||seen.state==='CAPTURED'){
   if(refunded>0n){payment.refundState=refunded===BigInt(old.amountPaise)?'REFUNDED':'PARTIALLY_REFUNDED';if(payment.state!=='MANUAL_REVIEW')payment.state=payment.refundState as PaymentState;}
   else if([...refunds.values()].some(r=>r.status==='pending')){payment.refundState='REFUND_PENDING';if(payment.state!=='MANUAL_REVIEW')payment.state='REFUND_PENDING';}
   else if([...refunds.values()].some(r=>r.status==='failed'))payment.refundState='REFUND_FAILED';
  }
  if(refunded>0n&&capture){capture=false;payment.state='MANUAL_REVIEW';payment.reason='refund-before-fulfilment';}
  // Partial refunds need an explicit merchandise/shipping allocation before points can be spent.
  // Provider evidence is retained, never fabricated as a manually recorded refund.
  if(refunded>BigInt(old.refundedPaise||0)&&order.loyalty)payment.refundReviewRequired=true;
  const loyalty=loyaltyService(db);
  const change=release?await loyalty.transition(tx,order,{status:'Cancelled'},undefined,undefined,'payment-expiry'):undefined;
  const productIds=release?[...new Set(order.items.map(item=>item.productId))]:[];
  const products=productIds.length?await tx.getAll(...productIds.map(product=>db.doc('products/'+product))):[];
  const inventories=new Map(products.map(p=>{if(!p.exists)throw new ProductError('schema','Reserved stock requires review.');return [p.id,p.data()!.inventory as ProductInput['inventory']];}));
  if(release)for(const item of order.items)inventories.set(item.productId,changeStock(inventories.get(item.productId)!,item.variantId,item.quantity));
  const coupon=release&&order.couponCode?await tx.get(db.doc('coupons/'+order.couponCode)):null;
  const usage=release&&order.couponCode?await tx.get(db.doc(`coupons/${order.couponCode}/customers/${order.uid}`)):null;
  const bagLines=(attempt.data()?.bagLines||[]) as {id:string;quantity:number}[];
  const bag=capture&&bagLines.length?await tx.getAll(...bagLines.map(line=>db.doc(`customerShopping/${order.uid}/bag/${line.id}`))):[];
  if(payment.refundReviewRequired&&order.loyalty)await tx.get(db.doc('loyaltyAccounts/'+order.uid));
  // All reads precede writes; transaction retry cannot duplicate stock or points changes.
  if(release){
   payment.state='CANCELLED';payment.reservation='released';update.status='Cancelled';update.stockRestored=true;
   for(const product of products){tx.update(product.ref,{inventory:inventories.get(product.id),revision:product.data()!.revision+1,updatedAt:FieldValue.serverTimestamp()});tx.create(db.doc(`inventoryAudit/${id}_payment_release_${product.id}`),{productId:product.id,orderId:id,actor:'payment-service',reason:'Uncaptured payment reservation expired',before:product.data()!.inventory,after:inventories.get(product.id),createdAt:FieldValue.serverTimestamp()});}
   if(coupon?.exists&&usage?.exists){const a=coupon.data()!.uses,b=usage.data()!.uses;if(!Number.isSafeInteger(a)||a<1||!Number.isSafeInteger(b)||b<1)throw new ProductError('schema','Coupon reservation requires review.');tx.update(coupon.ref,{uses:a-1});tx.update(usage.ref,{uses:b-1});}
   if(change){update.loyalty=change.snapshot;change.commit();}
  }
  if(capture){
   update.status='Confirmed';update.collectedPaise=old.amountPaise;
   // Only remove unchanged quantities from this accepted checkout, preserving later Bag edits.
   for(let n=0;n<bag.length;n++)if(bag[n].exists&&bag[n].data()?.quantity===bagLines[n].quantity)tx.delete(bag[n].ref);
   tx.set(db.doc('adminNotifications/'+id+'_captured'),{kind:'order',target:'/admin/orders/'+id,label:'Online payment captured; order confirmed',createdAt:FieldValue.serverTimestamp()});
  }
  if(payment.refundReviewRequired&&order.loyalty)tx.set(db.doc('loyaltyAccounts/'+order.uid),{paymentReviewRequired:true},{merge:true});
  update.paymentStatus=payment.state==='MANUAL_REVIEW'?'review':payment.capturedAt?(payment.state==='REFUNDED'?'refunded':'paid'):payment.reservation==='released'?'failed':'pending';
  update.payment=payment;update.refundPaise=payment.refundedPaise||0;
  if(capture||release)update.history=[...order.history,{action:capture?'Confirmed':'Cancelled',actor:'payment-service',at,note:capture?'Provider capture and amount verified.':'Uncaptured reservation expired; no refund is implied.'}];
  if((capture||release)&&lock.data()?.orderId===id)tx.delete(lockRef);
  const refundEvidence=[...refunds.values()];
  const retire=completedTestCapture({...attempt.data(),refunds:refundEvidence},{...order,payment});
  tx.update(ref,update);tx.update(attemptRef,{refunds:refundEvidence,nextCheckAt:retire?FieldValue.delete():payment.state==='MANUAL_REVIEW'?at+3600000:payment.reservation==='active'?at+60000:at+86400000,updatedAt:at});
  return {state:payment.state,previous:old.state,reservation:payment.reservation,refundedPaise:payment.refundedPaise};
 });
 if(result)console.info(JSON.stringify({event:'payment_reconciled',orderId:id,...result}));
 return result;
}
