import {useCallback,useEffect,useRef,useState} from 'react';
import {collection,limit,onSnapshot,query} from 'firebase/firestore';
import {useCustomerAuth} from '../customer/CustomerAuth.tsx';
import {getAuthClients} from '../services/firebase/auth.ts';
import {catalogResponse} from '../products/response.ts';
import {publicProduct} from '../products/client.ts';
import type {Product} from '../types/index.ts';
import {SHOPPING_LIMIT,type ShoppingData} from './model.ts';
import {clearIntent,readIntent,saveIntent,shoppingReturn,type ShoppingIntent} from './intent.ts';

type State=ShoppingData&{uid:string;status:'loading'|'ready'|'error'};
const empty:ShoppingData={bag:[],wishlist:[]};
export function useShopping(path:string,navigate:(path:string)=>void){
  const session=useCustomerAuth(),uid=session.user?.uid||'';
  const active=useRef(uid);active.current=uid;
  const [state,setState]=useState<State>({...empty,uid:'',status:'loading'});
  const [notice,setNotice]=useState<{uid:string;message:string;error:boolean}|null>(null);
  const [busy,setBusy]=useState<Set<string>>(new Set());
  const locks=useRef(new Set<string>()),generation=useRef(0),request=useRef(0);
  const pendingRetry=useRef<{uid:string;body:Record<string,unknown>;key:string}|null>(null);
  const api=useCallback(async<T,>(body:Record<string,unknown>,owner=uid):Promise<T>=>{
    const user=getAuthClients().auth.currentUser;
    if(!owner||user?.uid!==owner)throw new Error('Sign in again to continue.');
    const token=await user.getIdToken();
    if(active.current!==owner)throw new Error('Your account changed.');
    return catalogResponse(await fetch('/api/catalog',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)}),false);
  },[uid]);
  const refresh=useCallback(async()=>{
    if(!uid)return;const attempt=++request.current,epoch=generation.current;
    try{const data=await api<ShoppingData>({action:'shopping:get'},uid);if(active.current===uid&&epoch===generation.current&&attempt===request.current)setState({...data,uid,status:'ready'});}
    catch{if(active.current===uid&&epoch===generation.current&&attempt===request.current)setState({...empty,uid,status:'error'});}
  },[uid,api]);
  useEffect(()=>{
    generation.current++;locks.current.clear();setBusy(new Set());pendingRetry.current=null;setNotice(null);
    if(!uid){setState({...empty,uid:'',status:'loading'});return;}
    setState({...empty,uid,status:'loading'});
    let live=true,timer:ReturnType<typeof setTimeout>|undefined;
    const changed=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(live)void refresh();},60);};
    const failed=()=>{if(live&&active.current===uid)setState({...empty,uid,status:'error'});};
    const stops:(()=>void)[]=[];
    try{const {database}=getAuthClients();for(const kind of ['bag','wishlist'])stops.push(onSnapshot(query(collection(database,'customerShopping',uid,kind),limit(SHOPPING_LIMIT+1)),changed,failed));}catch{failed();}
    return()=>{live=false;clearTimeout(timer);for(const stop of stops)stop();generation.current++;};
  },[uid,refresh]);
  // Re-resolve current price/publication/stock on shopping-page navigation and refresh.
  useEffect(()=>{if(uid&&(path==='/bag'||path==='/wishlist'))void refresh();},[path,uid,refresh]);
  const perform=useCallback(async(body:Record<string,unknown>,key:string,owner=uid)=>{
    const lock=owner+':'+key;if(!owner||locks.current.has(lock))return;
    const epoch=generation.current;
    const isCurrent=()=>active.current===owner&&generation.current===epoch;
    locks.current.add(lock);setBusy(new Set(locks.current));
    setNotice({uid:owner,error:false,message:body.action==='bag:remove'||body.enabled===false?'Removing item…':'Saving your change…'});
    try{
      const result=await api<{outcome:string}>(body,owner);
      if(!isCurrent())return;
      pendingRetry.current=null;
      setNotice({uid:owner,error:false,message:result.outcome==='already'?(body.action==='bag:add'?'Already in your bag.':'Already in your wishlist.'):result.outcome==='removed'?'Item removed.':body.action==='bag:add'?'Added to your bag.':body.action==='bag:adjust'?'Quantity updated.':'Saved to your wishlist.'});
      await refresh();
    }catch(error){if(isCurrent()){pendingRetry.current={uid:owner,body,key};setNotice({uid:owner,error:true,message:error instanceof Error&&error.name!=='TypeError'&&error.name!=='TimeoutError'?error.message:'Unable to confirm your change. Please retry.'});}}
    finally{if(isCurrent()){locks.current.delete(lock);setBusy(new Set(locks.current));}}
  },[uid,api,refresh]);
  const current=state.uid===uid&&uid?state:{...empty,status:'loading' as const};
  const wishlisted=(id:string)=>current.wishlist.some(item=>item.productId===id);
  const inBag=(id:string)=>current.bag.some(item=>item.productId===id);
  const begin=useCallback((kind:'bag'|'wishlist',product:Product,quantity=1,color?:string)=>{
    if(session.status==='checking'){setNotice({uid,error:true,message:'Please wait while your account is restored.'});return;}
    const variant=product.variants?.length?color||null:null;
    const intent:ShoppingIntent={kind,productId:product.id,slug:product.slug||product.id,variantId:variant,quantity,operationId:crypto.randomUUID().replaceAll('-',''),createdAt:Date.now()};
    if(!uid){saveIntent(intent);navigate('/login?returnTo='+encodeURIComponent(shoppingReturn(path)));return;}
    if(kind==='wishlist'&&current.status!=='ready'){setNotice({uid,error:true,message:'Your saved items are not ready. Please retry.'});return;}
    if(kind==='bag'&&product.variants?.length&&!variant){navigate('/product/'+product.slug+'?select=colour');return;}
    void perform(kind==='bag'?{action:'bag:add',productId:product.id,variantId:variant,quantity,operationId:intent.operationId}:{action:'wishlist:set',productId:product.id,enabled:!current.wishlist.some(item=>item.productId===product.id),operationId:intent.operationId},kind+':'+product.id);
  },[uid,path,navigate,session.status,current.status,current.wishlist,perform]);
  const consuming=useRef<string|null>(null);
  useEffect(()=>{
    const intent=readIntent();if(!intent)return;
    const authPath=/^\/(login|register|forgot-password)(?:\?|$)/.test(path);
    if(!uid){if(!authPath)clearIntent();return;}
    if(intent.uid&&intent.uid!==uid){clearIntent();return;}
    if(consuming.current===intent.operationId)return;
    consuming.current=intent.operationId;saveIntent({...intent,uid});
    void (async()=>{
      try{
        const product=await publicProduct(intent.slug);
        if(active.current!==uid)return;
        clearIntent();
        if(product.id!==intent.productId)throw new Error('This product is no longer available.');
        if(intent.kind==='bag'&&product.inventory.mode==='variants'&&!intent.variantId){navigate('/product/'+product.slug+'?select=colour');return;}
        await perform(intent.kind==='bag'?{action:'bag:add',productId:product.id,variantId:intent.variantId,quantity:intent.quantity,operationId:intent.operationId}:{action:'wishlist:set',productId:product.id,enabled:true,operationId:intent.operationId},intent.kind+':'+product.id,uid);
      }catch{if(active.current===uid){clearIntent();setNotice({uid,error:true,message:'Unable to restore the saved action. Please open the product and try again.'});}}
    })();
  },[uid,path,navigate,perform]);
  const mutate=(action:string,productId:string,fields:Record<string,unknown>={},key=productId)=>void perform({action,productId,...fields,operationId:crypto.randomUUID().replaceAll('-','')},key);
  return {...current,signedIn:!!uid,checking:session.status==='checking',notice:notice?.uid===uid?notice:null,dismiss:()=>{setNotice(null);pendingRetry.current=null;},retryChange:()=>{const retry=pendingRetry.current;if(retry?.uid===uid)void perform(retry.body,retry.key);else void refresh();},retry:refresh,isBusy:(id:string)=>[...busy].some(value=>value.startsWith(uid+':')&&value.endsWith(id)),isWishlisted:wishlisted,isInCart:inBag,
    add:(product:Product,quantity?:number,color?:string)=>begin('bag',product,quantity,color),toggle:(product:Product)=>begin('wishlist',product),
    removeWish:(productId:string)=>mutate('wishlist:set',productId,{enabled:false},'wishlist:'+productId),
    removeBag:(productId:string,variantId:string|null)=>mutate('bag:remove',productId,{variantId},'bag:'+productId),
    adjust:(productId:string,variantId:string|null,delta:number)=>mutate('bag:adjust',productId,{variantId,delta},'bag:'+productId)};
}
export type Shopping=ReturnType<typeof useShopping>;
