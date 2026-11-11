import {useReconnect} from '../loading/useRead.ts';
import {useEffect,useRef,useState} from 'react';
import {doc,onSnapshot} from 'firebase/firestore';
import {getAuthClients} from '../services/firebase/auth.ts';
import type {Shopping} from '../shopping/useShopping.ts';
import type {AddressBookState} from './useAddressBook.ts';
import type {CheckoutReview} from './model.ts';
import type {CheckoutSource} from '../checkout/source.ts';
import {customerAction} from '../orders/client.ts';

export function useCheckoutReview(shopping:Shopping,book:AddressBookState,selected:string,couponCode:string|null=null,source:CheckoutSource={kind:'bag'},points=0){
  const uid=book.uid;
  const [shippingSignal,setShippingSignal]=useState({uid:'',value:'loading'});
  useEffect(()=>{
    if(!uid)return;let live=true;let stop:(()=>void)|undefined;
    try{stop=onSnapshot(doc(getAuthClients().database,'siteSettings','shippingRevision'),snapshot=>{if(live)setShippingSignal({uid,value:String(snapshot.data()?.revision??'missing')});},()=>{if(live)setShippingSignal({uid,value:'unavailable'});});}catch{setShippingSignal({uid,value:'unavailable'});}
    return()=>{live=false;stop?.();};
  },[uid]);
  const [attempt,setAttempt]=useState(0),[result,setResult]=useState<{key:string;status:'ready'|'error';value?:CheckoutReview;error?:string;shippingChanged?:boolean}>();
  const previousShipping=useRef<{uid:string;revision:number|null;fee:string|null;total:string|null}|null>(null);
  const [accepted,setAccepted]=useState('');
  const baseline=useRef<{uid:string;prices:Map<string,number>}>({uid,prices:new Map(shopping.bag.filter(item=>item.product).map(item=>[item.id,item.product!.pricePaise]))});
  if(baseline.current.uid!==uid)baseline.current={uid,prices:new Map()};
  const bagKey=source.kind==='buy-now'?JSON.stringify(source):JSON.stringify(shopping.bag.map(item=>[item.id,item.quantity,item.product?.pricePaise,item.product?.status,item.stock,item.reason]));
  const key=JSON.stringify([uid,selected,couponCode,points,book.addresses.find(address=>address.id===selected)?.revision,book.status,source.kind==='bag'?[shopping.status,shopping.pendingBag]:'ready',bagKey,shippingSignal.uid===uid?shippingSignal.value:'loading',attempt]);
  const identity=JSON.stringify([uid,selected,book.addresses.find(a=>a.id===selected)?.revision,couponCode,points,source,bagKey,shippingSignal.uid===uid?shippingSignal.value:'loading']),last=useRef<{identity:string;value:CheckoutReview}|undefined>(undefined);
  const latest=useRef(key);latest.current=key;
  useEffect(()=>{
    if(!uid||book.status!=='ready'||source.kind==='bag'&&(shopping.status!=='ready'||shopping.pendingBag))return;
    let live=true;const controller=new AbortController();
    const cachedQuote=last.current?.identity===identity&&Number(last.current.value.shipping.expiresAt)>Date.now()+30000?last.current.value.shipping.quoteId:undefined;
    void customerAction<CheckoutReview>(uid,{action:'orders:review',addressId:selected||null,couponCode,source,points,...(cachedQuote?{deliveryQuoteId:cachedQuote}:{})},controller.signal).then(value=>{
      if(!live||latest.current!==key)return;
      const prior=previousShipping.current;
      const shippingChanged=!!prior&&prior.uid===uid&&value.shipping.state==='ready'&&(prior.revision!==value.shipping.revision||prior.fee!==value.shipping.shippingPaise||prior.total!==value.shipping.totalPaise);
      previousShipping.current={uid,revision:value.shipping.revision,fee:value.shipping.shippingPaise,total:value.shipping.totalPaise};
      last.current={identity,value};setResult({key,status:'ready',value,shippingChanged});
      // First observation after a hard refresh has no prior displayed price.
      for(const item of value.items)if(item.product&&!baseline.current.prices.has(item.id))baseline.current.prices.set(item.id,item.product.pricePaise);
    }).catch(error=>{if(live&&latest.current===key){if(cachedQuote&&(error as {code?:string}).code==='conflict')last.current=undefined;setResult({key,status:'error',error:error instanceof Error?error.message:'Unable to load checkout review.'});}});
    return()=>{live=false;controller.abort();};
  },[key,uid,selected,book.status,shopping.status]);
  useEffect(()=>{const expires=result?.value?.shipping.expiresAt;if(!expires)return;const timer=setTimeout(()=>setAttempt(n=>n+1),Math.max(1000,expires-Date.now()-15000));return()=>clearTimeout(timer);},[result?.value?.shipping.expiresAt]);
  useReconnect(()=>setAttempt(n=>n+1),!!uid);
  const current=result?.key===key?result:undefined,cached=last.current?.identity===identity?last.current.value:undefined;
  const changes=current?.value?.items.filter(item=>item.product&&baseline.current.prices.has(item.id)&&baseline.current.prices.get(item.id)!==item.product.pricePaise).map(item=>({id:item.id,name:item.product!.name,previous:baseline.current.prices.get(item.id)!,current:item.product!.pricePaise}))||[];
  const dependencyError=book.status==='error'||source.kind==='bag'&&shopping.status==='error';
  return {status:dependencyError?'error':current?.status||'loading',review:current?.value||cached,error:dependencyError?'Unable to refresh checkout information. Please try again.':current?.error,shippingChanged:current?.shippingChanged||false,changes,priceAcknowledged:!!current?.value&&accepted===current.value.fingerprint,
    applyReview:(value:CheckoutReview)=>setResult({key,status:'ready',value,shippingChanged:true}),retry:()=>{if(book.status==='error')void book.reload();if(source.kind==='bag'&&shopping.status==='error')void shopping.retry();setAttempt(value=>value+1);},acceptPrices:()=>{if(current?.value){setAccepted(current.value.fingerprint);for(const item of current.value.items)if(item.product)baseline.current.prices.set(item.id,item.product.pricePaise);}}};
}
