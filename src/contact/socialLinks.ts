import {contactUrl,type PublicContact} from './model.ts';
export function socialLinks(contact:Pick<PublicContact,'instagram'|'facebook'>){return (['instagram','facebook'] as const).flatMap(kind=>{try{const href=contactUrl(contact[kind],kind);return href?[{kind,href,label:kind==='instagram'?'Instagram':'Facebook'}]:[];}catch{return [];}});}
