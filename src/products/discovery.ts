import {ProductError,quantity,type PublicProductRecord} from './model.ts';
export const discoverySorts=['featured','newest','price-asc','price-desc'] as const;
export type DiscoverySort=typeof discoverySorts[number];
export interface DiscoveryFilters {q:string;category:string;sort:DiscoverySort;minPrice:number|null;maxPrice:number|null;colors:string[];inStock:boolean;sale:boolean}
export interface DiscoveryFacets {colors:{name:string;hex:string}[];maxPricePaise:number}
export function discoveryFilters(p:Record<string,string>):DiscoveryFilters {
 const allowed=['browse','campaign','cursor','q','category','sort','minPrice','maxPrice','colors','inStock','sale'];
 if(Object.keys(p).some(k=>!allowed.includes(k)))throw new ProductError('invalid','Unsupported catalog filter.');
 const q=(p.q||'').trim().toLocaleLowerCase(),category=p.category||'',sort=p.sort||'featured';
 if(q.length>100||/[\x00-\x1f\x7f]/.test(q)||category.length>100||category&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category)||!discoverySorts.includes(sort as DiscoverySort))throw new ProductError('invalid','Invalid catalog search or sort.');
 const price=(key:string)=>{if(p[key]===undefined||p[key]==='')return null;if(!/^\d+$/.test(p[key]))throw new ProductError('invalid','Invalid price filter.');const n=Number(p[key]);if(!Number.isSafeInteger(n)||n>100000000)throw new ProductError('invalid','Invalid price filter.');return n;};
 const minPrice=price('minPrice'),maxPrice=price('maxPrice');if(minPrice!==null&&maxPrice!==null&&minPrice>maxPrice)throw new ProductError('invalid','Minimum price exceeds maximum price.');
 const colors=[...new Set((p.colors||'').split('|').filter(Boolean).map(c=>c.trim().toLocaleLowerCase()))];
 if(colors.length>20||colors.some(c=>!c||c.length>80||/[\x00-\x1f\x7f]/.test(c)))throw new ProductError('invalid','Invalid colour filter.');
 for(const key of ['inStock','sale'])if(p[key]!==undefined&&!['true','false'].includes(p[key]))throw new ProductError('invalid','Invalid availability filter.');
 return {q,category,sort:sort as DiscoverySort,minPrice,maxPrice,colors,inStock:p.inStock==='true',sale:p.sale==='true'};
}
type Searchable=Pick<PublicProductRecord,'name'|'description'|'sku'|'categoryName'|'fabric'|'weaveType'|'colorName'|'colorHex'|'inventory'|'pricePaise'|'originalPricePaise'>;
export function matchesSearch(p:Searchable,q:string){return !q||[p.name,p.description,p.sku,p.categoryName,p.fabric,p.weaveType,p.colorName,...(p.inventory.variants||[]).map(v=>v.name)].join(' ').toLocaleLowerCase().includes(q);}
export function matchesFilters(p:Searchable,f:DiscoveryFilters){return matchesSearch(p,f.q)&&(f.minPrice===null||p.pricePaise>=f.minPrice)&&(f.maxPrice===null||p.pricePaise<=f.maxPrice)&&(!f.sale||!!p.originalPricePaise&&p.originalPricePaise>p.pricePaise)&&(!f.inStock||quantity(p)>0)&&(!f.colors.length||[p.colorName,...(p.inventory.variants||[]).map(v=>v.name)].some(n=>f.colors.includes(n.toLocaleLowerCase())));}
export function discoveryFacets(items:Searchable[],q:string):DiscoveryFacets {const colors=new Map<string,{name:string;hex:string}>();let maxPricePaise=0;for(const p of items){if(!matchesSearch(p,q))continue;maxPricePaise=Math.max(maxPricePaise,p.pricePaise);for(const v of [{name:p.colorName,hex:p.colorHex},...(p.inventory.variants||[])])if(v.name?.trim()&&/^#[a-f0-9]{6}$/i.test(v.hex))colors.set(v.name.toLocaleLowerCase(),{name:v.name,hex:v.hex});}return {colors:[...colors.values()].sort((a,b)=>a.name.localeCompare(b.name)),maxPricePaise};}
export function discoveryUrl(path:string,filters:Partial<DiscoveryFilters>){const base=path.split('?')[0],params=new URLSearchParams();if(filters.q?.trim())params.set('search',filters.q.trim());if(filters.category)params.set('category',filters.category);if(filters.sort&&filters.sort!=='featured')params.set('sort',filters.sort);if(filters.minPrice!=null)params.set('minPrice',String(filters.minPrice));if(filters.maxPrice!=null)params.set('maxPrice',String(filters.maxPrice));if(filters.colors?.length)params.set('colors',filters.colors.join('|'));if(filters.inStock)params.set('inStock','true');if(filters.sale)params.set('sale','true');return base+(params.size?'?'+params:'');}
