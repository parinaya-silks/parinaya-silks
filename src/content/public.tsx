import type {PublicAbout} from '../about/model.ts';
import React,{createContext,useContext,useEffect,useState} from 'react';
import {publicContact,type PublicContact} from '../contact/model.ts';
import type {PublicProductRecord} from '../products/model.ts';
import {blankContent,type StoreContent} from './model.ts';
import {BannerCarousel} from './BannerSlide.tsx';
import type {PublicWebsiteText} from './sections.ts';
import type {PublicBanner} from './model.ts';
import {safeLink} from '../orders/model.ts';
import {catalogResponse} from '../products/response.ts';
type PublicContent=Omit<StoreContent,'revision'|'banners'|'contact'>&{about?:PublicAbout;aboutSaved?:boolean;contact:PublicContact;banners:PublicBanner[];textSections?:PublicWebsiteText}&{featuredProducts?:PublicProductRecord[];featuredCategories?:{id:string;name:string;slug:string}[]};
const emptyPublicContent=()=>({...blankContent(),contact:publicContact()});
const Context=createContext<{content:PublicContent;status:'loading'|'ready'|'error';retry:()=>void}>({content:emptyPublicContent(),status:'loading',retry:()=>{}});
export const useStoreContent=()=>useContext(Context);
export function usePublicContact(){return useStoreContent().content.contact;}
export function StoreContentProvider({children}:{children:React.ReactNode}){
 const [content,setContent]=useState<PublicContent>(emptyPublicContent),[status,setStatus]=useState<'loading'|'ready'|'error'>('loading'),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let live=true,request=0,timer:ReturnType<typeof setTimeout>;const controller=new AbortController();async function load(){const sequence=++request;try{const value=await catalogResponse(await fetch('/api/catalog?content=store',{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]),cache:'no-store'}));if(!value||!Array.isArray(value.banners)||value.banners.length>6||!Array.isArray(value.featuredProductIds)||!Array.isArray(value.featuredCategoryIds)||!value.contact||!['email','mobile','address','instagram'].every(key=>typeof value.contact[key]==='string')||!value.policies||!['shipping','returns','privacy','terms'].every(key=>typeof value.policies[key]?.approved==='boolean'&&typeof value.policies[key]?.text==='string')||typeof value.returnsEnabled!=='boolean'||!Array.isArray(value.returnKinds)||value.banners.some((banner:any)=>!banner||typeof banner.title!=='string'||typeof banner.link!=='string'||!banner.images))throw new Error('Invalid public content.');for(const banner of value.banners)safeLink(banner.link,true);if(live&&sequence===request){setContent(value);setStatus('ready');clearTimeout(timer);timer=setTimeout(()=>void load(),Math.max(100,Math.min(15000,typeof value.nextBoundary==='number'?value.nextBoundary-value.serverNow:15000)));}}catch{if(live&&sequence===request){setContent(old=>({...old,banners:[],contact:publicContact()}));setStatus('error');clearTimeout(timer);timer=setTimeout(()=>void load(),15000);}}}void load();const focus=()=>void load();window.addEventListener('focus',focus);return()=>{live=false;controller.abort();clearTimeout(timer);window.removeEventListener('focus',focus);};},[attempt]);
 return <Context value={{content,status,retry:()=>setAttempt(n=>n+1)}}>{children}</Context>;
}
export function HomeBanners({onNavigate}:{onNavigate:(path:string)=>void}){const {content}=useStoreContent();return <BannerCarousel banners={content.banners} onNavigate={onNavigate}/>;}
