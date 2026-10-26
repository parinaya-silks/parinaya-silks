import {ProductError} from '../products/model.ts';
import {productId,variantId,positiveQuantity} from '../shopping/model.ts';
export type CheckoutSource={kind:'bag'}|{kind:'buy-now';productId:string;variantId:string|null;quantity:number};
export function checkoutSource(value:unknown):CheckoutSource {
 if(value===undefined)return {kind:'bag'};
 if(!value||typeof value!=='object'||Array.isArray(value))throw new ProductError('invalid','Choose a valid checkout source.');
 const raw=value as Record<string,unknown>;
 if(raw.kind==='bag'&&Object.keys(raw).length===1)return {kind:'bag'};
 if(raw.kind!=='buy-now'||Object.keys(raw).length!==4||!['kind','productId','variantId','quantity'].every(key=>key in raw))throw new ProductError('invalid','Choose a valid checkout source.');
 return {kind:'buy-now',productId:productId(raw.productId),variantId:variantId(raw.variantId),quantity:positiveQuantity(raw.quantity)};
}
export type CheckoutStage='delivery'|'summary'|'payment';
export interface CheckoutDraft {version:1;id:string;uid:string|null;createdAt:number;source:CheckoutSource;slug:string;addressId:string;couponCode:string|null;approvedFingerprint:string;deliveryConfirmed:boolean;points?:number}
const prefix='parinaya:checkout:v1:',pending=prefix+'pending';
export function checkoutPath(stage:CheckoutStage,id='bag'){return (stage==='delivery'?'/checkout':'/checkout/'+stage)+(id==='bag'?'':'?buyNow='+encodeURIComponent(id));}
export function beginBuyNow(uid:string|null,source:CheckoutSource,slug:string):string {
 const parsed=checkoutSource(source);if(parsed.kind!=='buy-now'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new ProductError('invalid','Open the product again to begin checkout.');
 const id=crypto.randomUUID().replaceAll('-',''),draft:CheckoutDraft={version:1,id,uid,source:parsed,slug,createdAt:Date.now(),addressId:'',couponCode:null,approvedFingerprint:'',deliveryConfirmed:false};
 try{sessionStorage.setItem(uid?prefix+uid+':'+id:pending,JSON.stringify(draft));}catch{throw new ProductError('unavailable','Enable site storage to keep your checkout selection.');}return id;
}
export function readCheckoutDraft(uid:string,id:string):CheckoutDraft|null {
 if(!uid||!(id==='bag'||/^[a-f0-9]{32}$/.test(id)))return null;
 const freshBag=():CheckoutDraft=>({version:1,id,uid,createdAt:Date.now(),source:{kind:'bag'},slug:'',addressId:'',couponCode:null,approvedFingerprint:'',deliveryConfirmed:false});
 try{
  const key=prefix+uid+':'+id;let raw=sessionStorage.getItem(key);
  if(!raw&&id!=='bag'){
   const saved=sessionStorage.getItem(pending);if(saved){const candidate=JSON.parse(saved);if(candidate.id===id&&candidate.uid===null){raw=saved;sessionStorage.removeItem(pending);}}
  }
  if(!raw)return id==='bag'?freshBag():null;
  const draft=JSON.parse(raw);if(draft.version!==1||draft.id!==id||draft.uid!==null&&draft.uid!==uid||!Number.isFinite(draft.createdAt)||Date.now()-draft.createdAt>2*60*60*1000||draft.createdAt>Date.now()+1000){sessionStorage.removeItem(key);return id==='bag'?freshBag():null;}
  draft.source=checkoutSource(draft.source);if((id==='bag')!==(draft.source.kind==='bag'))return null;
  if(typeof draft.slug!=='string'||draft.source.kind==='buy-now'&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug)||typeof draft.addressId!=='string'||draft.addressId&&!/^[a-f0-9]{32}$/.test(draft.addressId)||draft.couponCode!==null&&typeof draft.couponCode!=='string'||typeof draft.approvedFingerprint!=='string'||draft.approvedFingerprint&&!/^[a-f0-9]{64}$/.test(draft.approvedFingerprint))return null;
  if(draft.points!==undefined&&(!Number.isSafeInteger(draft.points)||draft.points<0||draft.points>1e12))return null;draft.deliveryConfirmed=draft.deliveryConfirmed===true;draft.uid=uid;sessionStorage.setItem(key,JSON.stringify(draft));return draft;
 }catch{return null;}
}
export function saveCheckoutDraft(draft:CheckoutDraft){try{sessionStorage.setItem(prefix+draft.uid+':'+draft.id,JSON.stringify(draft));return true;}catch{return false;}}
