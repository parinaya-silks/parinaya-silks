import {ProductError} from '../products/model.ts';
import {exact,text,noteText} from '../orders/model.ts';
import {contactPhone,contactEmail,contactCountries,phoneLink,emailLink,type CountryCode} from '../contact/model.ts';
export {phoneLink,emailLink};
export interface EnquiryInput {name:string;email:string;phone:string;country:CountryCode;message:string}
export type EnquiryStatus='New'|'Read'|'Replied';
export interface EnquiryRow {id:string;name:string;email:string;phone:string;preview:string;status:EnquiryStatus;createdAt:number;revision:number}
export interface Enquiry extends EnquiryRow {message:string}
export interface EnquiryPage {items:EnquiryRow[];nextCursor:string|null}
export const blankEnquiry=():EnquiryInput=>({name:'',email:'',phone:'',country:'IN',message:''});
export function validateEnquiry(value:unknown):EnquiryInput {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new ProductError('invalid','Check the contact form fields.');
 const r=value as EnquiryInput;exact(r as unknown as Record<string,unknown>,['name','email','phone','country','message']);const fields:Record<string,string>={};
 const read=(key:keyof EnquiryInput,fn:()=>string)=>{try{return fn();}catch(e){fields[key]=(e as Error).message;return '';}};
 const name=read('name',()=>text(r.name,160,true)),email=read('email',()=>{const v=contactEmail(r.email);if(!v)throw Error('Enter your email address.');return v;}),message=read('message',()=>{const v=noteText(r.message,2000);if(!v)throw Error('Enter your message.');return v;});
 if(!contactCountries.includes(r.country))fields.country='Choose a valid country code.';
 const phone=read('phone',()=>{const v=text(r.phone,50);return v?contactPhone(v,r.country):'';});
 if(Object.keys(fields).length)throw new ProductError('invalid','Please check the highlighted fields.',fields);
 return {name,email,phone,country:r.country,message};
}
export function enquiryTerm(value:string){const v=value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');return /^[+\d\s().-]+$/.test(v)?v.replace(/\D/g,''):v;}
export function enquiryFilters(search:unknown,status:unknown){if(typeof search!=='string'||search.length>100||typeof status!=='string'||!['All','New','Read','Replied'].includes(status))throw new ProductError('invalid','Choose valid enquiry filters.');return {search:enquiryTerm(search),status:status as 'All'|EnquiryStatus};}
export const enquiryDate=(value:number)=>new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}).format(value)+' IST';
