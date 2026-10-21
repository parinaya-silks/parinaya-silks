import React,{useEffect,useState,type CSSProperties} from 'react';
import type {LoginImage} from './model.ts';

type PublicImage=Omit<LoginImage,'mediaId'>;
const fallback='/assets/customer-auth-portrait.jpg';
function safeImage(value:unknown):PublicImage|null {
  const image=value as PublicImage|null;
  if(!image||typeof image.url!=='string'||!/^https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9_-]+\/image\/upload\/[^\s?#]+$/.test(image.url)||typeof image.alt!=='string'||image.alt.length>200||![image.focalX,image.focalY].every(n=>Number.isInteger(n)&&n>=0&&n<=100)||!Number.isInteger(image.width)||!Number.isInteger(image.height))return null;
  return image;
}
export function LoginPortrait(){
  const [images,setImages]=useState<{desktop:PublicImage|null;mobile:PublicImage|null}>({desktop:null,mobile:null});
  const [failed,setFailed]=useState<string[]>([]),[desktop,setDesktop]=useState(()=>window.matchMedia('(min-width:1024px)').matches);
  useEffect(()=>{
    let active=true,busy=false;
    async function load(){if(busy)return;busy=true;try{const response=await fetch('/api/catalog?appearance=login',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)return;const data=await response.json();if(active)setImages({desktop:safeImage(data.desktop),mobile:safeImage(data.mobile)});}catch{/* Authentication always remains usable with the approved fallback. */}finally{busy=false;}}
    void load();const refresh=()=>{if(document.visibilityState==='visible')void load();};
    const media=window.matchMedia('(min-width:1024px)'),resize=()=>setDesktop(media.matches);media.addEventListener('change',resize);
    const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{active=false;clearInterval(timer);media.removeEventListener('change',resize);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[]);
  const usable=(device:'desktop'|'mobile')=>images[device]&&!failed.includes(images[device]!.url)?images[device]:null;
  const large=usable('desktop'),small=usable('mobile'),selected=desktop?large:small;
  const style={'--login-desktop-position':large?`${large.focalX}% ${large.focalY}%`:'50% 50%','--login-mobile-position':small?`${small.focalX}% ${small.focalY}%`:'50% 0%'} as CSSProperties;
  return <div className="customer-auth-portrait" style={style}><picture><source media="(min-width:1024px)" srcSet={large?.url||fallback}/><img src={small?.url||fallback} alt={selected?selected.alt||'Parinaya Silks portrait':'A woman wearing a maroon silk saree beside carved stone pillars'} fetchPriority="high" width="818" height="915" onError={event=>{const source=event.currentTarget.currentSrc;if(source.startsWith('https://res.cloudinary.com/'))setFailed(previous=>previous.includes(source)?previous:[...previous,source]);}}/></picture></div>;
}
