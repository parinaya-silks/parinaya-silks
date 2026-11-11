import {ProductError} from '../products/model.ts';

export interface Coordinates {latitude:number;longitude:number}
export interface DispatchInput extends Coordinates {name:string;fullAddress:string;mapsUrl:string;active:boolean}
export interface DeliverySnapshot {quoteId:string;pricingRevision:number;dispatchRevision:number;slabMaximumMeters:number;feePaise:number;free:boolean;quotedAt:number}
export interface DistanceSlab {upToMeters:number;feePaise:number;enabled:boolean}
export const defaultSlabs=():DistanceSlab[]=>[5000,10000,20000,30000].map((upToMeters,i)=>({upToMeters,feePaise:[4000,6000,9000,12000][i],enabled:true}));
export const blankDispatch=():DispatchInput=>({name:'',fullAddress:'',latitude:NaN,longitude:NaN,mapsUrl:'',active:false});
export function coordinates(value:unknown):Coordinates {
 const v=value as Coordinates;
 if(!v||typeof v.latitude!=='number'||typeof v.longitude!=='number'||!Number.isFinite(v.latitude)||!Number.isFinite(v.longitude)||Math.abs(v.latitude)>90||Math.abs(v.longitude)>180)throw new ProductError('invalid','Enter valid latitude (-90 to 90) and longitude (-180 to 180).');
 return {latitude:v.latitude,longitude:v.longitude};
}
export function validateDispatch(value:unknown):DispatchInput {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new ProductError('invalid','Enter the dispatch location.');
 const v=value as Record<string,unknown>,allowed=Object.keys(blankDispatch());
 if(Object.keys(v).some(k=>!allowed.includes(k))||allowed.some(k=>!(k in v)))throw new ProductError('invalid','Unsupported dispatch fields.');
 for(const [key,max]of [['name',100],['fullAddress',500],['mapsUrl',500]] as const)if(typeof v[key]!=='string'||v[key].length>max||/[\x00-\x1f\x7f]/.test(v[key])||(key!=='mapsUrl'&&!v[key].trim()))throw new ProductError('invalid','Enter a valid dispatch name and full address.');
 if(typeof v.active!=='boolean')throw new ProductError('invalid','Choose the dispatch status.');
 const mapsUrl=(v.mapsUrl as string).trim();
 if(mapsUrl){let url:URL;try{url=new URL(mapsUrl);}catch{throw new ProductError('invalid','Use a Google Maps HTTPS link.');}if(url.protocol!=='https:'||url.username||url.password||!['www.google.com','google.com','maps.google.com','maps.app.goo.gl','goo.gl'].includes(url.hostname)||(['www.google.com','google.com'].includes(url.hostname)&&!url.pathname.startsWith('/maps'))||(url.hostname==='goo.gl'&&!url.pathname.startsWith('/maps')))throw new ProductError('invalid','Use a Google Maps HTTPS link.');}
 return {...coordinates(v),name:(v.name as string).trim(),fullAddress:(v.fullAddress as string).trim(),mapsUrl,active:v.active};
}
export function validateSlabs(value:unknown):DistanceSlab[] {
 if(!Array.isArray(value)||!value.length||value.length>20)throw new ProductError('invalid','Add between 1 and 20 delivery slabs.');
 let previous=0;
 return value.map(raw=>{
  if(!raw||typeof raw!=='object'||Object.keys(raw).sort().join(',')!=='enabled,feePaise,upToMeters'||!Number.isSafeInteger(raw.upToMeters)||raw.upToMeters<=previous||raw.upToMeters>1000000||!Number.isSafeInteger(raw.feePaise)||raw.feePaise<0||raw.feePaise>10000000||typeof raw.enabled!=='boolean')throw new ProductError('invalid','Slabs must have increasing maximum distances, valid fees and an enabled status. Each range starts immediately after the previous maximum.');
  previous=raw.upToMeters;return {upToMeters:raw.upToMeters,feePaise:raw.feePaise,enabled:raw.enabled};
 });
}
export function distanceFee(slabs:DistanceSlab[],distanceMeters:number,merchandise:bigint,freeEnabled:boolean,threshold:number){
 if(!Number.isSafeInteger(distanceMeters)||distanceMeters<0||merchandise<0n)throw new ProductError('invalid','Invalid delivery calculation.');
 const slab=slabs.find(s=>distanceMeters<=s.upToMeters);
 // Disabled ranges remain unavailable; never jump to another range or waive coverage.
 if(!slab||!slab.enabled)return null;
 const free=freeEnabled&&merchandise>=BigInt(threshold);
 return {feePaise:free?0:slab.feePaise,slabMaximumMeters:slab.upToMeters,free,remainingPaise:freeEnabled&&!free?String(BigInt(threshold)-merchandise):'0'};
}
export function codAvailable(raw:Record<string,unknown>|undefined):boolean {
 if(!raw)return true; // Preserve availability until the owner explicitly configures COD.
 return raw.schemaVersion===1&&Number.isSafeInteger(raw.revision)&&Number(raw.revision)>0&&raw.enabled===true;
}
