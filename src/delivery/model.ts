import type {ShippingQuote} from '../shipping/model.ts';
import {ProductError,type PublicProductRecord} from '../products/model.ts';
import {normalizeMobile,mobileCountry} from '../customer/mobile.ts';

export const ADDRESS_LIMIT=10;
// Government directory: https://www.india.gov.in/directory/web-directory/state-uts
export const indiaStates=['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'].sort();
export interface AddressInput {recipientName:string;mobileNumber:string;pinCode:string;line1:string;locality:string;city:string;state:string;landmark:string;label:string;country:'India'}
export interface DeliveryAddress extends AddressInput {id:string;revision:number;createdAt:number;updatedAt:number}
export interface AddressBook {addresses:DeliveryAddress[];defaultAddressId:string|null;revision:number}
export const blankAddress=():AddressInput=>({recipientName:'',mobileNumber:'',pinCode:'',line1:'',locality:'',city:'',state:'',landmark:'',label:'',country:'India'});
export function addressId(value:unknown):string {if(typeof value!=='string'||!/^[a-f0-9]{32}$/.test(value))throw new ProductError('invalid','Invalid address reference.');return value;}
export function validateAddress(value:unknown):AddressInput {
  const allowed=Object.keys(blankAddress());
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!allowed.includes(key)))throw new ProductError('invalid','Unsupported address fields.');
  const raw=value as Record<string,unknown>,result=blankAddress(),fields:Record<string,string>={};
  const limits={recipientName:100,mobileNumber:40,pinCode:6,line1:180,locality:100,city:100,state:80,landmark:160,label:30};
  for(const [key,max]of Object.entries(limits)){
    const text=raw[key];
    if(typeof text!=='string'||text.trim().length>max||/[\x00-\x1f\x7f]/.test(text)||(!['landmark','label'].includes(key)&&!text.trim()))fields[key]=`Enter ${key==='recipientName'?'the recipient name':'a valid value'} (up to ${max} characters).`;
    else (result as unknown as Record<string,string>)[key]=text.trim();
  }
  try{result.mobileNumber=normalizeMobile(result.mobileNumber,mobileCountry(result.mobileNumber));}catch{fields.mobileNumber='Enter a valid mobile number, including its country code if outside India.';}
  if(!/^[1-9][0-9]{5}$/.test(result.pinCode))fields.pinCode='Enter a six-digit Indian PIN code.';
  if(!indiaStates.includes(result.state))fields.state='Select a State or Union Territory.';
  if(raw.country!=='India')fields.country='Delivery addresses must be in India for this phase.';
  if(Object.keys(fields).length)throw new ProductError('invalid','Please check the address fields.',fields);
  return result;
}
export interface CheckoutLine {id:string;productId:string;variantId:string|null;quantity:number;product:PublicProductRecord|null;variantName:string;issues:string[]}
export interface CheckoutReview {shipping:ShippingQuote;fingerprint:string;address:DeliveryAddress|null;items:CheckoutLine[];subtotalPaise:string;subtotalComplete:boolean;valid:boolean;issues:string[]}
