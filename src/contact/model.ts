import {parsePhoneNumberFromString,getCountries,getCountryCallingCode,type CountryCode} from 'libphonenumber-js/max';
import {exact,text,noteText} from '../orders/model.ts';
import {ProductError} from '../products/model.ts';
export {getCountryCallingCode,type CountryCode};
export const contactCountries=getCountries();
export interface ContactSettings {email:string;mobile:string;address:string;instagram:string;phoneCountry:CountryCode;whatsappCountry:CountryCode;whatsappEnabled:boolean;whatsappUseSupport:boolean;whatsappNumber:string;whatsappMessage:string;showAddress:boolean;addressDetails:{line1:string;line2:string;city:string;state:string;postalCode:string;country:string};mapsUrl:string;facebook:string;showHours:boolean;hours:string}
export type LegacyContact=Pick<ContactSettings,'email'|'mobile'|'address'|'instagram'>&Partial<Omit<ContactSettings,'email'|'mobile'|'address'|'instagram'>>;
export function phoneCountry(value:string):CountryCode{return parsePhoneNumberFromString(value)?.country||'IN';}
export function contactPhone(value:string,country:CountryCode='IN'){const raw=value.trim().replace(/[\s().-]/g,'');const p=/^\+?\d+$/.test(raw)?parsePhoneNumberFromString(raw,{defaultCountry:country,extract:false}):undefined;if(!p||p.ext||!p.isValid()||(!value.trim().startsWith('+')&&p.country!==country))throw new ProductError('invalid','Enter a valid international support phone number.');return p.number;}
export function contactEmail(value:string){const v=text(value,254);if(v&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))throw new ProductError('invalid','Enter a valid support email.');return v;}
export function contactUrl(value:string,kind:'instagram'|'facebook'|'maps'){
 const v=text(value,500);if(!v)return '';let u:URL;try{u=new URL(v);}catch{throw new ProductError('invalid','Enter a valid HTTPS '+kind+' URL.');}
 const host=u.hostname.toLowerCase(),path=u.pathname;
 const allowed=kind==='instagram'?['instagram.com','www.instagram.com'].includes(host)&&path!=='/':kind==='facebook'?['facebook.com','www.facebook.com','m.facebook.com'].includes(host)&&path!=='/':(['www.google.com','google.com','www.google.co.in','google.co.in'].includes(host)&&/^\/maps(?:\/|$)/.test(path))||['maps.google.com','maps.google.co.in'].includes(host)||host==='maps.app.goo.gl'&&path!=='/'||host==='goo.gl'&&path.startsWith('/maps/');
 if(u.protocol!=='https:'||u.username||u.password||u.port||!allowed||/[\x00-\x20\\]/.test(v))throw new ProductError('invalid','Use a supported HTTPS '+kind+' URL.');return u.href;
}
export function storedContact(raw:Partial<ContactSettings>={}):ContactSettings {
 return {email:raw.email??'',mobile:raw.mobile??'',address:raw.address??'',instagram:raw.instagram??'',phoneCountry:raw.phoneCountry??phoneCountry(raw.mobile??''),whatsappCountry:raw.whatsappCountry??phoneCountry(raw.whatsappNumber??''),whatsappEnabled:raw.whatsappEnabled??!!raw.mobile,whatsappUseSupport:raw.whatsappUseSupport??true,whatsappNumber:raw.whatsappNumber??'',whatsappMessage:raw.whatsappMessage??'',showAddress:raw.showAddress??!!raw.address,addressDetails:{line1:raw.addressDetails?.line1??'',line2:raw.addressDetails?.line2??'',city:raw.addressDetails?.city??'',state:raw.addressDetails?.state??'',postalCode:raw.addressDetails?.postalCode??'',country:raw.addressDetails?.country??''},mapsUrl:raw.mapsUrl??'',facebook:raw.facebook??'',showHours:raw.showHours??false,hours:raw.hours??''};
}
export function validateContact(value:unknown):ContactSettings {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new ProductError('invalid','Enter valid contact settings.');
 exact(value as Record<string,unknown>,['email','mobile','address','instagram'],['phoneCountry','whatsappCountry','whatsappEnabled','whatsappUseSupport','whatsappNumber','whatsappMessage','showAddress','addressDetails','mapsUrl','facebook','showHours','hours']);const supplied=value as Record<string,unknown>;for(const [key,v]of Object.entries(supplied)){if(v===null)throw new ProductError('invalid','Use valid contact values.');if(['whatsappEnabled','whatsappUseSupport','showAddress','showHours'].includes(key)&&typeof v!=='boolean')throw new ProductError('invalid','Choose valid visibility settings.');if(key==='addressDetails'){if(typeof v!=='object'||Array.isArray(v))throw new ProductError('invalid','Enter address fields.');exact(v as Record<string,unknown>,['line1','line2','city','state','postalCode','country']);}}const v=storedContact(value as ContactSettings);
 for(const country of [v.phoneCountry,v.whatsappCountry])if(!contactCountries.includes(country))throw new ProductError('invalid','Choose a valid phone country.');
 for(const key of ['whatsappEnabled','whatsappUseSupport','showAddress','showHours'] as const)if(typeof v[key]!=='boolean')throw new ProductError('invalid','Choose valid contact visibility settings.');
 const mobile=text(v.mobile,50)?contactPhone(v.mobile,v.phoneCountry):'',whatsappNumber=text(v.whatsappNumber,50)?contactPhone(v.whatsappNumber,v.whatsappCountry):'';
 if(v.whatsappEnabled&&!(v.whatsappUseSupport?mobile:whatsappNumber))throw new ProductError('invalid','WhatsApp requires a valid effective phone number.');
 const a=v.addressDetails;if(!a||typeof a!=='object'||Array.isArray(a))throw new ProductError('invalid','Enter valid address details.');exact(a as unknown as Record<string,unknown>,['line1','line2','city','state','postalCode','country']);
 const addressDetails={line1:text(a.line1,200),line2:text(a.line2,200),city:text(a.city,100),state:text(a.state,100),postalCode:text(a.postalCode,24),country:text(a.country,2)},structured=Object.values(addressDetails).some(Boolean);
 if(addressDetails.country&&!contactCountries.includes(addressDetails.country as CountryCode))throw new ProductError('invalid','Choose an address country.');
 if(addressDetails.postalCode&&(addressDetails.country==='IN'?!/^[1-9]\d{5}$/.test(addressDetails.postalCode):addressDetails.country==='US'?!/^\d{5}(?:-\d{4})?$/.test(addressDetails.postalCode):!/^[\p{L}\p{N} -]{1,24}$/u.test(addressDetails.postalCode)))throw new ProductError('invalid','Enter a valid postal code for the address country.');
 if(v.showAddress&&structured&&(!addressDetails.line1||!addressDetails.city||!addressDetails.country||addressDetails.country==='IN'&&(!addressDetails.state||!addressDetails.postalCode)))throw new ProductError('invalid','Complete the visible business address, including the country-appropriate postal details.');
 const legacyAddress=noteText(v.address,1000),address=structured?[addressDetails.line1,addressDetails.line2,addressDetails.city,addressDetails.state,addressDetails.postalCode,addressDetails.country].filter(Boolean).join(', '):legacyAddress;
 if(v.showAddress&&!address)throw new ProductError('invalid','Enter an address before showing it on the website.');
 const hours=noteText(v.hours,2000);if(v.showHours&&!hours)throw new ProductError('invalid','Enter business hours before showing them.');
 return {...v,email:contactEmail(v.email),mobile,phoneCountry:mobile?phoneCountry(mobile):v.phoneCountry,whatsappNumber,whatsappCountry:whatsappNumber?phoneCountry(whatsappNumber):v.whatsappCountry,whatsappMessage:noteText(v.whatsappMessage,1000),address,addressDetails,instagram:contactUrl(v.instagram,'instagram'),facebook:contactUrl(v.facebook,'facebook'),mapsUrl:contactUrl(v.mapsUrl,'maps'),hours};
}
export type PublicContact={email:string;mobile:string;address:string;instagram:string;facebook:string;mapsUrl:string;hours:string;whatsappEnabled:boolean;whatsappNumber:string;whatsappMessage:string};
export function publicContact(raw:Partial<ContactSettings>={}):PublicContact {
 const v=storedContact(raw),safe=(read:()=>string)=>{try{return read();}catch{return '';}};
 const composed=v.addressDetails&&Object.values(v.addressDetails).some(Boolean)?Object.values(v.addressDetails).filter(Boolean).join(', '):v.address;
 const mobile=safe(()=>v.mobile?contactPhone(v.mobile,v.phoneCountry):''),number=v.whatsappUseSupport?mobile:safe(()=>v.whatsappNumber?contactPhone(v.whatsappNumber,v.whatsappCountry):'');
 return {email:safe(()=>contactEmail(v.email)),mobile,address:v.showAddress===true?safe(()=>noteText(composed,1000)):'',mapsUrl:v.showAddress===true?safe(()=>contactUrl(v.mapsUrl,'maps')):'',instagram:safe(()=>contactUrl(v.instagram,'instagram')),facebook:safe(()=>contactUrl(v.facebook,'facebook')),hours:v.showHours===true?safe(()=>noteText(v.hours,2000)):'',whatsappEnabled:v.whatsappEnabled===true&&!!number,whatsappNumber:v.whatsappEnabled===true?number:'',whatsappMessage:v.whatsappEnabled===true&&number?safe(()=>noteText(v.whatsappMessage,1000)):''};
}
export const phoneLink=(value:string)=>value?'tel:'+value:'';
export const emailLink=(value:string)=>value?'mailto:'+encodeURIComponent(value).replace('%40','@'):'';
export function whatsappLink(contact:PublicContact,message?:string){return contact.whatsappEnabled&&contact.whatsappNumber?'https://wa.me/'+contact.whatsappNumber.replace('+','')+((message??contact.whatsappMessage)?'?text='+encodeURIComponent(message??contact.whatsappMessage):''):'';}
