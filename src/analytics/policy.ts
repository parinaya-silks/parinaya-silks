import {BRAND_UPPER} from '../config/brand.ts';
import {normalizePath} from '../utils/routing.ts';

export const CONSENT_KEY='parinaya:analytics-consent:v1';
export type Consent='unknown'|'granted'|'denied';
export function consentValue(value:unknown):Consent{return value==='granted'||value==='denied'?value:'unknown';}
export function productionAnalytics(options:{production:boolean;deployment:string;measurementId:string;href:string;automated:boolean}){
 try{const url=new URL(options.href);return options.production&&options.deployment==='production'&&!options.automated&&/^G-[A-Z0-9]{6,20}$/.test(options.measurementId)&&url.protocol==='https:'&&!url.port&&['parinayasarees.com','www.parinayasarees.com'].includes(url.hostname);}catch{return false;}
}
const labels:Record<string,string>={'/':'Sarees','/shop':'Shop sarees','/search':'Search sarees','/collections':'Saree collections','/sale':'Sarees on sale','/product':'Saree details','/about':'About','/contact':'Contact','/shipping-policy':'Shipping policy','/returns-policy':'Returns and exchanges','/privacy-policy':'Privacy policy','/terms-conditions':'Terms and conditions','/wishlist':'Wishlist','/bag':'Shopping Bag','/login':'Account','/register':'Account','/forgot-password':'Account','/verify-email':'Account','/account':'Account','/account/addresses':'Account','/account/orders':'Account','/checkout':'Account','/checkout/delivery':'Account','/checkout/summary':'Account','/checkout/payment':'Account','/order-tracking':'Account','/order-confirmed':'Account','/order-result':'Account'};
export function analyticsPage(href:string,title:string){
 try{
  const url=new URL(href),route=normalizePath(url.hash.startsWith('#/')?url.hash.slice(1):url.pathname+url.search),raw=route.split('?')[0];
  if(url.pathname==='/admin'||url.pathname.startsWith('/admin/')||raw==='/admin'||raw.startsWith('/admin/'))return null;
  let path=raw,privatePage=/^\/(account|checkout|login|register|forgot-password|verify-email|order-)/.test(raw);
  if(/^\/(order-tracking|order-confirmed|order-result)\/[^/]+$/.test(raw))path=raw.slice(0,raw.lastIndexOf('/'));
  else if(/^\/account\/orders\/[^/]+$/.test(raw))path='/account/orders';
  else if(/^\/(product|collections|sale)\/[^/]+$/.test(raw)){
   const slug=raw.slice(raw.lastIndexOf('/')+1);
   if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>100||/\d{7,}|^[a-f0-9]{20,}$/i.test(slug))return null;
  }else if(!(path in labels))return null;
  const fallback=labels[path]||labels['/'+raw.split('/')[1]]||BRAND_UPPER;
  // Account headings are fixed. Never consume names, form state, query strings,
  // document.referrer or private order identifiers as analytics dimensions.
  const cleanTitle=privatePage?'Account | '+BRAND_UPPER:title&&title.length<=300&&!/[@\x00-\x1f\x7f]|\d[\d ()+.-]{6,}\d/.test(title)?title:fallback+' | '+BRAND_UPPER;
  return {key:url.origin+route,location:url.origin+path,title:cleanTitle};
 }catch{return null;}
}

export interface PageTransport {load:()=>Promise<void>;command:(...args:unknown[])=>void;disable:(disabled:boolean)=>void}
// Independent of React: Strict Mode and duplicate SEO effects share one session.
export function createPageViews(id:string,transport:PageTransport,href:()=>string,allowed:()=>boolean){
 let loading=false,loaded=false,failed=false,configured=false,last='',current:{href:string;title:string}|undefined,queue:NonNullable<ReturnType<typeof analyticsPage>>[]=[],referrer='';
 function sync(){const eligible=!failed&&!!analyticsPage(href(),'')&&allowed();transport.disable(!eligible);if(!eligible){queue=[];last='';referrer='';}return eligible;}
 function flush(){if(!loaded||!sync())return;try{for(const page of queue.splice(0)){
   const parameters={page_location:page.location,page_title:page.title,page_referrer:referrer};
   transport.command('set',parameters);
   if(!configured){transport.command('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});transport.command('consent','update',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});transport.command('js',new Date());transport.command('config',id,{...parameters,send_page_view:false,currency:'INR',allow_google_signals:false,allow_ad_personalization_signals:false});configured=true;}
   transport.command('event','page_view',{...parameters,send_to:id});referrer=page.location;
  }}catch{failed=true;queue=[];transport.disable(true);}}
 function page(hrefAtCommit:string,title:string){current={href:hrefAtCommit,title};if(hrefAtCommit!==href()||!sync()||failed)return;const safe=analyticsPage(hrefAtCommit,title);if(!safe||safe.key===last)return;last=safe.key;queue.push(safe);if(queue.length>100)queue.shift();if(loaded)flush();else if(!loading){loading=true;void transport.load().then(()=>{loaded=true;flush();}).catch(()=>{failed=true;queue=[];transport.disable(true);});}}
 return {page,routeChanged(){current=undefined;sync();},preferenceChanged(){sync();if(current)page(current.href,current.title);}};
}
