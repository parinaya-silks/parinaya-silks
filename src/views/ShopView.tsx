import {Loading,Recovery,Updating,Skeleton,ImageState} from '../loading/Loading.tsx';
import './shop-cards.css';
import './discovery.css';
import React,{useEffect,useRef,useState} from 'react';
import {Search,SlidersHorizontal,X} from 'lucide-react';
import {usePublicCatalog} from '../products/hooks.ts';
import {storefrontProduct} from '../products/adapter.ts';
import {demoEnabled} from '../config/runtime.ts';
import type {Product} from '../types/index.ts';
import {formatINR} from '../utils/pricing.ts';
import {useCategories} from '../categories/useCategories.ts';
import {discoveryFilters,discoveryUrl,discoverySorts,type DiscoveryFilters} from '../products/discovery.ts';
interface ShopViewProps {products:Product[];initialCategory?:string;initialSearch?:string;categorySlug?:string;saleOnly?:boolean;campaignSlug?:string;campaignTitle?:string;onNavigate:(p:string)=>void;onAddToCart:(p:Product)=>void;onToggleWishlist:(p:Product)=>void;isWishlisted:(id:string)=>boolean}
const labels={featured:'Featured',newest:'Newest Arrivals','price-asc':'Price: Low to High','price-desc':'Price: High to Low'};
const paise=(s:string)=>{if(!s.trim())return null;if(!/^\d+(?:\.\d{1,2})?$/.test(s))throw Error('Enter prices with up to two decimal places.');const [a,b='']=s.split('.'),n=BigInt(a)*100n+BigInt(b.padEnd(2,'0'));if(n>100000000n)throw Error('Price is too large.');return Number(n);};
export const ShopView:React.FC<ShopViewProps>=({initialCategory,initialSearch='',categorySlug:requestedSlug,saleOnly=false,campaignSlug,campaignTitle,onNavigate,onAddToCart,onToggleWishlist,isWishlisted})=>{
 const path=window.location.pathname+window.location.search,params=new URLSearchParams(window.location.search),{state:categoryState,retry:retryCategories}=useCategories();
 const publicCategories=categoryState.status==='ready'?categoryState.items:[],baseCategory=requestedSlug?publicCategories.find(c=>c.slug===requestedSlug):undefined;
 const optional=params.get('category')||initialCategory||'',selectedPublic=baseCategory||publicCategories.find(c=>c.id===optional||c.slug===optional);
 const invalidCategory=categoryState.status==='ready'&&!!(requestedSlug||optional)&&!selectedPublic;
 let filters:DiscoveryFilters,queryError='';try{if(categoryState.status==='ready'&&requestedSlug&&optional&&optional!==requestedSlug&&optional!==baseCategory?.id)throw Error('The category filter must match this collection.');const raw=Object.fromEntries(params);delete raw.search;delete raw.category;filters=discoveryFilters({...raw,q:params.get('search')||initialSearch,...(selectedPublic?{category:selectedPublic.slug}:{})});}catch(e){queryError=(e as Error).message;filters=discoveryFilters({});}
 const [searchText,setSearchText]=useState(params.get('search')||initialSearch),[drawer,setDrawer]=useState(false),[draft,setDraft]=useState(filters),[minText,setMinText]=useState(filters.minPrice===null?'':(filters.minPrice/100).toString()),[maxText,setMaxText]=useState(filters.maxPrice===null?'':(filters.maxPrice/100).toString()),[error,setError]=useState('');
 const dialog=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(!drawer)return;const old=document.body.style.overflow;document.body.style.overflow='hidden';dialog.current?.querySelector<HTMLElement>('button,input,select')?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setDrawer(false);trigger.current?.focus();}if(e.key==='Tab'){const nodes=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled)')||[]),first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};document.addEventListener('keydown',key);return()=>{document.body.style.overflow=old;document.removeEventListener('keydown',key);};},[drawer]);
 const options:Record<string,string>={browse:'1',sort:filters.sort,...(campaignSlug?{campaign:campaignSlug}:{}),...(selectedPublic?{category:selectedPublic.slug}:{}),...(filters.q?{q:filters.q}:{}),...(filters.colors.length?{colors:filters.colors.join('|')}:{}),...(filters.inStock?{inStock:'true'}:{}),...(saleOnly||filters.sale?{sale:'true'}:{}),...(filters.minPrice!==null?{minPrice:String(filters.minPrice)}:{}),...(filters.maxPrice!==null?{maxPrice:String(filters.maxPrice)}:{})};
 const page=usePublicCatalog(options,!queryError&&!invalidCategory&&(!(requestedSlug||optional)||categoryState.status==='ready')),filteredProducts=page.items.map(storefrontProduct);
 const change=(value:Partial<DiscoveryFilters>,destination=path)=>onNavigate(discoveryUrl(destination,{...filters,...value,category:requestedSlug&&destination.split('?')[0]===path.split('?')[0]?'':value.category??(requestedSlug?'':optional)}));
 const clear=()=>change({colors:[],minPrice:null,maxPrice:null,inStock:false,sale:false,category:'',sort:'featured'});
 const active=filters.colors.length?1:0,activeCount=active+Number(filters.inStock)+Number(filters.minPrice!==null||filters.maxPrice!==null)+Number(!!optional&&!requestedSlug)+Number(filters.sale&&!saleOnly);
 const open=()=>{setDraft(filters);setMinText(filters.minPrice===null?'':String(filters.minPrice/100));setMaxText(filters.maxPrice===null?'':String(filters.maxPrice/100));setError('');setDrawer(true);};
 function apply(){try{const next={...draft,minPrice:paise(minText),maxPrice:paise(maxText)};discoveryFilters({...options,minPrice:next.minPrice===null?'':String(next.minPrice),maxPrice:next.maxPrice===null?'':String(next.maxPrice)});change(next);setDrawer(false);}catch(e){setError((e as Error).message);}}
 const categoryLink=(slug?:string)=>campaignSlug?change({category:slug||''}):change({category:''},slug?'/collections/'+slug:'/shop');
 return <div className="discovery-page space-y-4"><section className="discovery-heading"><h1>{campaignTitle||baseCategory?.name||(filters.q?'Search: "'+(params.get('search')||initialSearch)+'"':'Shop All Sarees')}</h1>{page.state==='loading'&&<Skeleton className="sk-short"/>}{page.state==='ready'&&!invalidCategory&&!queryError&&<span>{page.total===undefined?filteredProducts.length+' sarees shown':page.total+' Sarees'}</span>}</section>
 <div className="discovery-wrap"><form className="discovery-search" onSubmit={e=>{e.preventDefault();change({q:searchText});}}><Search size={18}/><label className="sr-only" htmlFor="catalog-search">Search products</label><input id="catalog-search" value={searchText} maxLength={100} onChange={e=>setSearchText(e.target.value)} placeholder="Search sarees, code, fabric or colour"/><button>Search</button></form>
 {categoryState.status==='error'&&<div role="alert">Categories are unavailable. <button onClick={retryCategories}>Retry categories</button></div>}
 <nav className="discovery-categories" aria-label="Catalog categories"><button onClick={()=>categoryLink()}>All Sarees</button>{publicCategories.map(c=><button key={c.id} aria-current={c.id===selectedPublic?.id?'page':undefined} onClick={()=>campaignSlug?change({category:c.slug}):categoryLink(c.slug)}>{c.name}</button>)}</nav>
 {baseCategory?.description&&<p>{baseCategory.description}</p>}
 <div className="discovery-toolbar"><button ref={trigger} onClick={open}><SlidersHorizontal size={18}/>Filters{activeCount>0&&<span>{activeCount}</span>}</button><label>Sort: <select aria-label="Sort products" value={filters.sort} onChange={e=>change({sort:e.target.value as DiscoveryFilters['sort']})}>{discoverySorts.map(s=><option key={s} value={s}>{labels[s]}</option>)}</select></label></div>
 <div className="discovery-chips">{filters.sale&&!saleOnly&&<button onClick={()=>change({sale:false})}>On sale ×</button>}{requestedSlug&&selectedPublic&&<span>Collection: {selectedPublic.name}</span>}{optional&&!requestedSlug&&selectedPublic&&<button onClick={()=>change({category:''})}>Category: {selectedPublic.name} ×</button>}{filters.q&&<button onClick={()=>change({q:''})}>Search: {params.get('search')||initialSearch} ×</button>}{filters.colors.map(color=><button key={color} onClick={()=>change({colors:filters.colors.filter(c=>c!==color)})}>Colour: {color} ×</button>)}{filters.inStock&&<button onClick={()=>change({inStock:false})}>In stock ×</button>}{(filters.minPrice!==null||filters.maxPrice!==null)&&<button onClick={()=>change({minPrice:null,maxPrice:null})}>Price: {formatINR((filters.minPrice||0)/100)} – {filters.maxPrice===null?'Any':formatINR(filters.maxPrice/100)} ×</button>}{activeCount>0&&<button onClick={clear}>Clear Filters</button>}</div></div>
 <main className="max-w-7xl mx-auto px-4 py-2"><Updating busy={page.hasLoaded&&page.busy} error={page.hasLoaded&&page.error} retry={page.retry}/>
 {queryError?<section role="alert"><p>{queryError}</p><button onClick={()=>onNavigate(discoveryUrl(path,{q:filters.q}))}>Reset optional filters</button></section>:invalidCategory?<section className="discovery-state"><h2>Category not found.</h2><p>This collection is missing or disabled.</p><button onClick={()=>categoryLink()}>Continue Shopping</button></section>:(requestedSlug||optional)&&categoryState.status!=='ready'?<Loading kind="products" label="Loading category" retry={retryCategories}/>:page.state==='loading'?<Loading kind="products" label="Finding products" retry={page.retry}/>:page.state==='error'?<Recovery retry={page.retry} label="Retry products" message="Unable to load products. Please try again."/>:filteredProducts.length===0?<section className="discovery-state"><h2>{filters.q||activeCount?'No products found.':'No products available yet.'}</h2><p>{filters.q||activeCount?'Try another search or adjust your filters.':'Please check back or contact us for more information.'}</p>{activeCount>0&&<button onClick={clear}>Clear Filters</button>}<a href="/contact" onClick={e=>{e.preventDefault();onNavigate('/contact');}}>Contact Us</a></section>:(
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {filteredProducts.map((product) => {
              const wishlisted = isWishlisted(product.id);
              return (
                <article
                  key={product.id}
                  className="group bg-white rounded-lg border border-[#E8DDD6] overflow-hidden flex flex-col transition-all hover:border-[#B88A44] shadow-xs hover:shadow-sm"
                >
                  {/* 3:4 Image Box with Badges */}
                  <div
                    className="shop-product-art relative w-full aspect-[3/4] bg-[#F4EEE5] overflow-hidden cursor-pointer"
                    onClick={() => onNavigate(`/product/${product.slug || product.id}`)}
                  >
                    <ImageState
                      src={product.images.full}
                      alt={product.gallery?.find(image=>image.url===product.images.full)?.alt || product.name}
                      className="w-full h-full object-contain"
                    />

                    {/* Wishlist Heart Button */}
                    <button

                      aria-label={`Save ${product.name} to wishlist`}
                      aria-pressed={wishlisted}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWishlist(product);
                      }}
                      className="absolute z-20 top-2 right-2 w-11 h-11 bg-white/85 backdrop-blur-sm rounded-full flex items-center justify-center text-[#780D24] active:scale-90 transition-transform shadow-xs"
                      type="button"
                    >
                      <span className={`material-symbols-outlined text-[18px] ${wishlisted ? 'fill text-[#780D24]' : ''}`}>
                        favorite
                      </span>
                    </button>

                    {/* Sold out overlay */}
                    {!product.inStock && (
                      <div className="absolute inset-0 bg-[#231919]/50 flex flex-col items-center justify-center p-3 text-center backdrop-blur-[1px]">
                        <span className="font-sans text-[11px] uppercase tracking-widest text-[#FBF7F0] bg-[#392E2E]/90 px-3 py-1 rounded-sm border border-white/20 font-medium">
                          Sold Out
                        </span>
                        <button
                          disabled={!demoEnabled}
                          onClick={(e) => {
                            e.stopPropagation();
                            alert('Stock notifications are not connected. No subscription was created.');
                          }}
                          className="mt-2.5 w-full bg-white text-[#231919] font-sans text-[10px] font-semibold py-1.5 px-2 rounded-lg shadow-sm border border-[#E8DDD6] active:scale-95 transition-transform flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px] text-[#780D24]">
                            notifications
                          </span>
                          <span className="truncate">Notifications unavailable</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Details Card */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h3
                        onClick={() => onNavigate(`/product/${product.slug || product.id}`)}
                        className="font-serif text-[14px] leading-snug line-clamp-2 text-[#231919] cursor-pointer hover:text-[#780D24] transition-colors"
                      >
                        {product.name}
                      </h3>
                      {product.category?.trim()&&<p className="shop-product-category font-sans text-[11px] text-[#5F5552] mt-1" title={product.category}>
                        {product.category}
                      </p>}
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#F4EEE5]">
                      <div className="flex flex-wrap gap-x-2 gap-y-1 items-baseline justify-between">
                        <span className="font-sans text-[16px] font-bold text-[#780D24]">
                          {formatINR(product.price)}
                        </span>
                        {product.originalPrice ? (
                          <span className="text-[11px] text-[#5F5552] line-through">
                            {formatINR(product.originalPrice)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#5F5552]">{product.inStock ? 'In stock' : 'Out of stock'}</span>
                        )}
                      </div>

                      {product.inStock ? (
                        <button
                          aria-label="Add to Bag"
                          onClick={() => onAddToCart(product)}
                          className="w-full mt-2.5 min-h-11 py-2 bg-[#780D24] hover:bg-[#5E091B] text-white rounded text-[11px] font-semibold tracking-wider uppercase font-sans flex items-center justify-center gap-1 active:scale-95 transition-all shadow-xs"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            shopping_bag
                          </span>
                          <span>Add to Bag</span>
                        </button>
                      ) : (
                        <div className="w-full mt-2.5 py-1.5 text-center text-[10px] font-sans uppercase tracking-wider text-[#780D24] font-medium">
                          Out of stock
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
 )}
 {page.hasMore&&<div className="discovery-more"><button disabled={page.busy} onClick={page.loadMore}>{page.busy?'Loading...':'Load more matching products'}</button></div>}
 </main>
 {drawer&&<div className="discovery-backdrop" onClick={()=>setDrawer(false)}><div ref={dialog} className="discovery-dialog" role="dialog" aria-modal="true" aria-label="Refine Collection" onClick={e=>e.stopPropagation()}><header><h2>Refine Collection</h2><button aria-label="Cancel filters" onClick={()=>{setDrawer(false);trigger.current?.focus();}}><X size={20}/></button></header><div className="discovery-fields">{error&&<p role="alert">{error}</p>}
 <label>Weave &amp; Category{requestedSlug?<span>{baseCategory?.name||'Current collection'}</span>:<select aria-label="Filter category" value={draft.category} onChange={e=>setDraft(d=>({...d,category:e.target.value}))}><option value="">All Sarees</option>{publicCategories.map(c=><option key={c.id} value={c.slug}>{c.name}</option>)}</select>}</label>
 <fieldset><legend>Price range (₹)</legend><div className="discovery-prices"><label>Minimum price<input inputMode="decimal" value={minText} onChange={e=>setMinText(e.target.value)} maxLength={15}/></label><label>Maximum price<input inputMode="decimal" value={maxText} onChange={e=>setMaxText(e.target.value)} maxLength={15}/></label></div><small>Leave either bound empty for no limit.</small></fieldset>
 <fieldset><legend>Authentic Palette</legend>{page.facets?.colors.length?<div className="discovery-colors">{page.facets.colors.map(c=><label key={c.name}><input type="checkbox" checked={draft.colors.includes(c.name.toLocaleLowerCase())} onChange={e=>setDraft(d=>({...d,colors:e.target.checked?[...d.colors,c.name.toLocaleLowerCase()]:d.colors.filter(n=>n!==c.name.toLocaleLowerCase())}))}/><i style={{backgroundColor:c.hex}}/>{c.name}</label>)}</div>:<small>Colour options appear when catalog data is available.</small>}</fieldset>
 <label className="discovery-stock"><span>In-stock items</span><input type="checkbox" checked={draft.inStock} onChange={e=>setDraft(d=>({...d,inStock:e.target.checked}))}/></label><p className="discovery-help">Colours match any selected colour. Category, price, availability and search must all match. Changes apply when you select Apply Filters.</p></div>
 <footer><button onClick={()=>{setDraft({...filters,category:requestedSlug?filters.category:'',colors:[],inStock:false,minPrice:null,maxPrice:null});setMinText('');setMaxText('');setError('');}}>Reset</button><button onClick={()=>{setDrawer(false);trigger.current?.focus();}}>Cancel</button><button className="primary" onClick={apply}>Apply Filters</button></footer></div></div>}
 </div>;
};
