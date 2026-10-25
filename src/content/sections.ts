import {ProductError} from '../products/model.ts';
import {exact,noteText,text} from '../orders/model.ts';
export const contentSections=[
 {id:'home-featured',group:'Homepage',name:'Featured Sarees Section',explanation:'Heading, introduction and description above the existing collection grid.',kind:'home',path:'/'},
 {id:'home-categories',group:'Homepage',name:'Shop by Category Section',explanation:'Text above the existing featured-category navigation. Product/category assignments are unchanged.',kind:'home',path:'/'},
 {id:'shipping',group:'Policies',name:'Shipping Policy',explanation:'Owner-approved shipping wording. Charges are managed separately in Store Settings.',kind:'policy',path:'/shipping-policy'},
 {id:'returns',group:'Policies',name:'Returns & Exchanges',explanation:'Owner-approved return and exchange wording. Operational request settings remain unchanged.',kind:'policy',path:'/returns-policy'},
 {id:'privacy',group:'Policies',name:'Privacy Policy',explanation:'Use the business owner’s approved privacy wording.',kind:'policy',path:'/privacy-policy'},
 {id:'terms',group:'Policies',name:'Terms & Conditions',explanation:'Use the business owner’s approved terms and conditions.',kind:'policy',path:'/terms-conditions'},
 {id:'footer-brand',group:'Footer',name:'Brand Description',explanation:'Brand text under the storefront logo. Contact details remain in Contact Information.',kind:'footer',path:'/'},
 {id:'footer-support',group:'Footer',name:'Artisanal Supporting Note',explanation:'Supporting wording in the existing footer location/support column. No claims are supplied automatically.',kind:'footer',path:'/'},
] as const;
export type ContentSectionId=typeof contentSections[number]['id'];
export type SectionDefinition=typeof contentSections[number];
export type HomeText={heading:string;supportingText:string;description:string};
export type PolicyText={heading:string;text:string;approved:boolean};
export type FooterText={text:string};
export type SectionValue=HomeText|PolicyText|FooterText;
export type PublicWebsiteText=Partial<Record<'home-featured'|'home-categories',HomeText>>&Partial<Record<'footer-brand'|'footer-support',FooterText>>;
export type SectionRecord={id:ContentSectionId;value:SectionValue;added:boolean;updatedAt:number|null;updatedScope:'section'|'document'|'none'};
export type WebsiteSnapshot={revision:number;sections:SectionRecord[]};
export function sectionDefinition(id:unknown):SectionDefinition {const section=contentSections.find(s=>s.id===id);if(!section)throw new ProductError('invalid','Choose a supported website section.');return section;}
export function sectionValue(id:ContentSectionId,input:unknown):SectionValue {
 if(!input||typeof input!=='object'||Array.isArray(input))throw new ProductError('invalid','Enter valid section text.');const v=input as Record<string,unknown>,section=sectionDefinition(id);
 if(section.kind==='home'){exact(v,['heading','supportingText','description']);return {heading:text(v.heading,100),supportingText:noteText(v.supportingText,500),description:noteText(v.description,2000)};}
 if(section.kind==='policy'){exact(v,['heading','text','approved']);if(typeof v.approved!=='boolean')throw new ProductError('invalid','Confirm the policy wording is approved.');return {heading:text(v.heading,100),text:noteText(v.text,12000),approved:v.approved};}
 exact(v,['text']);return {text:noteText(v.text,2000)};
}
export function storedSection(raw:Record<string,any>,id:ContentSectionId):SectionValue {
 const section=sectionDefinition(id);const v=section.kind==='policy'?{heading:raw.policies?.[id]?.heading??'',text:raw.policies?.[id]?.text??'',approved:raw.policies?.[id]?.approved??false}:raw.textSections?.[id]??(section.kind==='home'?{heading:'',supportingText:'',description:''}:{text:''});
 try{return sectionValue(id,v);}catch{throw new ProductError('schema','Saved website text needs owner review.');}
}
export function hasSectionText(value:SectionValue){return 'heading' in value&&'description' in value?!![value.heading,value.supportingText,value.description].some(v=>v.trim()):!!('text' in value&&value.text.trim());}
function timestamp(value:any):number|null {const n=value?.toMillis?.();return typeof n==='number'&&Number.isFinite(n)?n:null;}
export function websiteSnapshot(raw:Record<string,any>):WebsiteSnapshot {
 const revision=raw.revision??0;if(!Number.isSafeInteger(revision)||revision<0)throw new ProductError('schema','Invalid website content revision.');
 return {revision,sections:contentSections.map(s=>{const value=storedSection(raw,s.id),specific=timestamp(raw.textSectionMeta?.[s.id]?.updatedAt),document=timestamp(raw.updatedAt);return {id:s.id,value,added:hasSectionText(value),updatedAt:specific??document,updatedScope:specific!==null?'section':document!==null?'document':'none'};})};
}
export function publicWebsiteText(raw:Record<string,any>):PublicWebsiteText {return Object.fromEntries(contentSections.filter(s=>s.kind!=='policy'&&raw.textSections?.[s.id]!==undefined).map(s=>[s.id,storedSection(raw,s.id)])) as PublicWebsiteText;}
