import {ProductError} from '../products/model.ts';
import {safeLink,text,transitions,type OrderStatus} from './model.ts';

export const deliveryFields=['courier','trackingNumber','trackingUrl','estimatedDeliveryDate'] as const;
export type DeliveryValues={courier:string;trackingNumber:string;trackingUrl:string;estimatedDeliveryDate:string|null};
export const deliveryEditable=(status:OrderStatus)=>['Placed','Confirmed','Processing','Shipped'].includes(status);
export const deliveryTransitions=(status:OrderStatus)=>(transitions[status]||[]).filter(value=>!['Cancelled','Rejected'].includes(value));
export function deliveryValues(value:Partial<DeliveryValues>):DeliveryValues{return {courier:value.courier||'',trackingNumber:value.trackingNumber||'',trackingUrl:value.trackingUrl||'',estimatedDeliveryDate:value.estimatedDeliveryDate||null};}
export const indiaDate=(now=Date.now())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export function deliveryDateLabel(value?:string|null){if(!value)return 'Not set';const [year,month,day]=value.split('-');return `${day}/${month}/${year}`;}
export function deliveryRecord(previous:Partial<DeliveryValues>,patch:Record<string,unknown>,status:OrderStatus,now=Date.now()):DeliveryValues{
 const old=deliveryValues(previous),result={...old};
 for(const field of ['courier','trackingNumber'] as const)result[field]=text(field in patch?patch[field]:old[field],100);
 if(result.trackingNumber&&!/^[\p{L}\p{N} ._/#()+-]+$/u.test(result.trackingNumber))throw new ProductError('invalid','Use letters, numbers and normal separators for the tracking number.');
 result.trackingUrl=safeLink('trackingUrl' in patch?patch.trackingUrl:old.trackingUrl);
 if('estimatedDeliveryDate' in patch){
  const value=patch.estimatedDeliveryDate;
  if(value!==null){
   if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)throw new ProductError('invalid','Choose a valid estimated delivery date.');
   const today=indiaDate(now),limit=new Date(today+'T00:00:00Z');limit.setUTCDate(limit.getUTCDate()+730);
   if(value!==old.estimatedDeliveryDate&&(value<today||value>limit.toISOString().slice(0,10)))throw new ProductError('invalid','New delivery estimates must be today or within the next two years (India time).');
  }
  result.estimatedDeliveryDate=value as string|null;
 }
 if(['Shipped','Delivered'].includes(status)&&(!result.courier||!result.trackingNumber))throw new ProductError('invalid','Courier and tracking number are required for dispatched orders.');
 return result;
}
export function deliveryChanged(old:Partial<DeliveryValues>,next:DeliveryValues){const previous=deliveryValues(old);return deliveryFields.some(field=>previous[field]!==next[field]);}
