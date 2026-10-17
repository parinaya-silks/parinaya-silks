import { useEffect,useRef,useState } from 'react';
import { publicCatalog,publicProduct } from './client.ts';
import { ProductError,type ProductRecord } from './model.ts';
export function usePublicCatalog() {
  const [items,setItems]=useState<ProductRecord[]>([]),[state,setState]=useState<'loading'|'ready'|'error'>('loading'),[cursor,setCursor]=useState<string|null>(null),[busy,setBusy]=useState(false);
  const generation=useRef(0),lock=useRef(false);
  const load=async(more=false)=>{if(lock.current)return;lock.current=true;setBusy(true);const current=++generation.current;if(!more)setState('loading');try{const result=await publicCatalog(more?cursor||undefined:undefined);if(current===generation.current){setItems(previous=>more?[...previous,...result.items.filter(item=>!previous.some(old=>old.id===item.id))]:result.items);setCursor(result.nextCursor);setState('ready');}}catch{if(current===generation.current)setState('error');}finally{lock.current=false;setBusy(false);}};
  useEffect(()=>{void load();const refresh=()=>{if(document.visibilityState==='visible')void load();};window.addEventListener('focus',refresh);const interval=setInterval(refresh,30000);return()=>{generation.current++;window.removeEventListener('focus',refresh);clearInterval(interval);};},[]);
  return {items:state==='ready'?items:[],state,busy,hasMore:Boolean(cursor),retry:()=>load(),loadMore:()=>load(true)};
}
export function usePublicProduct(slug:string) {
  const [state,setState]=useState<{status:'loading'|'error'|'not-found'|'ready';product?:ProductRecord}>({status:'loading'}),[attempt,setAttempt]=useState(0);
  useEffect(()=>{let active=true;async function load(){setState({status:'loading'});try{const product=await publicProduct(slug);if(active)setState({status:'ready',product});}catch(error){if(active)setState({status:error instanceof ProductError && error.code==='not-found'?'not-found':'error'});}}void load();const interval=setInterval(()=>void load(),30000);const focus=()=>void load();window.addEventListener('focus',focus);return()=>{active=false;clearInterval(interval);window.removeEventListener('focus',focus);};},[slug,attempt]);
  return {...state,retry:()=>setAttempt(value=>value+1)};
}
