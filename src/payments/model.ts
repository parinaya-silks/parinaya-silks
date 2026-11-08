export const paymentStates=['CREATED','PENDING','AUTHORIZED','CAPTURED','FAILED','CANCELLED','VERIFICATION_PENDING','REFUND_PENDING','PARTIALLY_REFUNDED','REFUNDED','MANUAL_REVIEW'] as const;
export type PaymentState=typeof paymentStates[number];
export interface OrderPayment {mode:'test'|'live';state:PaymentState;reservation:'active'|'consumed'|'released';expiresAt:number;createdAt:number;updatedAt:number;verifiedAt?:number;authorizedAt?:number;capturedAt?:number;failedAt?:number;refundedAt?:number;refundedPaise?:number;refundState?:string;refundReviewRequired?:boolean;providerOrderId?:string;providerPaymentId?:string;method?:string;reason?:string;amountPaise:number}
export const capturedPayment=(p?:OrderPayment)=>!!p&&p.state==='CAPTURED'&&p.reservation==='consumed'&&!p.refundReviewRequired;
// Placed is the saved lifecycle of a reserved checkout, not proof of payment.
// Keep that lifecycle intact while presenting payment action before fulfilment.
export function awaitsOnlinePayment(p?:OrderPayment){return !!p&&(p.state==='MANUAL_REVIEW'||!p.capturedAt&&!capturedPayment(p));}
export function orderStatusLabel(order:{status:string;payment?:OrderPayment}){
 if(!awaitsOnlinePayment(order.payment))return order.status;
 const p=order.payment!;
 if(p.state==='MANUAL_REVIEW')return 'Payment needs review';
 if(p.reservation==='released'||p.state==='CANCELLED')return 'Payment expired';
 if(p.state==='FAILED')return 'Payment failed';
 if(p.state==='AUTHORIZED')return 'Awaiting capture';
 if(p.state==='VERIFICATION_PENDING')return 'Verifying payment';
 return 'Awaiting payment';
}
export function paymentMessage(p:OrderPayment){
 if(p.state==='CAPTURED')return 'Payment successful! Your order has been confirmed.';
 if(p.state==='REFUNDED')return 'Your refund has been confirmed by the payment provider.';
 if(p.state==='PARTIALLY_REFUNDED')return 'A partial refund has been confirmed by the payment provider.';
 if(p.state==='REFUND_PENDING')return 'Your refund is pending with the payment provider.';
 if(p.state==='MANUAL_REVIEW')return 'This payment needs a store review. Please do not pay again. Contact support with your order reference.';
 if(p.state==='CANCELLED')return 'The payment reservation expired. No order confirmation has been issued. Contact support if money was debited.';
 if(p.state==='FAILED')return 'Your payment could not be completed. No order confirmation has been issued. Check payment status before trying again.';
 return 'Your payment is being verified. Please do not make another payment. Check payment status shortly.';
}
export function publicPayment(p:OrderPayment):OrderPayment {
 const {mode,state,reservation,expiresAt,createdAt,updatedAt,verifiedAt,authorizedAt,capturedAt,failedAt,refundedAt,refundedPaise,refundState,amountPaise}=p;
 return Object.fromEntries(Object.entries({mode,state,reservation,expiresAt,createdAt,updatedAt,verifiedAt,authorizedAt,capturedAt,failedAt,refundedAt,refundedPaise,refundState,amountPaise}).filter(([,v])=>v!==undefined)) as unknown as OrderPayment;
}
