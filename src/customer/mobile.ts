import {parsePhoneNumberFromString,getCountries,getCountryCallingCode,type CountryCode} from 'libphonenumber-js/max';
import {CustomerError} from './policy.ts';
export {type CountryCode};
export const phoneCountries=getCountries();
export {getCountryCallingCode};
export function normalizeMobile(input:string,country:CountryCode='IN'):string {
  const raw=input.trim().replace(/[\s().-]/g,'');
  const phone=/^\+?\d+$/.test(raw)?parsePhoneNumberFromString(raw,{defaultCountry:country,extract:false}):undefined;
  if(!phone||phone.country!==country||phone.ext||!phone.isValid()||!['MOBILE','FIXED_LINE_OR_MOBILE'].includes(phone.getType()||''))throw new CustomerError('Please check your mobile number.',{mobileNumber:'Enter a complete mobile number for the selected country.'});
  return phone.number;
}
export function mobileCountry(input:string):CountryCode {return parsePhoneNumberFromString(input)?.country||'IN';}
