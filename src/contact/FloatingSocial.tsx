import {socialLinks} from './socialLinks.ts';
import {Instagram,Facebook} from 'lucide-react';
import {usePublicContact} from '../content/public.tsx';
import {whatsappLink} from './model.ts';

// Only the existing public projection is consumed; private/hidden settings never
// enter hrefs, names or data attributes. Empty saved links are the social off state.
export function SocialLinks({links}:{links:ReturnType<typeof socialLinks>}){
 return <div className="social-follow-links">{links.map(({kind,href,label})=><a key={kind} href={href} target="_blank" rel="noopener noreferrer" aria-label={'Follow us on '+label}>{kind==='instagram'?<Instagram size={21}/>:<Facebook size={21}/>}<span>{label}</span></a>)}</div>;
}
export function FloatingSocial({path}:{path:string}){
 const contact=usePublicContact(),links=socialLinks(contact);
 if(!links.length||!/^\/(?:$|shop(?:[/?]|$)|collections(?:[/?]|$)|sale(?:[/?]|$)|search(?:[/?]|$))/.test(path))return null;
 return <nav aria-label="Follow Parinaya Sarees" className="public-floating-social" data-whatsapp={!!whatsappLink(contact)}><SocialLinks links={links}/></nav>;
}
