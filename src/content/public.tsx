import {useRead} from '../loading/useRead.ts';
import {bannerSeconds} from './bannerTiming.ts';
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
type PublicContent={storefrontAppearance?:import('../appearance/theme.ts').ThemeSettings;bannerSeconds?:number}&Omit<StoreContent,'revision'|'banners'|'contact'>&{about?:PublicAbout;aboutSaved?:boolean;contact:PublicContact;banners:PublicBanner[];textSections?:PublicWebsiteText}&{featuredProducts?:PublicProductRecord[];featuredCategories?:{id:string;name:string;slug:string;homepageImage?:import('../appearance/model.ts').LoginImage|null}[]};
const emptyPublicContent=()=>({...blankContent(),contact:publicContact()});
const Context=createContext<{content:PublicContent;status:'loading'|'ready'|'error';hasLoaded:boolean;busy:boolean;retry:()=>void}>({content:emptyPublicContent(),status:'loading',hasLoaded:false,busy:true,retry:()=>{}});
export const useStoreContent=()=>useContext(Context);
export function usePublicContact(){return useStoreContent().content.contact;}
export function StoreContentProvider({children}:{children:React.ReactNode}){
 const resource=useRead<PublicContent>('public-content',async signal=>{const value=await catalogResponse(await fetch('/api/catalog?content=store',{signal,cache:'no-store'}));if(!value||!Array.isArray(value.banners)||value.banners.length>6||!Array.isArray(value.featuredProductIds)||!Array.isArray(value.featuredCategoryIds)||!value.contact||!['email','mobile','address','instagram'].every(key=>typeof value.contact[key]==='string')||!value.policies||!['shipping','returns','privacy','terms'].every(key=>typeof value.policies[key]?.approved==='boolean'&&typeof value.policies[key]?.text==='string')||typeof value.returnsEnabled!=='boolean'||!Array.isArray(value.returnKinds)||value.banners.some((banner:any)=>!banner||typeof banner.title!=='string'||typeof banner.link!=='string'||!banner.images))throw new Error('Invalid public content.');for(const banner of value.banners)safeLink(banner.link,true); return value;},{interval:(value:any)=>Math.max(100,Math.min(15000,typeof value.nextBoundary==='number'?value.nextBoundary-value.serverNow:15000))});
 return <Context value={{content:resource.data||emptyPublicContent(),status:resource.status,hasLoaded:resource.hasLoaded,busy:resource.busy,retry:resource.retry}}>{children}</Context>;
}
export function HomeBanners({onNavigate}:{onNavigate:(path:string)=>void}){const {content}=useStoreContent();return <BannerCarousel banners={content.banners} seconds={bannerSeconds(content.bannerSeconds)} onNavigate={onNavigate}/>;}
