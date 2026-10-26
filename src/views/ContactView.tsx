import React from 'react';
import {ContactChannels} from '../contact/ContactPresentation.tsx';
import {usePublicContact} from '../content/public.tsx';
import {ContactForm} from '../enquiries/ContactForm.tsx';
export const ContactView=({onNavigate}:{onNavigate:(path:string)=>void})=>{const contact=usePublicContact();return <div className="contact-page"><nav aria-label="Breadcrumb"><button onClick={()=>onNavigate('/')}>Home</button> / Contact Us</nav><header><h1>Reach out to Parinaya Silks</h1><p>For questions about our sarees, orders or shopping assistance, send us a message or use the contact details below.</p></header><div className="contact-page-grid"><aside><h2>Contact Information</h2><ContactChannels contact={contact}/></aside><ContactForm/></div></div>;};
