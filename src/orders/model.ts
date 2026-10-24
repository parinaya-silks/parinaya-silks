import {ProductError,type ProductInput} from '../products/model.ts';
import type {DeliveryAddress} from '../delivery/model.ts';

export const orderStatuses=['Placed','Confirmed','Processing','Shipped','Delivered','Cancelled','Rejected'] as const;
export type OrderStatus=typeof orderStatuses[number];
export const transitions:Record<OrderStatus,readonly OrderStatus[]>={Placed:['Confirmed','Cancelled','Rejected'],Confirmed:['Processing','Cancelled','Rejected'],Processing:['Shipped','Cancelled','Rejected'],Shipped:['Delivered'],Delivered:[],Cancelled:[],Rejected:[]};
export interface OrderItem {productId:string;variantId:string|null;quantity:number;name:string;slug:string;sku:string;variantName:string;imageUrl:string;unitPaise:number;linePaise:string}
export interface OrderEvent {action:string;actor:string;at:number;note:string}
export interface OrderRecord {id:string;reference:string;uid:string;email:string;status:OrderStatus;paymentStatus:'due'|'collected';currency:'INR';revision:number;createdAt:number;updatedAt:number;address:DeliveryAddress;items:OrderItem[];subtotalPaise:string;discountPaise:string;shippingPaise:string;totalPaise:string;couponCode:string|null;shippingRevision:number;stockRestored:boolean;courier:string;trackingNumber:string;trackingUrl:string;estimatedDeliveryDate?:string|null;internalNotes:string;history:OrderEvent[];collection:null|{actor:string;at:number;reference:string;note:string};request:null|{kind:'cancellation'|'return'|'exchange';status:'pending'|'approved'|'rejected'|'resolved';reason:string;at:number;restocked:boolean};refunds:{amountPaise:number;method:string;reference:string;actor:string;at:number}[]}
export function referenceId(value:unknown):string {if(typeof value!=='string'||!/^[a-f0-9]{32}$/.test(value))throw new ProductError('invalid','Invalid operation or order reference.');return value;}
export function exact(body:Record<string,unknown>,required:string[],optional:string[]=[]){if(!body||typeof body!=='object'||Array.isArray(body)||required.some(key=>!(key in body))||Object.keys(body).some(key=>![...required,...optional].includes(key)))throw new ProductError('invalid','Unsupported or missing request fields.');}
export function text(value:unknown,max=500,required=false):string{if(typeof value!=='string'||value.length>max||/[\x00-\x1f\x7f]/.test(value)||(required&&!value.trim()))throw new ProductError('invalid',`Enter valid text up to ${max} characters.`);return value.trim();}
export function noteText(value:unknown,max=1000,required=false):string{if(typeof value!=='string'||value.length>max)throw new ProductError('invalid',`Enter notes up to ${max} characters.`);const normalized=value.replace(/\r\n?/g,'\n');text(normalized.replaceAll('\n',' '),max,required);return normalized.trim();}
export function safeLink(value:unknown,internal=false):string{const raw=text(value,500);if(!raw)return '';if(internal&&/^\/(?:shop|sale(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?|collections(?:\/[a-z0-9-]+)?|product\/[a-z0-9-]+)$/.test(raw))return raw;try{const url=new URL(raw);if(url.protocol==='https:'&&!url.username&&!url.password&&!/[\x00-\x20\\]/.test(raw))return url.href;}catch{}throw new ProductError('invalid','Use a safe HTTPS URL.');}
export function changeStock(inventory:ProductInput['inventory'],variantId:string|null,delta:number):ProductInput['inventory']{
  const result=structuredClone(inventory);let stock:number;
  if(result.mode==='simple'){if(variantId!==null)throw new ProductError('conflict','Inventory structure changed; owner review is required.');stock=(result.quantity||0)+delta;result.quantity=stock;}
  else{const variant=result.variants?.find(item=>item.id===variantId);if(!variant)throw new ProductError('conflict','The purchased colour no longer exists; owner review is required.');stock=variant.quantity+delta;variant.quantity=stock;}
  if(!Number.isSafeInteger(stock)||stock<0||stock>1000000)throw new ProductError('conflict','Stock is no longer available or needs owner review.');return result;
}
export function lowStock(inventory:ProductInput['inventory'],threshold:number):boolean{return inventory.mode==='simple'?(inventory.quantity||0)<=threshold:!!inventory.variants?.some(item=>item.quantity<=threshold);}
export function newlyLowStock(before:ProductInput['inventory'],after:ProductInput['inventory'],threshold:number,beforeThreshold=threshold){const old=new Map(before.mode==='simple'?[['simple',before.quantity||0]]:(before.variants||[]).map(item=>[item.id,item.quantity]));return (after.mode==='simple'?[['simple',after.quantity||0] as const]:(after.variants||[]).map(item=>[item.id,item.quantity] as const)).some(([id,quantity])=>{const previous=old.get(id);return previous!==undefined&&((previous>beforeThreshold&&quantity<=threshold)||(previous>0&&quantity===0));});}
export const csvCell=(value:unknown)=>'"'+String(value??'').replace(/^[\s]*([=+@-])/,'\'$1').replaceAll('"','""')+'"';

export interface CouponInput {code:string;kind:'percent'|'fixed';value:number;enabled:boolean;startsAt:number|null;endsAt:number|null;minimumPaise:number;capPaise:number|null;globalLimit:number|null;perCustomerLimit:number|null}
// Missing optional legacy fields mean no restriction; required identity/value/state never default.
export function storedCoupon(raw:Record<string,unknown>):CouponInput{return couponInput({code:raw.code,kind:raw.kind,value:raw.value,enabled:raw.enabled,minimumPaise:raw.minimumPaise===undefined?0:raw.minimumPaise,...Object.fromEntries(['startsAt','endsAt','capPaise','globalLimit','perCustomerLimit'].map(key=>[key,raw[key]===undefined?null:raw[key]]))});}
export function couponUses(value:unknown):number{if(value===undefined)return 0;if(!Number.isSafeInteger(value)||(value as number)<0)throw new ProductError('schema','Coupon usage requires owner review.');return value as number;}
export function couponInput(value:unknown):CouponInput{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new ProductError('invalid','Invalid coupon.');const raw=value as Record<string,unknown>;
  exact(raw,['code','kind','value','enabled','startsAt','endsAt','minimumPaise','capPaise','globalLimit','perCustomerLimit']);
  const code=text(raw.code,32,true).toUpperCase();if(!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code)||!['percent','fixed'].includes(raw.kind as string)||typeof raw.enabled!=='boolean')throw new ProductError('invalid','Use a valid unique coupon code and type.');
  for(const key of ['value','minimumPaise','capPaise','globalLimit','perCustomerLimit','startsAt','endsAt']){const n=raw[key];if(n===null&&!['value','minimumPaise'].includes(key))continue;if(!Number.isSafeInteger(n)||(n as number)<0||(n as number)>((key.endsWith('At'))?8640000000000000:1000000000))throw new ProductError('invalid','Invalid coupon amount, date or limit.');}
  if(!(raw.value as number)||(raw.kind==='percent'&&(raw.value as number)>100)||(raw.globalLimit!==null&&!(raw.globalLimit as number))||(raw.perCustomerLimit!==null&&!(raw.perCustomerLimit as number))||(raw.startsAt!==null&&raw.endsAt!==null&&(raw.startsAt as number)>=(raw.endsAt as number)))throw new ProductError('invalid','Check coupon value, dates and usage limits.');
  return {...raw,code} as unknown as CouponInput;
}
export function couponDiscount(coupon:CouponInput,subtotal:bigint,globalUses:number,customerUses:number,now=Date.now()):bigint{
  if(!coupon.enabled||(coupon.startsAt!==null&&now<coupon.startsAt)||(coupon.endsAt!==null&&now>=coupon.endsAt)||subtotal<BigInt(coupon.minimumPaise)||(coupon.globalLimit!==null&&globalUses>=coupon.globalLimit)||(coupon.perCustomerLimit!==null&&customerUses>=coupon.perCustomerLimit))throw new ProductError('conflict','This coupon is not eligible for this order. Remove it or use another code.');
  let amount=coupon.kind==='fixed'?BigInt(coupon.value):subtotal*BigInt(coupon.value)/100n;
  if(coupon.kind==='percent'&&coupon.capPaise!==null&&amount>BigInt(coupon.capPaise))amount=BigInt(coupon.capPaise);return amount>subtotal?subtotal:amount;
}
