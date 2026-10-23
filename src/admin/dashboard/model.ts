import {ProductError} from '../../products/model.ts';
import {transitions,type OrderStatus} from '../../orders/model.ts';

export type Period='today'|'week'|'month'|'custom';
export interface DashboardRange {period:Period;from:number;to:number;start:string;end:string}
const day=86400000,offset=19800000;
export function indiaDate(time=Date.now()){return new Date(time+offset).toISOString().slice(0,10);}
export function customRange(start:string,end:string):DashboardRange {
 const valid=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
 if(!valid(start)||!valid(end)||start>end)throw new ProductError('invalid','Choose valid From and Through dates in order.');
 const from=Date.parse(start)-offset,to=Date.parse(end)-offset+day-1;
 dashboardBounds(from,to);return {period:'custom',from,to,start,end};
}
export function periodRange(period:Exclude<Period,'custom'>,time=Date.now()):DashboardRange {
 const today=indiaDate(time),end=period==='month'?new Date(Date.UTC(Number(today.slice(0,4)),Number(today.slice(5,7)),0)).toISOString().slice(0,10):today,start=period==='today'?today:period==='month'?today.slice(0,8)+'01':indiaDate(time-6*day);
 return {...customRange(start,end),period};
}
export function dashboardBounds(from:unknown,to:unknown){if(!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||(from as number)<0||(to as number)>253402300799999||(from as number)>(to as number))throw new ProductError('invalid','Choose a valid date range.');}
export interface DashboardOrder {id:string;reference:string;status:OrderStatus;revision:number;createdAt:number;totalPaise:string;customerName:string;customerPhone:string|null}
export interface DashboardBacklog {toPack:number;processing:number;duePaise:number;updatedAt:number}
export interface StockProduct {id:string;name:string;revision:number;imageUrl?:string;threshold:number;inventory:{mode:'simple'|'variants';quantity?:number;variants?:{id:string;name:string;quantity:number}[]}}
export interface StockLine {id:string;productId:string;name:string;imageUrl?:string;variantName:string;quantity:number;threshold:number}
export function lowStockLines(products:StockProduct[]):StockLine[]{return products.flatMap(product=>(product.inventory.mode==='simple'?[{id:'simple',name:'Standard',quantity:product.inventory.quantity??0}]:product.inventory.variants||[]).filter(variant=>variant.quantity<=product.threshold).map(variant=>({id:product.id+'-'+variant.id,productId:product.id,name:product.name,imageUrl:product.imageUrl,variantName:variant.name,quantity:variant.quantity,threshold:product.threshold})));}
export const bulkCommands=['Confirmed','Processing'] as const;
export function bulkEligible(order:Pick<DashboardOrder,'status'>){return bulkCommands.some(command=>transitions[order.status].includes(command));}
export function commonCommands(orders:DashboardOrder[]){return bulkCommands.filter(command=>orders.length>0&&orders.every(order=>transitions[order.status].includes(command)));}
export const statusLabel=(status:OrderStatus)=>status==='Placed'?'New':status==='Confirmed'?'To Pack':status;
