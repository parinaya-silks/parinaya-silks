import {createHmac,timingSafeEqual} from 'node:crypto';
import {ProductError} from '../../src/products/model.ts';
import type {PaymentConfig} from './config.ts';

export function signatureMatches(secret:string,body:Buffer|string,signature:unknown){
 if(typeof signature!=='string'||!/^[a-f0-9]{64}$/.test(signature))return false;
 return timingSafeEqual(createHmac('sha256',secret).update(body).digest(),Buffer.from(signature,'hex'));
}
export interface ProviderOrder {id:string;receipt:string;amount:number;currency:string;status:string;amount_paid:number;notes?:Record<string,string>}
export interface ProviderPayment {id:string;order_id:string;amount:number;currency:string;status:string;captured:boolean;method:string;created_at:number;amount_refunded:number}
export interface ProviderRefund {id:string;payment_id:string;amount:number;currency:string;status:string;created_at:number}
export interface PaymentProvider {
 create(amount:number,receipt:string):Promise<ProviderOrder>;
 order(id:string):Promise<ProviderOrder>;
 payments(id:string):Promise<ProviderPayment[]>;
 payment(id:string):Promise<ProviderPayment>;
 refunds(id:string):Promise<ProviderRefund[]>;
 find(receipt:string,from:number):Promise<ProviderOrder[]>;
}
export function razorpayProvider(config:PaymentConfig,send:typeof fetch=fetch):PaymentProvider {
 const deadline=Date.now()+15000;
 async function request(path:string,body?:unknown){
  // Never log provider responses: error descriptions and entities may contain PII.
  const remaining=deadline-Date.now();if(remaining<1)throw new ProductError('unavailable','Payment reconciliation is pending.');
  let response:Response;try{response=await send('https://api.razorpay.com/v1/'+path,{method:body?'POST':'GET',headers:{Authorization:'Basic '+Buffer.from(config.keyId+':'+config.keySecret).toString('base64'),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(Math.min(8000,remaining))});}catch{throw new ProductError('unavailable','The payment provider could not be reached. Check the existing payment status before trying again.');}
  if(!response.ok)throw new ProductError('unavailable','The payment provider could not confirm this request.');
  try{return await response.json();}catch{throw new ProductError('unavailable','The payment provider returned an unreadable response.');}
 }
 const safe=(id:string,prefix:string)=>{if(!new RegExp('^'+prefix+'_[A-Za-z0-9]{1,80}$').test(id))throw new ProductError('invalid','Invalid payment reference.');return id;};
 async function all(path:string){const rows:any[]=[];for(let skip=0;skip<1000;skip+=100){const page=await request(path+(path.includes('?')?'&':'?')+'count=100&skip='+skip);if(!Array.isArray(page.items))throw new ProductError('unavailable','Payment reconciliation is incomplete.');rows.push(...page.items);if(page.items.length<100)return rows;}throw new ProductError('unavailable','Payment reconciliation requires an administrator review.');}
 return {
  create:async(amount,receipt)=>{if(!Number.isSafeInteger(amount)||amount<100||!/^[a-f0-9]{32}$/.test(receipt))throw new ProductError('invalid','Invalid trusted payment amount or reference.');return request('orders',{amount,currency:'INR',receipt,partial_payment:false,notes:{internalOrderId:receipt}});},
  order:id=>request('orders/'+safe(id,'order')),
  payments:id=>all('orders/'+safe(id,'order')+'/payments'),
  payment:id=>request('payments/'+safe(id,'pay')),
  refunds:id=>all('payments/'+safe(id,'pay')+'/refunds'),
  // A bounded, fully paginated time window avoids assuming unsupported receipt filters.
  find:async(receipt,from)=>(await all('orders?from='+Math.max(0,Math.floor(from/1000)-60)+'&to='+Math.floor(Date.now()/1000))).filter(o=>o.receipt===receipt),
 };
}
