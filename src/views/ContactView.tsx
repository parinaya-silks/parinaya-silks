import React,{useState} from 'react';
import {Phone,Mail,MessageCircle,MapPin,Clock,Instagram,Facebook,ArrowUpRight} from 'lucide-react';
import {useStoreContent} from '../content/public.tsx';
import {phoneLink,emailLink,whatsappLink} from '../contact/model.ts';
import {ContactForm} from '../enquiries/ContactForm.tsx';
import '../content/editorial.css';
function External({href,children,...props}:React.AnchorHTMLAttributes<HTMLAnchorElement>){return <a {...props} href={href} target={href?.startsWith('https:')?'_blank':undefined} rel="noopener noreferrer">{children}</a>;}
export const ContactView=({onNavigate}:{onNavigate:(path:string)=>void})=>{
 const {content,status,retry,hasLoaded}=useStoreContent(),contact=content.contact,[order,setOrder]=useState('');
 const whatsapp=whatsappLink(contact),orderWhatsapp=whatsappLink(contact,[contact.whatsappMessage,order.trim()?'Order: '+order.trim():''].filter(Boolean).join('\n'));
 const channels=[{label:'Phone',value:contact.mobile,href:phoneLink(contact.mobile),Icon:Phone},{label:'WhatsApp',value:contact.whatsappNumber,href:whatsapp,Icon:MessageCircle},{label:'Email',value:contact.email,href:emailLink(contact.email),Icon:Mail}].filter(c=>c.value&&c.href);
 return <div className="editorial-page contact-storefront">
  <nav aria-label="Breadcrumb"><a href="/" onClick={e=>{if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0){e.preventDefault();onNavigate('/');}}}>Home</a><span>/</span>Contact Us</nav>
  <header className="contact-editorial-heading"><span className="editorial-eyebrow">Customer care</span><h1>We’re Here to Help</h1><i className="editorial-rule"/><p>For questions about our sarees, orders or shopping assistance, send us a message or use the contact details below.</p></header>
  <div className="contact-editorial-grid">
   <section className="contact-editorial-information" aria-label="Contact Channels">
    {status==='error'&&<div className="editorial-error" role="alert">{hasLoaded?'Unable to refresh contact information. Showing the last loaded details.':'Unable to load contact information.'} <button onClick={retry}>Retry contact information</button></div>}
    {!hasLoaded&&status==='loading'&&<div className="editorial-loading" role="status">Loading contact information...</div>}
    {hasLoaded&&<>
     {!!channels.length&&<section className="contact-direct-card"><h2>Direct contact</h2><div className="contact-quick-actions">{channels.map(({label,value,href,Icon})=><External key={label} href={href}><span className="contact-channel-icon"><Icon size={19}/></span><span><small>{label}</small><b>{value}</b></span><ArrowUpRight size={15}/></External>)}</div></section>}
     {whatsapp&&<details className="contact-order-chat"><summary><MessageCircle size={18}/>Have an order reference?</summary><div><label htmlFor="contact-order-ref">Order reference (optional)</label><input id="contact-order-ref" value={order} onChange={e=>setOrder(e.target.value)} maxLength={100} placeholder="Your order number"/><External className="editorial-button" href={orderWhatsapp}>Chat on WhatsApp <ArrowUpRight size={16}/></External><small>Opens WhatsApp. You choose whether to send the message.</small></div></details>}
     {(contact.address||contact.hours||contact.instagram||contact.facebook)&&<section className="contact-location-card"><h2><MapPin size={20}/>Contact Information</h2>{contact.address&&<div><h3>Business address</h3><p>{contact.address}</p>{contact.mapsUrl&&<External className="editorial-button" href={contact.mapsUrl}>Open in Google Maps <ArrowUpRight size={15}/></External>}</div>}{contact.hours&&<div><h3><Clock size={16}/>Business hours</h3><p>{contact.hours}</p></div>}{(contact.instagram||contact.facebook)&&<div className="contact-social-links">{contact.instagram&&<External href={contact.instagram}><Instagram size={17}/>Instagram</External>}{contact.facebook&&<External href={contact.facebook}><Facebook size={17}/>Facebook</External>}</div>}</section>}
     {![...channels,contact.address,contact.hours,contact.instagram,contact.facebook].some(Boolean)&&<p className="contact-no-methods">Contact information is not currently available.</p>}
    </>}
   </section>
   <ContactForm/>
  </div>
 </div>;
};
