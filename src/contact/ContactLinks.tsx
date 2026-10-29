import React from 'react';
import {MessageCircle} from 'lucide-react';
import {usePublicContact} from '../content/public.tsx';
import {phoneLink,emailLink,whatsappLink} from './model.ts';
import './public.css';
export function ContactSupportLinks(){const contact=usePublicContact();return <div className="public-support-links">{contact.mobile&&<a href={phoneLink(contact.mobile)}>Call {contact.mobile}</a>}{contact.email&&<a href={emailLink(contact.email)}>{contact.email}</a>}{whatsappLink(contact)&&<a href={whatsappLink(contact)} target="_blank" rel="noopener noreferrer">WhatsApp Support</a>}{!contact.email&&!contact.mobile&&!whatsappLink(contact)&&<a href="/contact">Contact Us</a>}</div>;}
export function BusinessWhatsAppLink({message,children,...props}:{message?:string;children:React.ReactNode}&Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>,'href'>){const contact=usePublicContact(),href=whatsappLink(contact,message?[contact.whatsappMessage,message].filter(Boolean).join('\n'):undefined);return href?<a {...props} href={href} target="_blank" rel="noopener noreferrer">{children}</a>:null;}
export function FloatingContact({path}:{path:string}){const contact=usePublicContact(),href=whatsappLink(contact);if(!href||/^\/(?:contact|about|checkout|bag|product|account|order|orders)(?:\/|$)/.test(path))return null;return <a className="public-floating-contact" aria-label="Chat on WhatsApp" href={href} target="_blank" rel="noopener noreferrer"><MessageCircle size={23}/><span>WhatsApp</span></a>;}
