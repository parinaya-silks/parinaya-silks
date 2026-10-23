import {transitions,type OrderRecord} from '../../orders/model.ts';
import {ProductError,rupeesToPaise} from '../../products/model.ts';

export type DetailOrder=OrderRecord&{collectedPaise?:number;paymentMethod?:string};
export function orderFinance(order:DetailOrder){
 const amount=(value:unknown)=>{if(!/^\d+$/.test(String(value)))throw new ProductError('schema','Financial snapshot requires owner review.');return BigInt(String(value));};
 for(const value of [order.subtotalPaise,order.discountPaise,order.shippingPaise,...(order.items||[]).flatMap(item=>[item.unitPaise,item.linePaise])])if(value!==undefined)amount(value);
 const total=amount(order.totalPaise),recorded=amount(order.collectedPaise??(order.paymentStatus==='collected'?order.totalPaise:0));
 if(recorded>total)throw new ProductError('schema','Recorded collection exceeds the order total.');
 const cancelled=['Cancelled','Rejected'].includes(order.status);
 return {total,recorded,outstanding:order.paymentStatus==='due'&&!cancelled?total-recorded:0n,refunds:(order.refunds||[]).reduce((sum,item)=>sum+amount(item.amountPaise),0n)};
}
export function orderCommands(order:DetailOrder):string[]{
 return [...(transitions[order.status]||[]),...(order.status==='Delivered'&&order.paymentStatus==='due'?['collect']:[]),'note',...(order.request?.status==='pending'?['approve-request','reject-request']:[]),...(order.request?.status==='approved'&&order.request.kind!=='cancellation'&&!order.request.restocked?['receive-restock','resolve-request']:[]),...(order.request?.status==='resolved'&&order.paymentStatus==='collected'?['manual-refund']:[])];
}
export const commandLabel=(command:string)=>({'Confirmed':'Confirm order','Processing':'Start processing','Shipped':'Dispatch order','Delivered':'Mark delivered','Cancelled':'Cancel order','Rejected':'Reject order','collect':'Record COD collection','note':'Internal note','approve-request':'Approve request','reject-request':'Reject request','receive-restock':'Returned goods received, inspected and restock','resolve-request':'Resolve request without restocking','manual-refund':'Record external manual refund'} as Record<string,string>)[command]||command;
export const activityLabel=(action:string)=>({'collect':'COD collection recorded','request-cancellation':'Cancellation requested','request-return':'Return requested','request-exchange':'Exchange requested','approve-request':'Request approved','reject-request':'Request rejected','receive-restock':'Returned stock received and restored','resolve-request':'Request resolved','Manual refund':'External manual refund recorded','Note':'Internal note'} as Record<string,string>)[action]||action;
export const activityKind=(action:string)=>action==='Cancelled'||action==='Rejected'?'cancellation':action==='collect'||action==='Manual refund'?'payment':/request|restock/.test(action)?'request':action==='Note'?'note':'progress';
export function safeTrackingLink(value:unknown){if(typeof value!=='string'||/[\x00-\x20\\]/.test(value))return null;try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}}
export function callLink(value:unknown){if(typeof value!=='string')return null;const phone=value.replace(/[\s()-]/g,'');return /^\+[1-9]\d{6,14}$/.test(phone)?'tel:'+phone:null;}
export function refundAmount(value:string){const amount=rupeesToPaise(value);if(!Number.isSafeInteger(amount)||amount<=0)throw new ProductError('invalid','Enter a positive refund amount with at most two decimal places.');return amount;}
