import {Loading,Recovery,Updating} from '../loading/Loading.tsx';
import {Collections} from '../home/Collections.tsx';
import React from 'react';
import {ArrowRight,Sparkles,Truck} from 'lucide-react';
import {storefrontProduct} from '../products/adapter.ts';
import {useStoreContent} from '../content/public.tsx';
import {BannerCarousel} from '../content/BannerSlide.tsx';
import {heroBanners} from '../campaigns/presentation.ts';
import {useHomeCampaigns} from '../home/campaigns.tsx';
import {HomeProductCard} from '../home/ProductCard.tsx';
import {recentProducts} from '../home/model.ts';
import {HomeCopy,HomeLink,HomeImage} from '../home/parts.tsx';
import type {Product} from '../types/index.ts';
import '../home/home.css';
import '../home/visual-correction.css';
interface HomeViewProps {products:Product[];onNavigate:(path:string)=>void;onAddToCart:(p:Product)=>void;onToggleWishlist:(p:Product)=>void;isWishlisted:(id:string)=>boolean;isBusy?:(id:string)=>boolean;catalogState?:'loading'|'ready'|'error';catalogBusy?:boolean;catalogError?:boolean;onRetry?:()=>void}
export const HomeView:React.FC<HomeViewProps>=({products,onNavigate,onAddToCart,onToggleWishlist,isWishlisted,isBusy=()=>false,catalogState='ready',catalogBusy=false,catalogError=false,onRetry})=>{
 const {content,status,retry,hasLoaded,busy}=useStoreContent(),campaigns=useHomeCampaigns(),banners=heroBanners(content.banners,campaigns.items),arrivals=recentProducts(products),spotlight=hasLoaded?(content.featuredProducts||[]).map(storefrontProduct)[0]:undefined,about=hasLoaded&&content.aboutSaved?content.about:undefined;
 return <div className="home-page"><h1 className="sr-only">PARINAYA SAREES - Sarees</h1>
 {(!hasLoaded||(!content.banners.length&&campaigns.loading))?(status==='error'?<Recovery retry={retry} label="Retry homepage content"/>:<Loading kind="banner" label="Loading homepage banners" retry={retry}/>):banners.length>0?<><BannerCarousel banners={banners} seconds={content.bannerSeconds} onNavigate={onNavigate}/><Updating busy={busy} error={status==='error'} retry={retry}/></>:<section className="home-hero-empty"><div><span>PARINAYA SAREES</span><h2>Discover our saree collection</h2><HomeLink to="/shop" onNavigate={onNavigate} className="home-primary">Shop Sarees <ArrowRight size={17}/></HomeLink><Updating busy={busy} error={status==='error'} retry={retry}/></div></section>}

 {!!campaigns.error&&<Recovery compact retry={campaigns.retry} label="Retry seasonal collections"/>}
 <Collections assigned={hasLoaded?content.featuredCategories||[]:[]} products={products} copy={content.textSections?.['home-categories']} onNavigate={onNavigate}/>
 <section className="home-arrivals home-container" aria-label="Recent sarees"><header className="home-section-heading"><HomeCopy value={{supportingText:'',description:'',...content.textSections?.['home-new-arrivals'],heading:'Recent Unveiled'}} fallback="Recent Unveiled"/><HomeLink to="/shop" onNavigate={onNavigate}>View All <ArrowRight size={14}/></HomeLink></header>{catalogState!=='ready'?(catalogState==='error'?<Recovery compact retry={onRetry||(()=>{})} label="Retry products"/>:<Loading compact kind="products" label="Loading sarees" retry={onRetry}/>):arrivals.length?<><Updating busy={catalogBusy} error={catalogError} retry={onRetry||(()=>{})}/><div className="home-product-grid">{arrivals.map(p=><HomeProductCard key={p.id} product={p} onNavigate={onNavigate} onAdd={onAddToCart} onWishlist={onToggleWishlist} wishlisted={isWishlisted(p.id)} busy={isBusy(p.id)}/>)}</div></>:<div className="home-state"><p>No products available yet.</p><HomeLink to="/contact" onNavigate={onNavigate}>Contact Us</HomeLink></div>}</section>
 {spotlight&&<section className="home-spotlight" aria-label="Curator's Spotlight"><div className="home-container"><header><span><Sparkles size={16}/>Curator's Spotlight</span><HomeCopy value={content.textSections?.['home-featured']} fallback={spotlight.name}/></header><div className="home-spotlight-layout"><HomeLink to={'/product/'+spotlight.slug} onNavigate={onNavigate} className="home-spotlight-image"><HomeImage url={spotlight.images.full} alt={spotlight.gallery?.find(i=>i.url===spotlight.images.full)?.alt||spotlight.name}/></HomeLink><div>{(content.textSections?.['home-featured']?.heading??spotlight.name)!==spotlight.name&&<h3>{spotlight.name}</h3>}{spotlight.description&&<p>{spotlight.description}</p>}<HomeLink to={'/product/'+spotlight.slug} onNavigate={onNavigate} className="home-gold">Explore Saree <ArrowRight size={16}/></HomeLink></div></div></div></section>}
 {about&&(about.intro||about.story)&&<section className="home-story home-container" aria-label="Our story"><div><Sparkles size={28}/><h2>{about.heading}</h2><p>{about.intro||about.story.split('\n\n')[0]}</p><HomeLink to="/about" onNavigate={onNavigate}>Our story <ArrowRight size={15}/></HomeLink></div></section>}
 </div>;
};
