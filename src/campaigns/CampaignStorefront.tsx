import {useStoreContent} from '../content/public.tsx';
import {useHomeCampaigns} from '../home/campaigns.tsx';
import {useRead} from '../loading/useRead.ts';
import {Loading,Recovery,Updating} from '../loading/Loading.tsx';
import React,{useEffect,useState} from 'react';
import {catalogResponse} from '../products/response.ts';
import {ShopView} from '../views/ShopView.tsx';
import type {Product} from '../types/index.ts';
import type {PublicCampaign} from './model.ts';
import {CampaignBanner} from './CampaignBanner.tsx';
import './campaign-public.css';
type ShopProps={products:Product[];onNavigate:(path:string)=>void;onAddToCart:(p:Product)=>void;onToggleWishlist:(p:Product)=>void;isWishlisted:(id:string)=>boolean};
export function CampaignStorefront({slug,...shop}:{slug?:string}&ShopProps){
 const shared=useHomeCampaigns(),copy=useStoreContent().content.textSections?.['home-campaigns'];
 const r=useRead<any>('campaign:'+(slug||'list'),async signal=>catalogResponse(await fetch('/api/catalog?'+(slug?'campaign='+encodeURIComponent(slug):'campaigns=1'),{cache:'no-store',signal})),{enabled:!!slug,interval:15000});
 const unavailable=(r.error as {code?:string})?.code==='not-found',campaign:PublicCampaign|undefined=unavailable?undefined:slug&&!r.error?r.data:undefined,items:PublicCampaign[]|undefined=!slug?shared.items:undefined;
 const [expired,setExpired]=useState(false);
 useEffect(()=>{const c=r.data;setExpired(false);if(!c||c.endsAt==null)return;const timer=setTimeout(()=>{setExpired(true);r.retry();},Math.min(2147483647,Math.max(0,c.endsAt-c.serverNow)));return()=>clearTimeout(timer);},[r.data,r.retry]);
 return <div className="campaign-storefront">{slug&&!r.hasLoaded&&!r.error&&<Loading kind="campaigns" label="Loading seasonal collections" retry={r.retry}/>}<Updating busy={r.hasLoaded&&r.busy} error={r.hasLoaded&&!unavailable&&r.error} retry={r.retry}/>{!!r.error&&!r.hasLoaded&&!unavailable&&<Recovery retry={r.retry} label="Retry campaigns"/>}{(unavailable||expired)&&<section><h1>Campaign unavailable</h1><p>This collection has ended or is not currently available.</p><button onClick={()=>shop.onNavigate('/shop')}>Shop Sarees</button></section>}{campaign&&!expired&&<><CampaignBanner key={campaign.slug} campaign={campaign}/><div id="campaign-products"><ShopView {...shop} campaignSlug={slug} campaignTitle={campaign.name}/></div></>}{!slug&&<>{shared.loading&&<Loading kind="campaigns" label="Loading seasonal collections" retry={shared.retry}/>} {!!shared.error&&<Recovery retry={shared.retry} label="Retry campaigns"/>}<section className="campaign-offers"><h1>{copy?.heading||'Seasonal Collections'}</h1>{copy?.supportingText&&<p>{copy.supportingText}</p>}{copy?.description&&<p className="whitespace-pre-wrap">{copy.description}</p>}<p>Campaign collections use the current prices saved in Products.</p>{!shared.loading&&!shared.error&&items?.length===0&&<p>No live seasonal collections right now.</p>}<div>{items?.map(c=><a key={c.slug} href={'/sale/'+c.slug} onClick={e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.button!==0)return;e.preventDefault();shop.onNavigate('/sale/'+c.slug);}}>{c.banners.desktop?<picture><source media="(max-width:767px)" srcSet={c.banners.mobile?.url||c.banners.desktop.url}/><img src={c.banners.desktop.url} alt={c.name} loading="lazy"/></picture>:null}<h2>{c.name}</h2><p>{c.description}</p></a>)}</div></section></>}</div>;
}
