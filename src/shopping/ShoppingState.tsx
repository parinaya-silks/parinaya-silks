import {Loading,Recovery,ImageState,ButtonLoader} from '../loading/Loading.tsx';
import React from 'react';
import {Heart,ShoppingBag} from 'lucide-react';
import type {Shopping} from './useShopping.ts';
export function ShoppingState({shopping,kind,onNavigate}:{shopping:Shopping;kind:'bag'|'wishlist';onNavigate:(path:string)=>void}) {
  const title=kind==='bag'?'bag':'wishlist';
  if(shopping.checking||shopping.signedIn&&shopping.status==='loading')return <Loading kind={kind==='bag'?'bag':'products'} label={'Loading your '+title} retry={shopping.retry}/>;
  if(shopping.signedIn&&shopping.status==='error')return <Recovery retry={shopping.retry} label={'Retry '+title}/>;
  return <section className="text-center py-14 px-4 space-y-5 bg-white rounded-xl border border-[#E8DDD6]">
    <span className="inline-flex text-[#780D24]">{kind==='bag'?<ShoppingBag size={38}/>:<Heart size={38}/>}</span>
    <h2 className="font-serif text-2xl">{shopping.checking?'Restoring your account…':!shopping.signedIn?`Sign in to view your ${title}`:shopping.status==='loading'?<ButtonLoader label={`Loading your ${title}…`}/>:shopping.status==='error'?`Unable to load your ${title}`:`Your ${title} is empty`}</h2>
    {shopping.signedIn&&shopping.status==='loading'&&<div aria-hidden="true" className="flex justify-center gap-3">{[0,1,2].map(key=><span key={key} className="h-28 w-20 rounded bg-[#F4EEE5] animate-pulse motion-reduce:animate-none"/>)}</div>}
    {!shopping.checking&&!shopping.signedIn&&<><p className="text-sm text-[#5F5552]">Keep your saved sarees with your account, across devices.</p><button className="min-h-11 px-6 rounded bg-[#780D24] text-white" onClick={()=>onNavigate('/login?returnTo='+encodeURIComponent('/'+kind))}>Sign in</button></>}
    {shopping.signedIn&&shopping.status==='error'&&<button className="min-h-11 px-6 underline" onClick={shopping.retry}>Retry {title}</button>}
    <div><button className="min-h-11 px-5 text-[#780D24] underline" onClick={()=>onNavigate('/shop')}>Continue shopping</button></div>
  </section>;
}
export function ShoppingImage({url,alt}:{url?:string;alt:string}){return url?<ImageState src={url} alt={alt} className="w-full h-full object-cover" loading="lazy"/>:<span className="flex h-full items-center justify-center text-[#5F5552] text-xs p-2">Image unavailable</span>;}
