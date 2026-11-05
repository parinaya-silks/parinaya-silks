import {couponDiscount,checkCouponSequence,type CouponInput} from '../orders/model.ts';
export type AvailableCoupon={code:string;kind:'percent'|'fixed';value:number;minimumPaise:number;capPaise:number|null;endsAt:number|null;perCustomerLimit:number|null;eligibleOrderNumber:number|null;state:'eligible'|'upcoming'|'login'|'minimum'|'items';message:string};
// Discovery delegates validity, limits, arithmetic and sequence policy to checkout's validators.
export function availableCoupon(c:CouponInput,globalUses:number,uses:number,delivered:number|null,subtotal:bigint|null,hasItems:boolean,now:number):AvailableCoupon|null{
 if(c.discoverable!==true)return null;
 try{couponDiscount(c,BigInt(c.minimumPaise),globalUses,uses,now);}catch{return null;}
 let state:AvailableCoupon['state']='eligible',message='Eligible for your current items. Checkout confirms prices and availability.';
 if(c.eligibleOrderNumber!=null){
  if(uses>=1)return null;
  if(delivered!==null){try{checkCouponSequence(c,delivered,uses);}catch{if(delivered>=c.eligibleOrderNumber-1)return null;const needed=c.eligibleOrderNumber-1-delivered;state='upcoming';message=`Complete ${needed} more Delivered order${needed===1?'':'s'} to unlock this offer.`;}}
 }
 if(delivered===null){state='login';message=c.eligibleOrderNumber!=null?`Unlock after ${c.eligibleOrderNumber-1} Delivered orders. Sign in to check your eligibility.`:'Sign in to check your eligibility and apply at checkout.';}
 if(state==='eligible'){if(!hasItems||subtotal===null){state='items';message='Add available items to your Bag, or select an available product colour, to apply this offer.';}else{try{couponDiscount(c,subtotal,globalUses,uses,now);}catch{state='minimum';message='Your current product subtotal does not meet this minimum order amount.';}}}
 return {code:c.code,kind:c.kind,value:c.value,minimumPaise:c.minimumPaise,capPaise:c.capPaise,endsAt:c.endsAt,perCustomerLimit:c.perCustomerLimit,eligibleOrderNumber:c.eligibleOrderNumber??null,state,message};
}
