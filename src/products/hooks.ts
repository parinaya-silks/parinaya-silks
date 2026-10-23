import {useCallback,useEffect,useRef,useState} from 'react';
import {publicCatalog,publicProduct} from './client.ts';
import {ProductError,type PublicProductRecord} from './model.ts';

export function usePublicCatalog(options:Record<string,string>={},enabled=true) {
  const optionsKey=JSON.stringify(options);const [dataKey,setDataKey]=useState(optionsKey);
  const [items,setItems]=useState<PublicProductRecord[]>([]),[state,setState]=useState<'loading'|'ready'|'error'>('loading'),[cursor,setCursor]=useState<string|null>(null),[busy,setBusy]=useState(false);
  const generation=useRef(0),lock=useRef(false),ready=useRef(false),cursorRef=useRef<string|null>(null);
  const load=useCallback(async(more=false)=>{
    if(!enabled||lock.current)return;
    lock.current=true;setBusy(true);
    const current=++generation.current;
    if(!more&&!ready.current)setState('loading');
    try {
      const result=await publicCatalog(more?cursorRef.current||undefined:undefined,options);
      if(current!==generation.current)return;
      setItems(previous=>more?[...previous,...result.items.filter(item=>!previous.some(old=>old.id===item.id))]:result.items);
      cursorRef.current=result.nextCursor;setCursor(result.nextCursor);ready.current=true;setDataKey(optionsKey);setState('ready');
    } catch {if(current===generation.current){ready.current=false;setDataKey(optionsKey);setState('error');}}
    finally{if(current===generation.current){lock.current=false;setBusy(false);}}
  },[optionsKey,enabled]);
  useEffect(()=>{
    if(!enabled)return;
    ready.current=false;cursorRef.current=null;setCursor(null);setState('loading');void load();
    const refresh=()=>{if(ready.current&&document.visibilityState==='visible')void load();};
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    const interval=setInterval(refresh,30000);
    return()=>{generation.current++;lock.current=false;window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);clearInterval(interval);};
  },[load]);
  return {items:state==='ready'&&dataKey===optionsKey?items:[],state:dataKey===optionsKey?state:'loading' as const,busy,hasMore:state==='ready'&&dataKey===optionsKey&&Boolean(cursor),retry:()=>load(),loadMore:()=>load(true)};
}

export function usePublicProduct(slug:string) {
  const [state,setState]=useState<{status:'loading'|'error'|'not-found'|'ready';product?:PublicProductRecord}>({status:'loading'}),[attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let active=true,busy=false;
    setState({status:'loading'});
    async function load(){
      if(busy)return;busy=true;
      try {const product=await publicProduct(slug);if(active)setState({status:'ready',product});}
      catch(error){if(active)setState({status:error instanceof ProductError&&error.code==='not-found'?'not-found':'error'});}
      finally{busy=false;}
    }
    void load();
    const focus=()=>{if(document.visibilityState==='visible')void load();};
    const interval=setInterval(focus,30000);
    window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
    return()=>{active=false;clearInterval(interval);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};
  },[slug,attempt]);
  return {...state,retry:()=>setAttempt(value=>value+1)};
}
