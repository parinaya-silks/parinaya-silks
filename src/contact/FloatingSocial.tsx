import {socialLinks} from './socialLinks.ts';
import {useEffect,useState} from 'react';
import {Instagram,Facebook,Share2,X} from 'lucide-react';
import {usePublicContact} from '../content/public.tsx';
import {whatsappLink} from './model.ts';

// Only the existing public projection is consumed; private/hidden settings never
// enter hrefs, names or data attributes. Empty saved links are the social off state.
export function FloatingSocial({path}:{path:string}){
 const contact=usePublicContact(),links=socialLinks(contact),[open,setOpen]=useState(false);
 useEffect(()=>setOpen(false),[path]);
 useEffect(()=>{if(!open)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);document.getElementById('social-follow-toggle')?.focus();}};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[open]);
 if(!links.length||!/^\/(?:$|shop(?:[/?]|$)|collections(?:[/?]|$)|sale(?:[/?]|$)|search(?:[/?]|$))/.test(path))return null;
 return <nav aria-label="Follow Parinaya Sarees" className="public-floating-social" data-open={open} data-whatsapp={!!whatsappLink(contact)}><button id="social-follow-toggle" className="social-follow-toggle" aria-label={open?'Close Follow Us':'Follow Us'} aria-controls="social-follow-links" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?<X size={19}/>:<Share2 size={19}/>}<span>Follow Us</span></button><div id="social-follow-links" className="social-follow-links">{links.map(({kind,href,label})=><a key={kind} href={href} target="_blank" rel="noopener noreferrer" aria-label={'Follow us on '+label}>{kind==='instagram'?<Instagram size={21}/>:<Facebook size={21}/>}<span>{label}</span></a>)}</div></nav>;
}
