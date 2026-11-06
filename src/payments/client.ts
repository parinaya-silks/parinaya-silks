import {getAuthClients} from '../services/firebase/auth.ts';
import {ProductError} from '../products/model.ts';
import type {OrderPayment} from './model.ts';
export interface PaymentResult {id:string;reference:string;status:string;payment:OrderPayment;checkout?:{key:string;order_id:string;amount:number;currency:'INR';mode:'test'|'live'};changed?:boolean;review?:unknown;active?:null}
export async function paymentRequest<T=PaymentResult>(uid:string,action:string,body:Record<string,unknown>={},signal?:AbortSignal):Promise<T>{
 const {auth}=getAuthClients(),user=auth.currentUser;if(!user||user.uid!==uid)throw new ProductError('unauthorized','Sign in again to continue.');
 const token=await user.getIdToken();if(auth.currentUser?.uid!==uid)throw new ProductError('unauthorized','Your account changed.');
 const get=['status','capabilities'].includes(action),query=get?new URLSearchParams(Object.entries(body).map(([k,v])=>[k,String(v)])).toString():'';
 let response:Response;try{response=await fetch('/api/payments/'+action+(query?'?'+query:''),{method:get?'GET':'POST',headers:{Authorization:'Bearer '+token,...(!get?{'Content-Type':'application/json'}:{})},...(!get?{body:JSON.stringify(body)}:{}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(25000)]):AbortSignal.timeout(25000)});}catch{throw new ProductError('unavailable','We could not confirm your payment yet. Please do not pay again. Check payment status shortly.');}
 let data:any;try{data=await response.json();}catch{throw new ProductError('unavailable','Payment status is unavailable. Please do not pay again.');}
 if(auth.currentUser?.uid!==uid)throw new ProductError('unauthorized','Your account changed.');
 if(!response.ok)throw new ProductError(data.code||'unavailable',response.status>=500?'We could not confirm your payment yet. Please do not pay again. Check payment status shortly.':data.message||'Payment request failed.');
 if(data.id&&data.payment&&(data.payment.state==='CAPTURED'||data.payment.state==='CANCELLED'&&data.payment.reservation==='released')){try{for(const key of Object.keys(localStorage)){if(key.startsWith('parinaya:payment:'+uid+':')&&key.endsWith(':order')&&localStorage.getItem(key)===data.id){localStorage.removeItem(key.slice(0,-6));localStorage.removeItem(key);}}}catch{}}
 return data as T;
}
interface Checkout {open():void;on(event:string,callback:()=>void):void}
declare global {interface Window {Razorpay?:new(options:Record<string,unknown>)=>Checkout}}
let script:Promise<void>|undefined;
export function loadCheckout(){
 if(window.Razorpay)return Promise.resolve();
 if(!script)script=new Promise<void>((resolve,reject)=>{const element=document.createElement('script');element.src='https://checkout.razorpay.com/v1/checkout.js';element.async=true;const timer=setTimeout(()=>{element.remove();reject(Error('Payment window could not load. Check payment status before trying again.'));},12000);element.onload=()=>{clearTimeout(timer);window.Razorpay?resolve():reject(Error('Payment window is unavailable.'));};element.onerror=()=>{clearTimeout(timer);element.remove();reject(Error('Payment window was blocked. Check payment status before trying again.'));};document.head.appendChild(element);}).catch(error=>{script=undefined;throw error;});
 return script;
}
