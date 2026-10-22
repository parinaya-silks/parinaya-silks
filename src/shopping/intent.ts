import {safeCustomerReturn} from '../customer/policy.ts';
export interface ShoppingIntent {kind:'bag'|'wishlist';productId:string;slug:string;variantId:string|null;quantity:number;operationId:string;createdAt:number;uid?:string}
const key='parinaya:shopping-intent:v1';
let memory:ShoppingIntent|null=null;
export function saveIntent(intent:ShoppingIntent){memory=intent;try{sessionStorage.setItem(key,JSON.stringify(intent));}catch{} }
export function clearIntent(){memory=null;try{sessionStorage.removeItem(key);}catch{} }
export function readIntent():ShoppingIntent|null {
  try{let value=memory;try{const stored=sessionStorage.getItem(key);if(stored!==null)value=JSON.parse(stored);}catch(error){if(error instanceof SyntaxError){clearIntent();return null;}}if(!value)return null;
    if(!['bag','wishlist'].includes(value.kind)||!/^[A-Za-z0-9]{20}$/.test(value.productId)||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug)||!(value.variantId===null||typeof value.variantId==='string'&&/^[A-Za-z0-9_-]{1,40}$/.test(value.variantId))||!Number.isSafeInteger(value.quantity)||value.quantity<1||value.quantity>1000000||!/^[a-f0-9]{32}$/.test(value.operationId)||!Number.isFinite(value.createdAt)||Date.now()-value.createdAt>15*60*1000||value.createdAt>Date.now()+1000){clearIntent();return null;}return value;
  }catch{clearIntent();return null;}
}
export const shoppingReturn=(path:string)=>safeCustomerReturn(path);
