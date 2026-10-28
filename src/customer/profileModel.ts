import {normalizeMobile,type CountryCode} from './mobile.ts';
import {CustomerError} from './policy.ts';
export function customerInitials(name:string){return name.trim().split(/\s+/u).filter(Boolean).slice(0,2).map(word=>Array.from(word)[0]).join('').toLocaleUpperCase()||'C';}
export function profileInput(name:string,mobile:string,country:CountryCode,required=false){
 const fields:Record<string,string>={};const displayName=name.trim();if(!displayName||displayName.length>100||/[\x00-\x1f\x7f]/.test(displayName))fields.displayName='Enter your full name, up to 100 characters.';
 let mobileNumber:string|null=null;try{if(mobile.trim()||required)mobileNumber=normalizeMobile(mobile,country);}catch{fields.mobileNumber='Enter a valid mobile number for the selected country code.';}
 if(Object.keys(fields).length)throw new CustomerError('Please check the highlighted fields.',fields);return {displayName,mobileNumber};
}
