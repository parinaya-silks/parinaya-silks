import {validateLoyalty,pointNumber,type LoyaltyOrder} from '../src/loyalty/model.ts';
import {capturedPayment,type OrderPayment} from '../src/payments/model.ts';
type Candidate={status:string;payment?:OrderPayment;loyalty?:LoyaltyOrder;refunds?:unknown[];request?:{kind:string;status:string}|null};
// Trusted saved terms only. Current settings cannot retrospectively qualify an order.
export function deliveryAwardBlocker(order:Candidate):string|null{
 if(order.payment&&!capturedPayment(order.payment))return 'online-payment-not-eligible';
 const s=order.loyalty;if(order.status!=='Delivered')return 'not-delivered';if(!s)return 'no-snapshot';
 if(s.stage!=='pending')return 'not-pending';if(order.refunds?.length||s.earned||s.reversed||s.restored)return 'previous-award-or-refund';
 if(order.request?.kind==='return'&&order.request.status!=='rejected')return 'return-in-progress-or-resolved';
 try{const config=validateLoyalty(s.config);if(!config.enabled)return 'ineligible-snapshot';
  if(s.version!==1||!Number.isSafeInteger(s.configRevision)||s.configRevision<1||!Number.isSafeInteger(s.redeemed)||s.redeemed<0||!Number.isSafeInteger(s.expected)||s.expected<0||!/^\d+$/.test(s.basisPaise)||!/^\d+$/.test(s.discountPaise)||s.refundedShippingPaise!=='0'||!Array.isArray(s.lines)||!s.lines.length)return 'invalid-snapshot';
  let eligible=0n,discount=0n;for(const line of s.lines){if(!/^\d+$/.test(line.eligiblePaise)||!/^\d+$/.test(line.discountPaise)||line.returnedBasisPaise!=='0'||BigInt(line.discountPaise)>BigInt(line.eligiblePaise))return 'returned-or-invalid-lines';eligible+=BigInt(line.eligiblePaise);discount+=BigInt(line.discountPaise);}
  if(discount!==BigInt(s.discountPaise)||discount!==BigInt(s.redeemed)*BigInt(config.pointValuePaise!)||eligible-discount!==BigInt(s.basisPaise)||s.expected!==pointNumber(BigInt(s.basisPaise)*BigInt(config.earnPoints!)/BigInt(config.earnSpendPaise!)))return 'inconsistent-snapshot';
 }catch{return 'invalid-snapshot';}return null;
}
