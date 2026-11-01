import {createHash} from 'node:crypto';
import {ProductError} from '../src/products/model.ts';
import {discoveryFacets,matchesFilters,type DiscoveryFilters} from '../src/products/discovery.ts';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
// All matching/filtering happens on the server before a 50-item public page.
// Cursors bind to both the query and its source revision; changes require a refresh.
export function discoveryPage<T extends Parameters<typeof matchesFilters>[0]&{id:string;revision?:number;updatedAt?:number|null}>(items:T[],filters:DiscoveryFilters,cursor:string|undefined,scope:string){
 const key=hash({scope,filters}),version=hash(items.map(p=>[p.id,p.revision,p.updatedAt,p.pricePaise,p.originalPricePaise,p.inventory,p.name,p.description,p.sku,p.categoryName,p.fabric,p.weaveType,p.colorName]));
 const matched=items.filter(p=>matchesFilters(p,filters));let start=0;
 if(cursor){let c;try{if(cursor.length>1000)throw Error();c=JSON.parse(Buffer.from(cursor,'base64url').toString('utf8'));if(!c||typeof c!=='object'||Array.isArray(c)||typeof c.key!=='string'||typeof c.version!=='string'||typeof c.last!=='string')throw Error();}catch{throw new ProductError('invalid','Invalid catalog cursor.');}if(c.key!==key||c.version!==version)throw new ProductError('conflict','Catalog results changed. Refresh your results.');start=matched.findIndex(p=>p.id===c.last)+1;if(start===0)throw new ProductError('conflict','Catalog results changed. Refresh your results.');}
 const page=matched.slice(start,start+50),nextCursor=start+50<matched.length?Buffer.from(JSON.stringify({key,version,last:page.at(-1)!.id})).toString('base64url'):null;
 return {items:page,nextCursor,total:matched.length,facets:discoveryFacets(items,filters.q)};
}
