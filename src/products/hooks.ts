import {useCallback,useEffect,useRef,useState} from 'react';
import {useRead} from '../loading/useRead.ts';
import {boundedRead} from '../loading/request.ts';
import type {DiscoveryFacets} from './discovery.ts';
import {publicCatalog,publicProduct} from './client.ts';
import {type PublicProductRecord,ProductError} from './model.ts';
export function usePublicCatalog(options:Record<string,string>={},enabled=true){
 const key=JSON.stringify(options),[state,setState]=useState<{key:string;items:PublicProductRecord[];cursor:string|null;total?:number;facets?:DiscoveryFacets;busy:boolean;loaded:boolean;error?:unknown}>({key,items:[],cursor:null,busy:true,loaded:false});
 const run=useRef<(more?:boolean)=>void>(()=>{}),failedMore=useRef(false);
 useEffect(()=>{let live=true,busy=false,queued=false,controller:AbortController;let saved={items:[] as PublicProductRecord[],cursor:null as string|null,loaded:false,total:undefined as number|undefined,facets:undefined as DiscoveryFacets|undefined};
  async function load(more=false){if(!enabled||busy||!live)return;busy=true;controller=new AbortController();setState({key,...saved,busy:true});
   try{const next=await boundedRead(async signal=>{let page=await publicCatalog(more?saved.cursor||undefined:undefined,options,signal),items=page.items;
     // A background read restores the already loaded extent using fresh cursors.
     if(!more)while(page.nextCursor&&items.length<saved.items.length){page=await publicCatalog(page.nextCursor,options,signal);items=[...items,...page.items];}
     return {...page,items};},controller.signal,15000);
    if(live){saved={items:more?[...new Map([...saved.items,...next.items].map(p=>[p.id,p])).values()]:next.items,cursor:next.nextCursor,total:next.total,facets:next.facets,loaded:true};failedMore.current=false;setState({key,...saved,busy:false});}}
   catch(error){if(live){failedMore.current=more;setState({key,...saved,busy:false,error});}}
   finally{busy=false;if(queued&&live){queued=false;void load();}}
  }
  run.current=load;if(enabled)void load();const refresh=()=>{if(document.visibilityState==='visible'){if(busy)queued=true;else void load();}};const interval=setInterval(refresh,30000);window.addEventListener('focus',refresh);window.addEventListener('online',refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{live=false;controller?.abort();clearInterval(interval);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[key,enabled]);
 const current=state.key===key?state:undefined;
 return {items:current?.items||[],total:current?.total,facets:current?.facets,hasLoaded:!!current?.loaded,error:current?.error,state:(!current||!current.loaded&&current.busy?'loading':current.loaded?'ready':'error') as 'loading'|'ready'|'error',busy:current?.busy??true,hasMore:!!current?.cursor,retry:useCallback(()=>run.current(failedMore.current),[]),loadMore:()=>run.current(true)};
}
export function usePublicProduct(slug:string){const r=useRead('product:'+slug,signal=>publicProduct(slug,signal),{interval:30000});return {...r,product:r.error instanceof ProductError&&r.error.code==='not-found'?undefined:r.data,status:(r.error instanceof ProductError&&r.error.code==='not-found'?'not-found':r.data?'ready':r.status) as 'loading'|'error'|'not-found'|'ready'};}
