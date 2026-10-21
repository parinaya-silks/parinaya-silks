import {normalizeMobile,mobileCountry} from './mobile.ts';
type Pending={displayName:string;mobileNumber:string};
const memory=new Map<string,Pending>(),prefix='parinaya_pending_customer_profile_v1:';
export function rememberPendingProfile(uid:string,value:Pending){memory.set(uid,value);try{sessionStorage.setItem(prefix+uid,JSON.stringify(value));}catch{/* In-memory recovery remains available if storage is blocked. */}}
export function pendingProfile(uid:string):Pending|undefined {
  if(memory.has(uid))return memory.get(uid);
  try{const value=JSON.parse(sessionStorage.getItem(prefix+uid)||'null');if(value&&typeof value.displayName==='string'&&value.displayName.length<=100&&normalizeMobile(value.mobileNumber,mobileCountry(value.mobileNumber))===value.mobileNumber){memory.set(uid,value);return value;}}catch{/* Ignore invalid or unavailable recovery storage. */}
}
export function clearPendingProfile(uid:string){memory.delete(uid);try{sessionStorage.removeItem(prefix+uid);}catch{/* Never affect sign-in on storage failure. */}}
