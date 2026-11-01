import {useCallback,useEffect,useRef,useState} from 'react';
import {boundedRead} from './request.ts';

// Memory belongs to this mounted resource and its exact identity/query only.
// Reconnection invokes reads, never mutation callbacks.
export function useRead<T>(key:string,loader:(signal:AbortSignal)=>Promise<T>,options:{enabled?:boolean;interval?:number|((data:T)=>number)}={}){
 const fn=useRef(loader);fn.current=loader;const config=useRef(options);config.current=options;
 const [state,setState]=useState<{key:string;data?:T;busy:boolean;error?:unknown}>({key,busy:true});
 const run=useRef<()=>void>(()=>{}),enabled=options.enabled!==false;
 useEffect(()=>{let live=true,busy=false,queued=false,timer:ReturnType<typeof setTimeout>,controller:AbortController;let data:T|undefined;
  const schedule=()=>{clearTimeout(timer);const interval=config.current.interval;if(interval&&live)timer=setTimeout(refresh,typeof interval==='function'&&data!==undefined?interval(data):typeof interval==='number'?interval:15000);};
  async function load(){if(!live||busy||!enabled)return;busy=true;clearTimeout(timer);controller=new AbortController();setState({key,data,busy:true});
   try{const value=await boundedRead(s=>fn.current(s),controller.signal);if(live){data=value;setState({key,data,busy:false});}}
   catch(error){if(live)setState({key,data,busy:false,error});}
   finally{busy=false;if(queued&&live){queued=false;void load();}else schedule();}
  }
  function refresh(){if(document.visibilityState==='visible'){if(busy)queued=true;else void load();}else schedule();}
  run.current=()=>void load();if(enabled)void load();
  window.addEventListener('online',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{live=false;clearTimeout(timer);controller?.abort();window.removeEventListener('online',refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[key,enabled]);
 const retry=useCallback(()=>run.current(),[]),current=state.key===key?state:undefined;
 return {data:current?.data,hasLoaded:current?.data!==undefined,busy:current?.busy??true,error:current?.error,status:(!current||current.busy&&current.data===undefined?'loading':current.error?'error':'ready') as 'loading'|'ready'|'error',retry};
}

export function useReconnect(read:()=>unknown,enabled=true){const fn=useRef(read);fn.current=read;useEffect(()=>{if(!enabled)return;let waiting=false;const online=()=>{if(document.visibilityState==='visible')void fn.current();else waiting=true;},visible=()=>{if(waiting&&document.visibilityState==='visible'){waiting=false;void fn.current();}};window.addEventListener('online',online);document.addEventListener('visibilitychange',visible);return()=>{window.removeEventListener('online',online);document.removeEventListener('visibilitychange',visible);};},[enabled]);}
