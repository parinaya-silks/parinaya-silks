import React,{useEffect,useState,useSyncExternalStore} from 'react';
import {WifiOff,RefreshCw,ImageOff} from 'lucide-react';
import {InlineLoader,MorphingInfinity} from './Indicators.tsx';
export {MorphingInfinity,PageLoader,InlineLoader,ButtonLoader,ImageUploadLoader,PaymentVerificationLoader} from './Indicators.tsx';
const subscribe=(fn:()=>void)=>{window.addEventListener('online',fn);window.addEventListener('offline',fn);return()=>{window.removeEventListener('online',fn);window.removeEventListener('offline',fn);};};
export const useOffline=()=>!useSyncExternalStore(subscribe,()=>navigator.onLine,()=>true);
export function ConnectionNotice(){const offline=useOffline();return offline?<div className="store-connection-notice" role="status"><WifiOff size={16}/>You're offline. Some information may be out of date.</div>:null;}
export function Skeleton({className=''}:{className?:string}){return <span aria-hidden="true" className={'store-skeleton '+className}/>;}
export type SkeletonKind='products'|'collections'|'banner'|'campaigns'|'product'|'bag'|'profile'|'orders'|'order'|'text'|'checkout'|'auth'|'table'|'form'|'dashboard'|'chart'|'addresses';
function Lines(){return <><Skeleton className="sk-title"/><Skeleton/><Skeleton className="sk-short"/></>;}
export function SkeletonLayout({kind='text'}:{kind?:SkeletonKind}){
 if(kind==='table')return <TableSkeleton/>;
 if(kind==='form')return <FormSkeleton/>;
 if(kind==='dashboard')return <DashboardSkeleton/>;
 if(kind==='chart')return <ChartSkeleton/>;
 if(kind==='addresses')return <div className="loading-addresses" aria-hidden="true">{[0,1].map(i=><div className="sk-panel" key={i}><Lines/><Skeleton className="sk-short"/></div>)}</div>;
 if(kind==='banner')return <div className="store-banner-skeleton" aria-hidden="true"><Skeleton/><div><Skeleton className="sk-title"/><Skeleton className="sk-short"/></div></div>;
 if(kind==='collections')return <div className="store-collections-skeleton" aria-hidden="true">{Array.from({length:10},(_,i)=><div key={i}><Skeleton className="sk-thumbnail"/><Skeleton/></div>)}</div>;
 if(kind==='products')return <div className="store-products-skeleton" aria-hidden="true">{Array.from({length:4},(_,i)=><ProductCardSkeleton key={i}/>)}</div>;
 if(kind==='campaigns')return <div className="store-campaigns-skeleton" aria-hidden="true">{[0,1,2].map(i=><Skeleton key={i}/>)}</div>;
 if(kind==='product')return <div className="store-detail-skeleton" aria-hidden="true"><Skeleton className="sk-gallery"/><div className="sk-panel"><Lines/><Skeleton className="sk-price"/><Skeleton className="sk-box"/><Lines/><Skeleton className="sk-action"/></div></div>;
 if(kind==='bag'||kind==='checkout')return <div className="store-split-skeleton" aria-hidden="true"><div>{[0,1].map(i=><div className="sk-row sk-panel" key={i}><Skeleton className="sk-row-art"/><div><Lines/><Skeleton className="sk-price"/></div></div>)}</div><div className="sk-panel"><Lines/><Skeleton className="sk-box"/><Skeleton className="sk-action"/></div></div>;
 if(kind==='profile'||kind==='order')return <div className="store-split-skeleton" aria-hidden="true"><div>{[0,1].map(i=><div className="sk-panel" key={i}><Lines/><Skeleton className="sk-box"/></div>)}</div><div>{[0,1].map(i=><div className="sk-panel" key={i}><Lines/><Skeleton className="sk-box"/></div>)}</div></div>;
 if(kind==='orders')return <div className="store-orders-skeleton" aria-hidden="true">{[0,1,2].map(i=><div className="sk-panel" key={i}><Skeleton className="sk-short"/><div className="sk-row"><Skeleton className="sk-row-art"/><div><Lines/><Skeleton className="sk-action"/></div></div></div>)}</div>;
 if(kind==='auth')return <div className="store-auth-skeleton" aria-hidden="true"><MorphingInfinity className="loading-infinity"/><FormSkeleton fields={2}/></div>;
 return <div className="sk-panel store-text-skeleton" aria-hidden="true"><Lines/><Skeleton className="sk-box"/><Lines/></div>;
}
export function ProductCardSkeleton(){return <div className="sk-card" aria-hidden="true"><Skeleton className="sk-art"/><div><Lines/><Skeleton className="sk-price"/></div></div>;}
export function ProductGridSkeleton(){return <SkeletonLayout kind="products"/>;}
export function ProductDetailsSkeleton(){return <SkeletonLayout kind="product"/>;}
export function OrderListSkeleton(){return <SkeletonLayout kind="orders"/>;}
export function TableSkeleton({rows=5,columns=5}:{rows?:number;columns?:number}){return <div className="loading-table" aria-hidden="true"><div className="loading-table-head"><Skeleton className="sk-title"/><Skeleton className="sk-short"/></div>{Array.from({length:rows},(_,i)=><div className="loading-table-row" key={i} style={{'--loading-columns':columns} as React.CSSProperties}><Skeleton className="loading-table-thumbnail"/>{Array.from({length:columns-1},(_,j)=><div key={j}><Skeleton/><Skeleton className="sk-short"/></div>)}</div>)}</div>;}
export function FormSkeleton({fields=4}:{fields?:number}){return <div className="loading-form sk-panel" aria-hidden="true"><Skeleton className="sk-title"/>{Array.from({length:fields},(_,i)=><div key={i}><Skeleton className="sk-short"/><Skeleton className="loading-input"/></div>)}<Skeleton className="sk-action"/></div>;}
export function ChartSkeleton(){return <div className="loading-chart sk-panel" aria-hidden="true"><Skeleton className="sk-title"/><div>{[35,65,45,80,60,90,70].map((height,i)=><Skeleton key={i} className={'loading-bar loading-bar-'+height}/>)}</div><Skeleton/></div>;}
export function DashboardSkeleton(){return <div className="loading-dashboard" aria-hidden="true"><div>{[0,1,2,3].map(i=><div className="sk-panel" key={i}><Lines/></div>)}</div><TableSkeleton/></div>;}
export const SectionLoader=Loading;
// Keep the existing img element, crop and dimensions in editor previews.
// Only the empty image box animates; loaded photography is never tinted.
export function PreviewImage({className='',...props}:React.ImgHTMLAttributes<HTMLImageElement>){
 const ref=React.useRef<HTMLImageElement>(null),[busy,setBusy]=useState(true);
 useEffect(()=>{setBusy(!ref.current?.complete);const timer=setTimeout(()=>setBusy(false),15000);return()=>clearTimeout(timer);},[props.src]);
 return <img {...props} ref={ref} className={className+(busy?' loading-preview-image':'')} aria-busy={busy} onLoad={e=>{setBusy(false);props.onLoad?.(e);}} onError={e=>{setBusy(false);props.onError?.(e);}}/>;
}
export function Recovery({retry,label='Retry',message='We couldn\u2019t load this right now. Please try again.',compact=false,busy=false}:{retry:()=>void;label?:string;message?:string;compact?:boolean;busy?:boolean}){const offline=useOffline();return <div className={'store-recovery'+(compact?' compact':'')} data-offline={offline&&!compact} role="alert">{offline&&!compact?<><WifiOff size={23}/><h2>You're offline.</h2><p>Check your internet connection and try again.</p></>:<p>{message}</p>}<button disabled={busy} onClick={retry}><RefreshCw size={15}/>{label}</button></div>;}
export function Loading({kind='text',label='Loading content',retry,compact=false}:{kind?:SkeletonKind;label?:string;retry?:()=>void;compact?:boolean}){
 const offline=useOffline(),[slow,setSlow]=useState(false);useEffect(()=>{const timer=setTimeout(()=>setSlow(true),5000);return()=>clearTimeout(timer);},[]);
 if(offline&&retry)return <Recovery compact={compact} retry={retry} message="Connect to load this section."/>;
 return <div className={'store-loading store-loading-'+kind} aria-busy="true"><p className="sr-only" role="status">{label}</p><SkeletonLayout kind={kind}/>{slow&&<p className="store-slow" role="status">This is taking longer than usual.</p>}</div>;
}
export function Updating({busy,error,retry}:{busy?:boolean;error?:unknown;retry:()=>void}){return error?<Recovery compact retry={retry} message="Unable to refresh. Showing the last loaded information." busy={busy}/>:busy?<p className="store-updating" role="status"><InlineLoader label="Updating..."/></p>:null;}
// The owning image box sets the geometry; intrinsic file size cannot expand it.
export function ImageState({src,alt,className='',...props}:React.ImgHTMLAttributes<HTMLImageElement>){const [state,setState]=useState<'loading'|'ready'|'error'>('loading');const ref=React.useRef<HTMLImageElement>(null);
 useEffect(()=>{
  const img=ref.current;setState(img?.complete?(img.naturalWidth?'ready':'error'):'loading');
  let timer:ReturnType<typeof setTimeout>|undefined,observer:IntersectionObserver|undefined;
  const start=()=>{if(timer===undefined)timer=setTimeout(()=>setState(s=>s==='loading'?'error':s),15000);};
  // Native lazy images may wait off screen indefinitely. Their download deadline
  // starts near the viewport, not when a long product list mounts.
  if(props.loading==='lazy'&&img&&typeof IntersectionObserver!=='undefined'){
   observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){start();observer?.disconnect();}},{rootMargin:'200px'});observer.observe(img);
  }else start();
  return()=>{clearTimeout(timer);observer?.disconnect();};
 },[src,props.loading]);
 return <>{state==='loading'&&<Skeleton className="store-image-placeholder"/>}{state==='error'?<span className="store-image-fallback"><ImageOff size={20}/>Image unavailable</span>:<img {...props} ref={ref} src={src} alt={alt} className={className} onLoad={event=>{setState('ready');props.onLoad?.(event);}} onError={event=>{setState('error');props.onError?.(event);}}/>}</>;
}
