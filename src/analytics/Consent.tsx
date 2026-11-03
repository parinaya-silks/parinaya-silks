import {useEffect,useState,useSyncExternalStore} from 'react';
import {analyticsConsent,analyticsPreferenceVisible,privacySignal,setAnalyticsConsent,subscribeConsent} from './browser.ts';
import './consent.css';
const openEvent='parinaya:analytics-preferences';
export function AnalyticsPreferencesButton(){return analyticsPreferenceVisible()?<button type="button" className="analytics-preferences" onClick={()=>window.dispatchEvent(new Event(openEvent))}>Analytics preferences</button>:null;}
export function AnalyticsConsent({path}:{path:string}){
 const consent=useSyncExternalStore(subscribeConsent,analyticsConsent,()=> 'unknown' as const),[editing,setEditing]=useState(false);
 useEffect(()=>{const open=()=>setEditing(true);window.addEventListener(openEvent,open);return()=>window.removeEventListener(openEvent,open);},[]);
 useEffect(()=>setEditing(false),[path]);
 if(!analyticsPreferenceVisible()||(!editing&&(consent!=='unknown'||privacySignal())))return null;
 const choose=(value:'granted'|'denied')=>{setAnalyticsConsent(value);setEditing(false);};
 return <section className="analytics-consent" aria-label="Analytics preferences"><h2>Optional analytics</h2><p>Allow Google Analytics to measure page visits and help improve the store? Shopping works with analytics off.</p><p><a href="/privacy-policy">Privacy Policy</a></p>{privacySignal()&&<p>Your browser privacy preference keeps analytics off.</p>}<div><button type="button" disabled={privacySignal()} onClick={()=>choose('granted')}>Allow analytics</button><button type="button" onClick={()=>choose('denied')}>No thanks</button>{editing&&consent!=='unknown'&&<button type="button" onClick={()=>setEditing(false)}>Close</button>}</div></section>;
}
