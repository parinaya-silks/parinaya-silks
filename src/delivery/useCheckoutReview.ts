import {useEffect,useRef,useState} from 'react';
import {doc,onSnapshot} from 'firebase/firestore';
import {getAuthClients} from '../services/firebase/auth.ts';
import type {Shopping} from '../shopping/useShopping.ts';
import type {AddressBookState} from './useAddressBook.ts';
import type {CheckoutReview} from './model.ts';
import {deliveryAction} from './client.ts';

export function useCheckoutReview(shopping:Shopping,book:AddressBookState,selected:string){
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
  const bagKey=JSON.stringify(shopping.bag.map(item=>[item.id,item.quantity,item.product?.pricePaise,item.product?.status,item.stock,item.reason]));
  const key=JSON.stringify([uid,selected,book.addresses.find(address=>address.id===selected)?.revision,book.status,shopping.status,bagKey,shippingSignal.uid===uid?shippingSignal.value:'loading',attempt]);
  const latest=useRef(key);latest.current=key;
  useEffect(()=>{
    if(!uid||book.status!=='ready'||shopping.status!=='ready')return;
    let live=true;const controller=new AbortController();
    void deliveryAction<CheckoutReview>(uid,{action:'checkout:review',addressId:selected||null},controller.signal).then(value=>{
      if(!live||latest.current!==key)return;
      const prior=previousShipping.current;
      const shippingChanged=!!prior&&prior.uid===uid&&value.shipping.state==='ready'&&(prior.revision!==value.shipping.revision||prior.fee!==value.shipping.shippingPaise||prior.total!==value.shipping.totalPaise);
      previousShipping.current={uid,revision:value.shipping.revision,fee:value.shipping.shippingPaise,total:value.shipping.totalPaise};
      setResult({key,status:'ready',value,shippingChanged});
      // First observation after a hard refresh has no prior displayed price.
      for(const item of value.items)if(item.product&&!baseline.current.prices.has(item.id))baseline.current.prices.set(item.id,item.product.pricePaise);
    }).catch(error=>{if(live&&latest.current===key)setResult({key,status:'error',error:error instanceof Error?error.message:'Unable to load checkout review.'});});
    return()=>{live=false;controller.abort();};
  },[key,uid,selected,book.status,shopping.status]);
  const current=result?.key===key?result:undefined;
  const changes=current?.value?.items.filter(item=>item.product&&baseline.current.prices.has(item.id)&&baseline.current.prices.get(item.id)!==item.product.pricePaise).map(item=>({id:item.id,name:item.product!.name,previous:baseline.current.prices.get(item.id)!,current:item.product!.pricePaise}))||[];
  return {status:current?.status||'loading',review:current?.value,error:current?.error,shippingChanged:current?.shippingChanged||false,changes,priceAcknowledged:!!current?.value&&accepted===current.value.fingerprint,
    retry:()=>setAttempt(value=>value+1),acceptPrices:()=>{if(current?.value){setAccepted(current.value.fingerprint);for(const item of current.value.items)if(item.product)baseline.current.prices.set(item.id,item.product.pricePaise);}}};
}
