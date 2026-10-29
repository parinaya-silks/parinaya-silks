import {useCallback,useEffect,useRef,useState} from 'react';
import {collection,limit,onSnapshot,query} from 'firebase/firestore';
import {useCustomerAuth} from '../customer/CustomerAuth.tsx';
import {getAuthClients} from '../services/firebase/auth.ts';
import {catalogResponse} from '../products/response.ts';
import {publicProduct} from '../products/client.ts';
import {ProductError} from '../products/model.ts';
import type {Product} from '../types/index.ts';
import {SHOPPING_LIMIT,type ShoppingData} from './model.ts';
import {shoppingFeedback,type ShoppingNotice} from './feedback.ts';
import {clearIntent,readIntent,saveIntent,shoppingReturn,type ShoppingIntent} from './intent.ts';
type State=ShoppingData&{uid:string;status:'loading'|'ready'|'error';hasLoaded:boolean};
type Issue={uid:string;body:Record<string,unknown>;key:string;message:string;mode:'operation'|'refresh'};
const empty:ShoppingData={bag:[],wishlist:[]};
export function useShopping(path:string,navigate:(path:string)=>void){
 const session=useCustomerAuth(),uid=session.user?.uid||'',active=useRef(uid),location=useRef(path),navigation=useRef(0);active.current=uid;if(location.current!==path){location.current=path;navigation.current++;}
 const [removal,setRemoval]=useState<{uid:string;id:string;name:string}|null>(null);
 const [state,setState]=useState<State>({...empty,uid:'',status:'loading',hasLoaded:false}),[notice,setNotice]=useState<ShoppingNotice|null>(null),[busy,setBusy]=useState<Set<string>>(new Set()),[issues,setIssues]=useState<Record<string,Issue>>({});
 const locks=useRef(new Set<string>()),pending=useRef<Record<string,Issue>>({}),generation=useRef(0),request=useRef(0),serial=useRef(0),mounted=useRef(true),controllers=useRef(new Set<AbortController>());
 const publish=useCallback((value:Omit<ShoppingNotice,'id'>)=>setNotice({...value,id:++serial.current}),[]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;generation.current++;for(const controller of controllers.current)controller.abort();};},[]);
 useEffect(()=>{setNotice(null);setRemoval(null);},[path]);
 const api=useCallback(async<T,>(body:Record<string,unknown>,owner=uid):Promise<T>=>{
  const epoch=generation.current,user=getAuthClients().auth.currentUser;if(!owner||user?.uid!==owner)throw new Error('Sign in again to continue.');const token=await user.getIdToken();if(active.current!==owner||!mounted.current||epoch!==generation.current||getAuthClients().auth.currentUser!==user)throw new Error('Your account changed.');
  const controller=new AbortController();controllers.current.add(controller);const timeout=setTimeout(()=>controller.abort(),20000);
  try{return await catalogResponse(await fetch('/api/catalog',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body),signal:controller.signal}),false);}finally{clearTimeout(timeout);controllers.current.delete(controller);}
 },[uid]);
 const refresh=useCallback(async()=>{
  if(!uid)return false;const attempt=++request.current,epoch=generation.current;
  try{const data=await api<ShoppingData>({action:'shopping:get'},uid);if(mounted.current&&active.current===uid&&epoch===generation.current&&attempt===request.current)setState({...data,uid,status:'ready',hasLoaded:true});return true;}
  catch{if(mounted.current&&active.current===uid&&epoch===generation.current&&attempt===request.current)setState(old=>({...old,...(old.uid!==uid?empty:{}),uid,status:'error'}));return false;}
 },[uid,api]);
 useEffect(()=>{
  generation.current++;for(const controller of controllers.current)controller.abort();locks.current.clear();pending.current={};setIssues({});setBusy(new Set());setNotice(null);setRemoval(null);setState({...empty,uid,status:'loading',hasLoaded:false});if(!uid)return;
  let live=true,timer:ReturnType<typeof setTimeout>|undefined;const changed=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(live)void refresh();},60);};
  const failed=()=>{if(live&&active.current===uid)setState(old=>({...old,uid,status:'error'}));};const stops:(()=>void)[]=[];
  try{const {database}=getAuthClients();for(const kind of ['bag','wishlist'])stops.push(onSnapshot(query(collection(database,'customerShopping',uid,kind),limit(SHOPPING_LIMIT+1)),changed,failed));}catch{failed();}
  void refresh();return()=>{live=false;clearTimeout(timer);for(const stop of stops)stop();generation.current++;};
 },[uid,refresh]);
 useEffect(()=>{if(uid&&(path==='/bag'||path==='/wishlist'))void refresh();},[path,uid,refresh]);
 const updateIssue=(key:string,value?:Issue)=>{if(value)pending.current[key]=value;else delete pending.current[key];setIssues({...pending.current});};
 const perform=useCallback(async(body:Record<string,unknown>,key:string,owner=uid,retrying=false):Promise<boolean>=>{
  const lock=owner+':'+key;if(!owner||locks.current.has(lock)||pending.current[key]&&!retrying)return false;const epoch=generation.current,startPath=location.current,startNavigation=navigation.current;
  const current=()=>mounted.current&&active.current===owner&&generation.current===epoch;locks.current.add(lock);setBusy(new Set(locks.current));let acknowledged=false;
  try{
   const result=await api<{outcome:string}>(body,owner);acknowledged=true;if(!current())return false;
   const refreshed=await refresh();if(!current())return false;if(!refreshed)throw new Error('Reconcile saved change');updateIssue(key);
   if(location.current===startPath&&navigation.current===startNavigation)publish({uid:owner,error:false,...shoppingFeedback(body.action,body.enabled,result.outcome)});return true;
  }catch(error){if(current()){
   const definite=error instanceof ProductError&&['invalid','conflict','not-found','permission','unauthorized'].includes(error.code);
   const message=acknowledged?'Your change was saved. Refresh items to see the latest state.':definite?'This item changed or is unavailable. Refresh items and review it.':'We couldn’t confirm your change. Retry safely to check the same change.';
   updateIssue(key,{uid:owner,body,key,message,mode:acknowledged||definite?'refresh':'operation'});if(location.current===startPath&&navigation.current===startNavigation)publish({uid:owner,error:true,message,retryKey:key});
  }return false;}finally{if(current()){locks.current.delete(lock);setBusy(new Set(locks.current));}}
 },[uid,api,refresh,publish]);
 const retryChange=async(key=notice?.retryKey)=>{const retry=key?pending.current[key]:undefined;if(!retry||retry.uid!==uid)return refresh();if(retry.mode==='operation')return perform(retry.body,retry.key,uid,true);const ok=await refresh();if(ok&&active.current===uid){updateIssue(retry.key);setNotice(old=>old?.retryKey===retry.key?null:old);}return ok;};
 const current=state.uid===uid&&uid?state:{...empty,status:'loading' as const,hasLoaded:false};
 const begin=useCallback((kind:'bag'|'wishlist',product:Product,quantity=1,color?:string)=>{
  if(session.status==='checking'){publish({uid,error:true,message:'Please wait while your account is restored.'});return Promise.resolve(false);}
  const variant=product.variants?.length?color||null:null,intent:ShoppingIntent={kind,productId:product.id,slug:product.slug||product.id,variantId:variant,quantity,operationId:crypto.randomUUID().replaceAll('-',''),createdAt:Date.now()};
  if(!uid){saveIntent(intent);navigate('/login?returnTo='+encodeURIComponent(shoppingReturn(path)));return Promise.resolve(false);}
  if(current.status!=='ready'){publish({uid,error:true,message:'Your saved items are not ready. Please retry.'});return Promise.resolve(false);}
  if(kind==='wishlist'&&current.wishlist.some(item=>item.productId===product.id)){setRemoval({uid,id:product.id,name:product.name});return Promise.resolve(false);}
  if(kind==='bag'&&product.variants?.length&&!variant){navigate('/product/'+product.slug+'?select=colour');return Promise.resolve(false);}
  return perform(kind==='bag'?{action:'bag:add',productId:product.id,variantId:variant,quantity,operationId:intent.operationId}:{action:'wishlist:set',productId:product.id,enabled:!current.wishlist.some(item=>item.productId===product.id),operationId:intent.operationId},kind+':'+product.id);
 },[uid,path,navigate,session.status,current.status,current.wishlist,perform,publish]);
 const consuming=useRef<string|null>(null);
 useEffect(()=>{
  const intent=readIntent();if(!intent)return;const authPath=/^\/(login|register|forgot-password)(?:\?|$)/.test(path);if(!uid){if(!authPath)clearIntent();return;}if(intent.uid&&intent.uid!==uid){clearIntent();return;}if(consuming.current===intent.operationId)return;consuming.current=intent.operationId;saveIntent({...intent,uid});const startPath=location.current,startNavigation=navigation.current,epoch=generation.current;
  void(async()=>{try{const product=await publicProduct(intent.slug);if(active.current!==uid||generation.current!==epoch||!mounted.current)return;clearIntent();if(product.id!==intent.productId)throw new Error('Unavailable');if(intent.kind==='bag'&&product.inventory.mode==='variants'&&!intent.variantId){navigate('/product/'+product.slug+'?select=colour');return;}await perform(intent.kind==='bag'?{action:'bag:add',productId:product.id,variantId:intent.variantId,quantity:intent.quantity,operationId:intent.operationId}:{action:'wishlist:set',productId:product.id,enabled:true,operationId:intent.operationId},intent.kind+':'+product.id,uid);}catch{if(mounted.current&&active.current===uid&&generation.current===epoch){clearIntent();if(location.current===startPath&&navigation.current===startNavigation)publish({uid,error:true,message:'Unable to restore the saved action. Please open the product and try again.'});}}})();
 },[uid,path,navigate,perform,publish]);
 const mutate=(action:string,productId:string,fields:Record<string,unknown>={},key=productId)=>perform({action,productId,...fields,operationId:crypto.randomUUID().replaceAll('-','')},key);
 const matching=(key:string)=>[...busy].some(value=>value===uid+':'+key),isBusy=(id:string)=>session.status==='checking'||!!uid&&current.status==='loading'||matching('bag:'+id)||matching('wishlist:'+id);
 return {...current,signedIn:!!uid,uid,checking:session.status==='checking',removal:removal?.uid===uid?removal:null,cancelRemoval:()=>setRemoval(null),notice:notice?.uid===uid?notice:null,dismiss:()=>setNotice(null),retryChange,retry:refresh,isBusy,
  pendingBag:[...busy].some(key=>key.startsWith(uid+':bag:'))||Object.values(issues).some(issue=>issue.uid===uid&&issue.key.startsWith('bag:')),
  issueFor:(key:string)=>issues[key]?.uid===uid?issues[key]:undefined,isBlocked:(id:string)=>isBusy(id)||issues['bag:'+id]?.uid===uid||issues['wishlist:'+id]?.uid===uid,
  isWishlisted:(id:string)=>current.wishlist.some(item=>item.productId===id),isInCart:(id:string,variant:string|null=null)=>current.bag.some(item=>item.productId===id&&item.variantId===variant),
  add:(product:Product,quantity?:number,color?:string)=>begin('bag',product,quantity,color),toggle:(product:Product)=>begin('wishlist',product),
  removeWish:(productId:string)=>mutate('wishlist:set',productId,{enabled:false},'wishlist:'+productId),removeBag:(productId:string,variantId:string|null)=>mutate('bag:remove',productId,{variantId},'bag:'+productId),adjust:(productId:string,variantId:string|null,delta:number)=>mutate('bag:adjust',productId,{variantId,delta},'bag:'+productId)};
}
export type Shopping=ReturnType<typeof useShopping>;
