import {customRange,periodRange,type DashboardOrder} from '../dashboard/model.ts';
import {csvCell,type OrderRecord,type OrderStatus} from '../../orders/model.ts';
import {ProductError} from '../../products/model.ts';

export interface OrderListItem extends DashboardOrder {paymentStatus:'due'|'collected';collectedPaise:string}
export interface OrderPage {items:OrderListItem[];nextCursor:string|null}
export interface OrderFilters {search:string;statuses:OrderStatus[];paymentStatus:string;period:string;start:string;end:string}
export interface OrderListState {filters:OrderFilters;cursors:(string|null)[];scroll:number}
export const blankFilters=():OrderFilters=>({search:'',statuses:[],paymentStatus:'',period:'all',start:'',end:''});
export const initialOrderList=():OrderListState=>({filters:blankFilters(),cursors:[null],scroll:0});
export function orderQuery(filters:OrderFilters):Record<string,unknown> {
 const search=filters.search.trim().toUpperCase();
 if(search&&!/^PS-[A-Z0-9_-]+$/.test(search))throw new ProductError('invalid','Enter the complete PS- order reference.');
 let range;
 if(filters.period==='custom')range=customRange(filters.start,filters.end);
 else if(['today','week','month'].includes(filters.period))range=periodRange(filters.period as 'today'|'week'|'month');
 return {...(search?{search}:{}),...(filters.statuses.length===1?{status:filters.statuses[0]}:filters.statuses.length?{statuses:filters.statuses}:{}),...(filters.paymentStatus?{paymentStatus:filters.paymentStatus}:{}),...(range?{from:range.from,to:range.to}:{})};
}
export function orderListProjection(order:Pick<OrderRecord,'id'|'reference'|'status'|'revision'|'createdAt'|'totalPaise'|'address'|'paymentStatus'>):OrderListItem {
 const raw=(order as {collectedPaise?:number}).collectedPaise;
 if(!/^\d+$/.test(String(order.totalPaise))||(raw!==undefined&&(!Number.isSafeInteger(raw)||raw<0)))throw new ProductError('schema','Invalid order financial snapshot.');
 return {id:order.id,reference:order.reference,status:order.status,revision:order.revision,createdAt:order.createdAt,totalPaise:String(order.totalPaise),customerName:order.address?.recipientName||'Name not recorded',customerPhone:order.address?.mobileNumber||null,paymentStatus:order.paymentStatus,collectedPaise:String(raw??(order.paymentStatus==='collected'?order.totalPaise:0))};
}
export function codLabel(order:OrderListItem){return order.paymentStatus==='collected'?'COD — Collected':BigInt(order.collectedPaise)>0n?'COD — Part collected':'COD — Due';}
export function pageCsv(items:OrderListItem[]){return '\ufeff'+[['Reference','Placed (Asia/Kolkata)','Customer','Mobile','Total paise','Status','COD status','Recorded collection paise'],...items.map(item=>[item.reference,orderDate(item.createdAt),item.customerName,item.customerPhone||'',item.totalPaise,item.status,codLabel(item),item.collectedPaise])].map(row=>row.map(csvCell).join(',')).join('\r\n');}
export function orderDate(time:number){return Number.isFinite(time)?new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(time):'Date not recorded';}

export const periods=[['all','All dates'],['today','Today'],['week','Last 7 days'],['month','This month'],['custom','Custom dates']];
