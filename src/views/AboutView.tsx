import React,{useState} from 'react';
import {ArrowRight,BookOpen,MessageCircle} from 'lucide-react';
import {useStoreContent} from '../content/public.tsx';
import {publicAbout,fallbackAbout} from '../about/model.ts';
import {AboutCopy} from '../about/AboutCopy.tsx';
import {aboutSections} from '../about/story.ts';
import '../about/about.css';
import '../content/editorial.css';

export const AboutView=({onNavigate}:{onNavigate:(path:string)=>void})=>{
 const {content,status,retry,hasLoaded}=useStoreContent(),[failed,setFailed]=useState(false);
 const value=content.about??publicAbout(fallbackAbout()),sections=aboutSections(value.story,value.storyHeading);
 return <div className="editorial-page about-storefront">
  <nav aria-label="Breadcrumb"><a href="/" onClick={e=>{if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0){e.preventDefault();onNavigate('/');}}}>Home</a><span>/</span>About Us</nav>
  {status==='error'&&<div className="editorial-error" role="alert">{hasLoaded?'Unable to refresh About Us. Showing the last loaded content.':'Unable to load About Us.'} <button onClick={retry}>Retry About Us</button></div>}
  {!hasLoaded&&status==='loading'&&<div className="editorial-loading" role="status">Loading About Us...</div>}
  {hasLoaded&&<>
   <section className={'about-editorial-hero'+(failed?' without-image':'')} aria-labelledby="about-title">
    <header><span className="editorial-eyebrow">Our story</span><h1 id="about-title">{value.heading}</h1><i className="editorial-rule"/>{value.intro&&<p className="about-editorial-intro">{value.intro}</p>}{sections.length>0&&<div className="about-editorial-opening">{sections[0].heading&&<h2>{sections[0].heading}</h2>}<p>{sections[0].text}</p></div>}</header>
    {!failed&&<figure><img src="/assets/about-saree-editorial.jpg" alt="Decorative editorial photograph of a red and gold saree draped over a chair" width="512" height="382" onError={()=>setFailed(true)}/><figcaption>Saree details <span>Editorial inspiration</span></figcaption></figure>}
   </section>
   {sections.length>1&&<section className="about-story-sections" aria-label="More about Parinaya"><span className="editorial-eyebrow">Discover Parinaya</span><div>{sections.slice(1).map((s,i)=><article key={i}><BookOpen size={18}/><h2>{s.heading}</h2><p>{s.text}</p></article>)}</div></section>}
   {value.founder&&<div className="about-public-founder"><AboutCopy value={value} founderOnly/></div>}
   <section className="about-editorial-actions"><MessageCircle size={23}/><div><h2>Explore Parinaya Silks</h2><p>Browse the collection or contact our team for assistance.</p></div><div><a className="editorial-button primary" href="/shop">Explore sarees <ArrowRight size={16}/></a><a className="editorial-button" href="/contact">Contact Us</a></div></section>
  </>}
 </div>;
};
