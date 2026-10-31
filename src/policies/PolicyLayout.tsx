import React,{useEffect,useRef} from 'react';
import {ArrowRight,ArrowUp,BookOpen,ChevronRight,Headphones,Shield,Truck,Undo2,Scale} from 'lucide-react';
import {policyPages,policyKeys,sectionAnchors,type PolicySection,type PolicyKey} from './model.ts';

const icons={privacy:Shield,terms:Scale,shipping:Truck,returns:Undo2};
const normalClick=(e:React.MouseEvent)=>e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey;
const scrollBehavior=():ScrollBehavior=>window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
export function PolicyLayout({policyKey,heading,preview=false,sections=[],notice,children,support,onNavigate}:{policyKey:PolicyKey;heading:string;preview?:boolean;sections?:PolicySection[];notice?:React.ReactNode;children?:React.ReactNode;support?:React.ReactNode;onNavigate:(path:string)=>void}){
 const root=useRef<HTMLDivElement>(null),anchors=sectionAnchors(policyKey,sections),current=policyPages[policyKey],related:PolicyKey=policyKey==='privacy'?'terms':policyKey==='shipping'?'returns':'shipping';
 useEffect(()=>{const header=document.querySelector('.storefront-header');if(!header)return;const update=()=>root.current?.style.setProperty('--policy-header-height',`${header.getBoundingClientRect().height+16}px`);update();const observer=new ResizeObserver(update);observer.observe(header);return()=>observer.disconnect();},[]);
 useEffect(()=>{const id=window.location.hash.slice(1);if(!anchors.some(section=>section.id===id))return;const frame=requestAnimationFrame(()=>{const target=document.getElementById(id);target?.focus({preventScroll:true});target?.scrollIntoView({block:'start',behavior:'instant'});});return()=>cancelAnimationFrame(frame);},[policyKey,sections.length]);
 const destination=(key:PolicyKey)=>policyPages[key].path+(preview?'?preview=policy':'');
 const link=(e:React.MouseEvent,path:string)=>{if(normalClick(e)){e.preventDefault();onNavigate(path);}};
 function jump(e:React.MouseEvent,id:string){if(!normalClick(e))return;e.preventDefault();const node=document.getElementById(id);if(node){node.focus({preventScroll:true});node.scrollIntoView({block:'start',behavior:scrollBehavior()});window.history.replaceState(window.history.state,'',window.location.pathname+window.location.search+'#'+id);}}
 const toc=<nav aria-label="On this page">{anchors.map((section,i)=><a key={section.id} href={'#'+section.id} onClick={e=>jump(e,section.id)}><span>{String(i+1).padStart(2,'0')}</span>{section.heading}<ChevronRight size={14}/></a>)}</nav>;
 return <div ref={root} className={'policy-page policy-'+policyKey}>
  <nav className="policy-breadcrumb" aria-label="Breadcrumb"><a href="/" onClick={e=>link(e,'/')}>Home</a><span>/</span><span>Policies &amp; Information</span><span>/</span><span aria-current="page">{current.title}</span></nav>
  <header className="policy-heading"><span>Policies &amp; Information</span><h1 id="policy-top" tabIndex={-1}>{heading}</h1><p>{current.intro}</p></header>
  {notice}
  <div className="policy-layout">
   <aside className="policy-sidebar" aria-label="Policy navigation">
    <nav className="policy-directory" aria-label="Policy Centre"><h2><Shield size={19}/>Policy Centre</h2>{policyKeys.map(key=>{const Icon=icons[key];return <a key={key} href={destination(key)} onClick={e=>link(e,destination(key))} aria-current={key===policyKey?'page':undefined}><Icon size={18}/><span>{policyPages[key].title}</span><ChevronRight size={15}/></a>;})}</nav>
    <div className="policy-mobile-selector"><label htmlFor="policy-document">Select policy document</label><select id="policy-document" value={policyKey} onChange={e=>onNavigate(destination(e.target.value as PolicyKey))}>{policyKeys.map(key=><option key={key} value={key}>{policyPages[key].title}</option>)}</select></div>
    {anchors.length>0&&<><section className="policy-desktop-index"><h2><BookOpen size={17}/>On this page</h2>{toc}</section><details className="policy-mobile-index" key={policyKey} open={policyKey!=='privacy'}><summary><BookOpen size={18}/>On this page <span>{anchors.length} sections</span></summary>{toc}</details></>}
    <section className="policy-side-support"><h2><Headphones size={18}/>Policy assistance</h2><p>Contact the Parinaya Silks team with any questions.</p>{support??<a href="/contact">Contact Us</a>}</section>
   </aside>
   <div className="policy-reading">
    {children}
    {anchors.length>0&&<article aria-label="Sample policy content" className="policy-sections">{anchors.map((section,i)=><section key={section.id} aria-labelledby={section.id}><h2 id={section.id} tabIndex={-1}><span>{String(i+1).padStart(2,'0')}</span>{section.heading}</h2>{section.paragraphs.map((p,j)=><p key={j}>{p}</p>)}{section.list&&<ul>{section.list.map((item,j)=><li key={j}>{item}</li>)}</ul>}{section.note&&<aside className="policy-note">{section.note}</aside>}{section.cards&&<div className="policy-info-cards">{section.cards.map((card,j)=><div key={j}><BookOpen size={20}/><h3>{card.heading}</h3><p>{card.text}</p></div>)}</div>}</section>)}</article>}
    <section className="policy-closing"><Headphones size={25}/><div><h2>Need clarification?</h2><p>Contact the Parinaya Silks team for assistance.</p></div><div><a className="policy-button primary" href="/contact" onClick={e=>link(e,'/contact')}>Contact Us <ArrowRight size={17}/></a><a className="policy-button" href={destination(related)} onClick={e=>link(e,destination(related))}>View {policyPages[related].title} <ArrowRight size={16}/></a></div></section>
    <div className="policy-back-top"><button onClick={()=>{window.history.replaceState(window.history.state,'',window.location.pathname+window.location.search);document.getElementById('policy-top')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:scrollBehavior()});}}>Back to Top <ArrowUp size={18}/></button></div>
   </div>
  </div>
 </div>;
}
