import type {Firestore,DocumentData} from 'firebase-admin/firestore';
import type {PaymentConfig} from './config.ts';

// Equality restrictions must run in Firestore BEFORE limit, including key rotations
// within one mode. Both collections have matching composite indexes in the manifest.
export function duePayments(db:Firestore,collection:'paymentEvents'|'paymentAttempts',config:PaymentConfig,at:number){
 return db.collection(collection).where('mode','==',config.mode).where('keyId','==',config.keyId).where('nextCheckAt','<=',at).orderBy('nextCheckAt').limit(20);
}

// Only clean, captured TEST payments may stop periodic polling. Explicit status,
// administrator reconciliation and accepted webhooks still reconcile these records.
// LIVE captures, refund evidence and review/active/released states keep polling.
export function completedTestCapture(attempt:DocumentData|undefined,order:DocumentData|undefined):boolean{
 const p=order?.payment;
 return !!attempt&&!!order&&attempt.mode==='test'&&p?.mode==='test'
  &&/^rzp_test_[A-Za-z0-9]{8,64}$/.test(attempt.keyId||'')
  &&attempt.orderId===order.id&&attempt.uid===order.uid&&attempt.creation==='known'
  &&/^order_[A-Za-z0-9]{1,80}$/.test(attempt.providerOrderId||'')&&attempt.providerOrderId===p.providerOrderId
  &&/^pay_[A-Za-z0-9]{1,80}$/.test(p.providerPaymentId||'')
  &&p.state==='CAPTURED'&&p.reservation==='consumed'&&Number.isSafeInteger(p.capturedAt)&&p.capturedAt>0
  &&Number.isSafeInteger(p.amountPaise)&&p.amountPaise>0&&String(p.amountPaise)===String(order.totalPaise)
  &&!p.reason&&!p.refundReviewRequired&&!p.refundState&&!p.refundedAt&&!(p.refundedPaise??0)
  &&(attempt.refunds===undefined||Array.isArray(attempt.refunds)&&attempt.refunds.length===0);
}
