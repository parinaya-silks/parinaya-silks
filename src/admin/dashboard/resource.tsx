import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {getAdminClients} from '../../services/firebase/adminAuth.ts';
import {catalogAction} from '../../products/client.ts';
import {ProductError} from '../../products/model.ts';
import {adminChangedEvent} from '../changeSignal.ts';

const Pulse=createContext(0);
export function AdminDataProvider({children}:{children:React.ReactNode}){
 const [pulse,setPulse]=useState(0),uid=getAdminClients().auth.currentUser?.uid||'';
 useEffect(()=>{
  let debounce:ReturnType<typeof setTimeout>,last=Date.now(),pending=false;
  const refresh=()=>{if(document.visibilityState!=='visible'){pending=true;return;}clearTimeout(debounce);debounce=setTimeout(()=>{pending=false;last=Date.now();setPulse(value=>value+1);},200);};
  const visible=()=>{if(pending||Date.now()-last>5000)refresh();};
  const changed=(event:Event)=>{if((event as CustomEvent).detail===uid)refresh();};
  const channel=typeof BroadcastChannel==='undefined'?null:new BroadcastChannel('parinaya-admin:'+uid);if(channel)channel.onmessage=event=>{if(event.data==='changed')refresh();};
  const timer=setInterval(refresh,30000);window.addEventListener(adminChangedEvent,changed);window.addEventListener('focus',visible);document.addEventListener('visibilitychange',visible);
  return()=>{clearTimeout(debounce);clearInterval(timer);channel?.close();window.removeEventListener(adminChangedEvent,changed);window.removeEventListener('focus',visible);document.removeEventListener('visibilitychange',visible);};
 },[uid]);
 return <Pulse.Provider value={pulse}>{children}</Pulse.Provider>;
}
export function useAdminResource<T>(body:Record<string,unknown>,message:string){
 const uid=getAdminClients().auth.currentUser?.uid||'',key=JSON.stringify([uid,body]),pulse=useContext(Pulse),[attempt,setAttempt]=useState(0);
 const [state,setState]=useState<{key:string;data?:T;error?:string;errorCode?:string;refreshing:boolean;updatedAt?:number}>();
 const flight=useRef<{key:string;controller:AbortController}|null>(null),generation=useRef(0),queued=useRef(false);
 useEffect(()=>()=>{generation.current++;queued.current=false;flight.current?.controller.abort();flight.current=null;},[key]);
 useEffect(()=>{
  if(!uid)return;if(flight.current?.key===key){queued.current=true;return;}const controller=new AbortController(),run=++generation.current;flight.current={key,controller};
  setState(old=>old?.key===key?{...old,error:undefined,errorCode:undefined,refreshing:true}:{key,refreshing:true});
  void catalogAction<T>(body,controller.signal).then(data=>{if(generation.current===run)setState({key,data,refreshing:false,updatedAt:Date.now()});}).catch(error=>{
   if(generation.current!==run||controller.signal.aborted)return;
   const denied=error instanceof ProductError&&['unauthorized','permission'].includes(error.code);
   setState(old=>({key,...(!denied&&old?.key===key?{data:old.data,updatedAt:old.updatedAt}:{}),refreshing:false,errorCode:error instanceof ProductError?error.code:'unavailable',error:denied?'Administrator access must be checked again.':message}));
   if(denied)window.dispatchEvent(new CustomEvent('parinaya:admin-api-denied',{detail:uid}));
  }).finally(()=>{if(generation.current===run){flight.current=null;if(queued.current){queued.current=false;setAttempt(value=>value+1);}}});
 },[key,pulse,attempt]);
 const current=state?.key===key?state:undefined;
 return {data:current?.data,error:current?.error,errorCode:current?.errorCode,refreshing:current?.refreshing??true,updatedAt:current?.updatedAt,retry:()=>setAttempt(value=>value+1)};
}
