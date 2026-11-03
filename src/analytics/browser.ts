import {analyticsPage,CONSENT_KEY,consentValue,createPageViews,productionAnalytics,type Consent} from './policy.ts';
import {normalizePath} from '../utils/routing.ts';

declare global {interface Window {dataLayer?:IArguments[];gtag?:(...args:unknown[])=>void;}}
let remembered:Consent='unknown',views:ReturnType<typeof createPageViews>|undefined;
const changed='parinaya:analytics-consent';
const measurementId=()=>String(import.meta.env.VITE_GA_MEASUREMENT_ID||'').trim();
export function analyticsConfigured(){return typeof window!=='undefined'&&productionAnalytics({production:import.meta.env.PROD,deployment:import.meta.env.VITE_DEPLOYMENT_ENV,measurementId:measurementId(),href:location.href,automated:navigator.webdriver===true||import.meta.env.MODE==='test'||import.meta.env.MODE==='admin-test'});}
export function analyticsConsent():Consent{if(remembered!=='unknown')return remembered;try{return consentValue(localStorage.getItem(CONSENT_KEY));}catch{return 'unknown';}}
export function privacySignal(){return navigator.doNotTrack==='1'||navigator.doNotTrack==='yes'||(navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl===true;}
export function subscribeConsent(listener:()=>void){const storage=(event:StorageEvent)=>{if(event.key===CONSENT_KEY||event.key===null){remembered='unknown';listener();}};window.addEventListener(changed,listener);window.addEventListener('storage',storage);return()=>{window.removeEventListener(changed,listener);window.removeEventListener('storage',storage);};}
export function setAnalyticsConsent(value:Exclude<Consent,'unknown'>){remembered=value;try{localStorage.setItem(CONSENT_KEY,value);remembered='unknown';}catch{/* Session-only consent when storage is blocked. */}views?.preferenceChanged();if(value==='denied'){
 // Remove only this integration's GA cookies, never authentication or Bag data.
 try{for(const name of ['_ga','_ga_'+measurementId().slice(2)])for(const domain of ['',location.hostname,'.parinayasarees.com'])document.cookie=name+'=;Max-Age=0;Path=/;SameSite=Lax;Secure'+(domain?';Domain='+domain:'');}catch{/* Cookie restrictions never affect shopping. */}
 }window.dispatchEvent(new Event(changed));}
function controller(){if(views)return views;if(!analyticsConfigured())return;
 const id=measurementId(),disabled='ga-disable-'+id,disable=(value:boolean)=>{(window as unknown as Record<string,unknown>)[disabled]=value;};disable(true);
 views=createPageViews(id,{disable,command:(...args)=>window.gtag?.(...args),load:()=>new Promise<void>((resolve,reject)=>{
  // Fail closed if another installer appears; never add a second Google tag.
  if(window.gtag||document.querySelector('script[src*="googletagmanager.com"],script[src*="google-analytics.com"]')){reject();return;}
  window.dataLayer??=[];window.gtag=function(){window.dataLayer!.push(arguments);};
  const script=document.createElement('script');script.id='parinaya-ga4';script.async=true;script.referrerPolicy='origin';script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id);script.onload=()=>resolve();script.onerror=()=>reject();document.head.append(script);
 })},()=>location.href,()=>analyticsConfigured()&&analyticsConsent()==='granted'&&!privacySignal());
 const route=()=>views?.routeChanged();window.addEventListener('popstate',route);window.addEventListener('hashchange',route);subscribeConsent(()=>views?.preferenceChanged());return views;
}
export function trackStorefrontPage(path:string,title:string){try{
 const raw=location.hash.startsWith('#/')?location.hash.slice(1):location.pathname+location.search;
 // A product response or effect belonging to a previous route cannot emit a hit.
 if(normalizePath(raw)!==path)return;
 controller()?.page(location.href,title);
 }catch{/* Analytics is optional; it never interrupts business actions. */}}
export const analyticsPreferenceVisible=()=>analyticsConfigured()&&!!analyticsPage(location.href,'');
