import {ProductError} from '../products/model.ts';
import {useEffect,useRef,useState} from 'react';
import {useCustomerAuth} from '../customer/CustomerAuth.tsx';
import {paymentRequest,loadCheckout,type PaymentResult} from './client.ts';
import {paymentMessage} from './model.ts';
import type {CheckoutReview} from '../delivery/model.ts';

export function useOnlinePayment(review:CheckoutReview|undefined,onNavigate:(path:string)=>void,flow:string){
 const {user}=useCustomerAuth(),uid=user?.uid||'',current=useRef(uid);current.current=uid;
 const [available,setAvailable]=useState(false),[mode,setMode]=useState(''),[busy,setBusy]=useState(false),[checking,setChecking]=useState(true),[pending,setPending]=useState(false),[message,setMessage]=useState('');
 const lock=useRef(false),key='parinaya:payment:'+uid+':'+flow;
 const readAttempt=()=>{try{return localStorage.getItem(key);}catch{return null;}};
 const clearAttempt=()=>{try{localStorage.removeItem(key);localStorage.removeItem(key+':order');}catch{}};
 const openOrder=(r:PaymentResult)=>{if(r.payment.state==='CAPTURED'||r.payment.state==='CANCELLED'&&r.payment.reservation==='released'){clearAttempt();}if(r.id)onNavigate((r.payment.state==='CAPTURED'?'/order-confirmed/':'/order-tracking/')+r.id);};
 useEffect(()=>{let live=true;setChecking(true);setAvailable(false);setPending(false);if(!uid){setChecking(false);return;}
  void (async()=>{try{
   const c=await paymentRequest<{online:boolean;mode?:string}>(uid,'capabilities');if(!live)return;setAvailable(c.online);setMode(c.mode||'');
   const operationId=readAttempt(),r=await paymentRequest<PaymentResult>(uid,'status',operationId?{operationId}:{});
   if(live&&r.id){setPending(true);openOrder(r);}
  }catch(error){if(live&&readAttempt()&&!(error instanceof ProductError&&error.code==='not-found')){setPending(true);setMessage(error instanceof Error?error.message:'Check your payment status in My Orders.');}}
  finally{if(live)setChecking(false);}})();return()=>{live=false;};
 },[uid,key]);
 async function pay(){
  if(lock.current||!uid||!review||!available)return;lock.current=true;setBusy(true);setMessage('');const target=uid;
  try{
   let operationId=readAttempt();if(!operationId){operationId=crypto.randomUUID().replaceAll('-','');localStorage.setItem(key,operationId);}
   if(pending){const r=await paymentRequest<PaymentResult>(uid,'status',{operationId});if(current.current===target)openOrder(r);return;}
   setPending(true);
   const r=await paymentRequest<PaymentResult>(uid,'create-order',{operationId,addressId:review.address!.id,couponCode:review.couponCode||null,fingerprint:review.fingerprint,source:review.source||{kind:'bag'},points:review.loyalty?.requestedPoints??0});
   if(current.current!==target)return;
   if(r.id)localStorage.setItem(key+':order',r.id);
   if(r.changed){localStorage.removeItem(key);setPending(false);setMessage('Checkout changed. Refresh your checkout review and approve the updated totals.');return;}
   if(!r.checkout){setMessage(paymentMessage(r.payment));openOrder(r);return;}
   await loadCheckout();if(current.current!==target)return;
   const checkout=new window.Razorpay!({...r.checkout,name:'Parinaya Sarees',description:r.checkout.mode==='test'?'TEST PAYMENT — no live charge':'Order '+r.reference,theme:{color:'#780D24'},retry:{enabled:false},
    handler:async(response:Record<string,string>)=>{setBusy(true);try{const outcome=await paymentRequest<PaymentResult>(target,'verify',{id:r.id,razorpay_order_id:response.razorpay_order_id,razorpay_payment_id:response.razorpay_payment_id,razorpay_signature:response.razorpay_signature});if(current.current===target)openOrder(outcome);}catch{if(current.current===target)onNavigate('/order-tracking/'+r.id);}finally{if(current.current===target)setBusy(false);}},
    modal:{ondismiss:()=>{if(current.current!==target)return;setMessage('You closed the payment window. Your payment status is being checked.');onNavigate('/order-tracking/'+r.id);}},
   });checkout.on('payment.failed',()=>{if(current.current===target)onNavigate('/order-tracking/'+r.id);});checkout.open();
  }catch(error){if(error instanceof ProductError&&['invalid','conflict','permission'].includes(error.code)){try{await paymentRequest(uid,'status',{operationId:readAttempt()});}catch(check){if(check instanceof ProductError&&check.code==='not-found'){localStorage.removeItem(key);setPending(false);}}}if(current.current===target)setMessage(error instanceof Error?error.message:'Unable to confirm payment. Please do not pay again.');}
  finally{lock.current=false;if(current.current===target)setBusy(false);}
 }
 return {available,mode,busy,checking,pending,message,pay};
}
