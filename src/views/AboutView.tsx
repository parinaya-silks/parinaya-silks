import React from 'react';
import {useStoreContent} from '../content/public.tsx';
import {publicAbout,fallbackAbout} from '../about/model.ts';
import {AboutCopy} from '../about/AboutCopy.tsx';
import '../about/about.css';
export const AboutView=({onNavigate}:{onNavigate:(path:string)=>void})=>{
 const {content,status,retry}=useStoreContent();
 return <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-6"><nav aria-label="Breadcrumb"><button onClick={()=>onNavigate('/')}>Home</button> / About Us</nav>{status==='error'&&<div role="alert">Unable to refresh About Us. <button onClick={retry}>Retry</button></div>}<AboutCopy value={content.about??publicAbout(fallbackAbout())}/>{!content.aboutSaved&&<img className="about-legacy-image" src="https://lh3.googleusercontent.com/aida/AEtjO1WWb89xEHPaMRY7UWw_vRreP4eG4DkHD20JEzI2M_ZcPzkU-vjrJ-1JhOm7DBGy6cJx6R9w2o1Sd7rumSzUCf-zvPC7p8-Q-JoFPhmWgW7Q-Fg6WS7-yBQWEoE4U8aCbvrZG1oqOZzP0KurIPpnIS88te2iD083FdfetS4W-MedTChT-0BI2suALPQVhyWmr9RACAtbs4dpH345PR5Opmuz8NnbjyTLmQZSp27o9Pzha-PjrhRlZZNE6w" alt="Parinaya Silks saree photography" onError={e=>{e.currentTarget.hidden=true;}}/>}<div className="flex gap-4 flex-wrap"><button className="px-6 py-3 rounded bg-[#780D24] text-white" onClick={()=>onNavigate('/shop')}>Shop Sarees</button><button className="text-[#780D24] underline" onClick={()=>onNavigate('/contact')}>Contact Us</button></div></div>;
};
