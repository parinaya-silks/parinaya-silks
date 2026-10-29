import type {OrderRecord,OrderStatus} from './model.ts';
export const historyFilters=['all','progress','delivered','cancelled'] as const;
export type HistoryFilter=typeof historyFilters[number];
export const historyLabels:Record<HistoryFilter,string>={all:'All Orders',progress:'In Progress',delivered:'Delivered',cancelled:'Cancelled'};
export const historyStatuses:Record<HistoryFilter,readonly OrderStatus[]>={all:[],progress:['Placed','Confirmed','Processing','Shipped'],delivered:['Delivered'],cancelled:['Cancelled','Rejected']};
export interface HistoryItem {quantity:number|null;name:string;variantName:string;imageUrl:string;linePaise:string|null}
export interface HistoryOrder {id:string;reference:string;createdAt:number;status:OrderStatus;paymentStatus:'due'|'collected';totalPaise:string;collectedPaise:string|null;refundPaise:string|null;items:HistoryItem[];lineCount:number;unitCount:number|null;courier:string;estimatedDeliveryDate:string|null}
export interface HistoryPage {items:HistoryOrder[];nextCursor:string|null}
export function historyFilter(search:string):HistoryFilter {const value=new URLSearchParams(search).get('status');return historyFilters.includes(value as HistoryFilter)?value as HistoryFilter:'all';}
export const historyPath=(filter:HistoryFilter)=>'/account/orders'+(filter==='all'?'':'?status='+filter);
// Only immutable purchase snapshots and fields needed by the cards leave this endpoint.
export function historyProjection(order:OrderRecord):HistoryOrder {
 const items=Array.isArray(order.items)?order.items:[],collected=(order as OrderRecord&{collectedPaise?:number}).collectedPaise;
 return {id:order.id,reference:order.reference,createdAt:order.createdAt,status:order.status,paymentStatus:order.paymentStatus,totalPaise:order.totalPaise,
 collectedPaise:typeof collected==='number'&&Number.isSafeInteger(collected)&&collected>=0&&(collected>0||order.paymentStatus==='collected')?String(collected):null,
 refundPaise:order.refunds?.length?String(order.refunds.reduce((sum,item)=>sum+BigInt(item.amountPaise),0n)):null,
 items:items.slice(0,2).map(item=>({quantity:Number.isSafeInteger(item.quantity)&&item.quantity>0?item.quantity:null,name:item.name||'Purchased item',variantName:item.variantName||'',imageUrl:item.imageUrl||'',linePaise:/^\d+$/.test(String(item.linePaise))?String(item.linePaise):null})),
 lineCount:items.length,unitCount:items.every(item=>Number.isSafeInteger(item.quantity)&&item.quantity>0)?items.reduce((sum,item)=>sum+item.quantity,0):null,courier:order.courier||'',estimatedDeliveryDate:order.estimatedDeliveryDate||null};
}
export function historyPayment(order:HistoryOrder) {
 const closed=['Cancelled','Rejected'].includes(order.status);
 return {closed,label:closed?'Order Value':order.paymentStatus==='collected'||order.collectedPaise!==null?'Order Total':'Total Payable',message:order.paymentStatus==='collected'?'COD · Collection recorded':closed?'No delivery payment requested':'Cash on Delivery · Due at delivery'};
}
