import {couponEligibilityReason,checkCouponSequence,type CouponInput} from '../orders/model.ts';
export type AvailableCoupon={code:string;title?:string;description?:string;kind:'percent'|'fixed';value:number;minimumPaise:number;capPaise:number|null;endsAt:number|null;perCustomerLimit:number|null;eligibleOrderNumber:number|null;state:'eligible'|'upcoming'|'history'|'usage'|'login'|'minimum'|'items';message:string};
// Visibility is independent of customer eligibility. Private, disabled and out-of-window
// offers stay hidden; usage/minimum/sequence failures remain visible, never applicable.
export function availableCoupon(c:CouponInput,globalUses:number,uses:number,delivered:number|null,subtotal:bigint|null,hasItems:boolean,now:number):AvailableCoupon|null{
 if(c.discoverable!==true||!c.enabled||(c.startsAt!==null&&now<c.startsAt)||(c.endsAt!==null&&now>=c.endsAt))return null;
 let state:AvailableCoupon['state']='eligible',message='Eligible for your current items. Checkout confirms prices and availability.';
 const usageReason=couponEligibilityReason(c,BigInt(c.minimumPaise),globalUses,uses,now);
 if(usageReason){state='usage';message=usageReason;}
 else if(delivered===null){state='login';message=c.eligibleOrderNumber!=null?`Unlock after ${c.eligibleOrderNumber-1} Delivered orders. Sign in to check your eligibility.`:'Sign in to check your eligibility and apply at checkout.';}
 else if(c.eligibleOrderNumber!=null){
  try{checkCouponSequence(c,delivered,uses);}catch(error){
   if(uses>=1){state='usage';message=(error as Error).message;}
   else if(delivered<c.eligibleOrderNumber-1){const needed=c.eligibleOrderNumber-1-delivered;state='upcoming';message=`Complete ${needed} more Delivered order${needed===1?'':'s'} to unlock this offer.`;}
   else{state='history';message=(error as Error).message;}
  }
 }
 if(state==='eligible'){
  if(!hasItems||subtotal===null){state='items';message='Add available items to your Bag, or select an available product colour, to apply this offer.';}
  else{const reason=couponEligibilityReason(c,subtotal,globalUses,uses,now);if(reason){state='minimum';message=reason;}}
 }
 return {code:c.code,title:c.title||'',description:c.description||'',kind:c.kind,value:c.value,minimumPaise:c.minimumPaise,capPaise:c.capPaise,endsAt:c.endsAt,perCustomerLimit:c.perCustomerLimit,eligibleOrderNumber:c.eligibleOrderNumber??null,state,message};
}
