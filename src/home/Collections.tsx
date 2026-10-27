import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Palette} from 'lucide-react';
import {useCategories} from '../categories/useCategories.ts';
import {publicCatalog} from '../products/client.ts';
import type {Product} from '../types/index.ts';
import type {HomeText} from '../content/sections.ts';
import {HomeCopy,HomeLink,HomeImage} from './parts.tsx';
import {categoryArtwork} from './model.ts';
type Collection={id:string;name:string;slug:string};
export function Collections({assigned,products,copy,onNavigate}:{assigned:Collection[];products:Product[];copy?:HomeText;onNavigate:(p:string)=>void}){return assigned.length?<CollectionRail items={assigned} products={products} copy={copy} onNavigate={onNavigate}/>:<EnabledCollections products={products} copy={copy} onNavigate={onNavigate}/>;}
function EnabledCollections(props:{products:Product[];copy?:HomeText;onNavigate:(p:string)=>void}){const {state,retry}=useCategories();return state.status==='ready'?<CollectionRail {...props} items={state.items}/>:<section className="home-categories home-container"><HomeCopy value={props.copy} fallback="Shop by collection"/><p className="home-collection-status" role={state.status==='error'?'alert':'status'}>{state.status==='error'?'Unable to load collections.':'Loading collections…'}</p>{state.status==='error'&&<button className="home-collection-retry" onClick={retry}>Retry collections</button>}</section>;}
export function CollectionRail({items,products,copy,onNavigate}:{items:Collection[];products:Product[];copy?:HomeText;onNavigate:(p:string)=>void}){
 const rail=useRef<HTMLElement>(null),[overflows,setOverflows]=useState(false),[covers,setCovers]=useState<Record<string,string>>({}),key=items.map(i=>i.id+':'+i.slug).join('|'),available=JSON.stringify(items.map(i=>[i.id,categoryArtwork(i.id,products)?.images.full||'']));
 useEffect(()=>{let live=true;const missing=items.filter(i=>!categoryArtwork(i.id,products));void Promise.allSettled(missing.map(async i=>{const page=await publicCatalog(undefined,{browse:'1',category:i.slug,sort:'newest'}),p=page.items.find(p=>p.images.length);return [i.id,p?.images.find(image=>image.mediaId===p.coverMediaId)?.url||p?.images[0]?.url||''] as const;})).then(rows=>{if(live)setCovers(Object.fromEntries(rows.flatMap(r=>r.status==='fulfilled'?[r.value]:[])));});return()=>{live=false;};},[key,available]);
 useEffect(()=>{const node=rail.current;if(!node)return;const update=()=>setOverflows(node.scrollWidth>node.clientWidth+1),observer=new ResizeObserver(update);observer.observe(node);update();return()=>observer.disconnect();},[key]);
 return <section className="home-categories home-container" aria-label="Shop by collection"><header className="home-rail-heading"><HomeCopy value={copy} fallback="Shop by collection"/>{overflows&&<span>Swipe for more <ArrowRight size={12}/></span>}</header>{!items.length?<p className="home-collection-status">No collections available yet.</p>:<nav ref={rail} className="home-category-rail" aria-label="Featured collections">{items.map(i=>{const url=categoryArtwork(i.id,products)?.images.full||covers[i.id];return <HomeLink key={i.id} to={'/collections/'+i.slug} onNavigate={onNavigate}><span className="home-category-art">{url?<HomeImage url={url} alt=""/>:<Palette size={25} aria-label="Collection artwork unavailable"/>}</span><span>{i.name}</span></HomeLink>;})}</nav>}</section>;
}
