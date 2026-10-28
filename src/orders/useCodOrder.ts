import {useEffect,useRef,useState} from 'react';
import {useCustomerAuth} from '../customer/CustomerAuth.tsx';
import type {CheckoutReview} from '../delivery/model.ts';
import {customerAction} from './client.ts';
import type {OrderRecord} from './model.ts';
import {ProductError} from '../products/model.ts';
type Outcome={order?:OrderRecord;changed?:boolean;review?:CheckoutReview};
export function useCodOrder(review:CheckoutReview|undefined,onReview:(review:CheckoutReview)=>void,onNavigate:(path:string)=>void,flowId='bag'){
 const mounted=useRef(true);useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const {user}=useCustomerAuth(),uid=user?.uid||'',lock=useRef(false),latest=useRef(uid);latest.current=uid;
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[pending,setPending]=useState<Record<string,unknown>|null>(null);
 const key='parinaya:cod-pending:'+uid+(flowId==='bag'?'':':'+flowId);
 useEffect(()=>{let live=true;setPending(null);setError('');if(!uid)return;try{const raw=localStorage.getItem(key);if(raw){const body=JSON.parse(raw);if(typeof body.operationId!=='string'||!/^[a-f0-9]{32}$/.test(body.operationId))throw new Error();setPending(body);void customerAction<Outcome>(uid,{action:'orders:recover',operationId:body.operationId}).then(result=>{if(live&&result.order){localStorage.removeItem(key);onNavigate('/order-confirmed/'+result.order.id);}}).catch(()=>{if(live)setError('A previous order needs confirmation. Retry safely or open My orders.');});}}catch{setError('Order recovery storage is unavailable. Enable site storage before placing an order.');}return()=>{live=false;};},[uid,key]);
 async function place(){
  if(lock.current||!uid||(!pending&&(!review?.valid||review.shipping.state!=='ready')))return;lock.current=true;setBusy(true);setError('');
  const body=pending||{action:'orders:place',addressId:review!.address!.id,couponCode:review!.couponCode||null,fingerprint:review!.fingerprint,source:review!.source||{kind:'bag'},points:review!.loyalty?.requestedPoints??0,operationId:crypto.randomUUID().replaceAll('-','')};
  try{localStorage.setItem(key,JSON.stringify(body));setPending(body);const result=await customerAction<Outcome>(uid,body);if(!mounted.current||latest.current!==uid)return;
   if(result.order){localStorage.removeItem(key);setPending(null);onNavigate('/order-confirmed/'+result.order.id);}
   else if(result.changed&&result.review){localStorage.removeItem(key);setPending(null);onReview(result.review);setError('Checkout changed. Review the updated amounts and items, then confirm again.');}
  }catch(failure){
   // A definitive validation/access rejection can be corrected, but first check
   // whether this operation already produced an order. Network failures retain
   // the durable pending request and its original idempotency key.
   if(failure instanceof ProductError&&['invalid','permission','conflict'].includes(failure.code))try{const recovered=await customerAction<Outcome>(uid,{action:'orders:recover',operationId:body.operationId});if(!mounted.current||latest.current!==uid)return;if(recovered.order){localStorage.removeItem(key);setPending(null);onNavigate('/order-confirmed/'+recovered.order.id);return;}localStorage.removeItem(key);setPending(null);}catch{}
   if(mounted.current&&latest.current===uid)setError(failure instanceof Error?failure.message:'Unable to confirm your order. Retry safely.');
  }finally{lock.current=false;if(mounted.current&&latest.current===uid)setBusy(false);}
 }
 return {place,busy,error,pending:!!pending};
}
