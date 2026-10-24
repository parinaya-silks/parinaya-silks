import {couponInput,couponDiscount,type CouponInput} from '../../orders/model.ts';
import {rupeesToPaise} from '../../products/model.ts';
export type CouponRecord=CouponInput&{uses:number;revision:number;createdAt:number|null;updatedAt:number|null};
export function couponSaveError(failure:unknown){const e=failure as {code?:string;message?:string};return ['unauthorized','permission'].includes(e?.code||'')?'Administrator permission must be checked again.':['invalid','conflict','not-found'].includes(e?.code||'')&&e.message?e.message:'Unable to save this coupon. Your entries are kept; please retry.';}
export const couponStatuses=['Active','Scheduled','Expired','Disabled','Usage Limit Reached'] as const;
export function couponStatus(c:CouponInput&{uses:number},now=Date.now()):typeof couponStatuses[number]{return !c.enabled?'Disabled':c.endsAt!==null&&now>=c.endsAt?'Expired':c.globalLimit!==null&&c.uses>=c.globalLimit?'Usage Limit Reached':c.startsAt!==null&&now<c.startsAt?'Scheduled':'Active';}
export const couponMoney=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:0,maximumFractionDigits:2}).format(n/100);
export const couponDate=(n:number|null)=>n===null?'Not recorded':new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(n)+' IST';
export const istInput=(n:number|null)=>n===null?'':new Date(n+19800000).toISOString().slice(0,23);
export function istInstant(value:string){if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?$/.test(value))throw Error('Enter a valid date and time in IST.');const n=Date.parse(value+'+05:30');if(!Number.isFinite(n)||!istInput(n).startsWith(value))throw Error('Enter a valid date and time in IST.');return n;}
export type CouponDraft={code:string;kind:'percent'|'fixed';value:string;cap:string;minimum:string;start:string;end:string;immediate:boolean;noEnd:boolean;limit:string;enabled:boolean};
export const couponDraft=(c?:CouponRecord):CouponDraft=>({code:c?.code||'',kind:c?.kind||'percent',value:c?String(c.kind==='percent'?c.value:c.value/100):'',cap:c?.capPaise===null||c?.capPaise===undefined?'':String(c.capPaise/100),minimum:c?.minimumPaise?String(c.minimumPaise/100):'',start:istInput(c?.startsAt??null),end:istInput(c?.endsAt??null),immediate:c?.startsAt===undefined||c.startsAt===null,noEnd:c?.endsAt===undefined||c.endsAt===null,limit:c?.globalLimit===null||c?.globalLimit===undefined?'':String(c.globalLimit),enabled:c?.enabled??true});
export function draftCoupon(d:CouponDraft,perCustomerLimit:number|null):CouponInput{
 const money=(value:string,empty:number|null)=>{if(!value.trim())return empty;const n=rupeesToPaise(value.trim());if(!Number.isSafeInteger(n))throw Error('Enter rupee amounts with at most two decimal places.');return n;};
 if(d.value.trim()==='')throw Error('Enter a discount value.');
 return couponInput({code:d.code,kind:d.kind,value:d.kind==='percent'?Number(d.value):money(d.value,null),capPaise:d.kind==='percent'?money(d.cap,null):null,minimumPaise:money(d.minimum,0),startsAt:d.immediate?null:istInstant(d.start),endsAt:d.noEnd?null:istInstant(d.end),globalLimit:d.limit===''?null:Number(d.limit),perCustomerLimit,enabled:d.enabled});
}
export function previewCoupon(input:CouponInput,subtotal:string,uses:number,now=Date.now()){
 const amount=rupeesToPaise(subtotal.trim());if(!Number.isSafeInteger(amount)||amount<0||amount>1000000000)throw Error('Enter a product subtotal from ₹0 to ₹1,00,00,000.');
 // Preview does not represent a particular customer's prior redemptions.
 const discount=Number(couponDiscount(input,BigInt(amount),uses,0,now));return {subtotal:amount,discount,after:amount-discount};
}
export type CouponFilters={search:string;status:string;kind:string;sort:string};
export const blankCoupons=():CouponFilters=>({search:'',status:'All',kind:'all',sort:'recent'});
export function filterCoupons(items:CouponRecord[],f:CouponFilters,now=Date.now()){const term=f.search.trim().toUpperCase();return items.filter(c=>(!term||c.code.includes(term))&&(f.kind==='all'||c.kind===f.kind)&&(f.status==='All'||couponStatus(c,now)===f.status)).sort((a,b)=>(f.sort==='code'?a.code.localeCompare(b.code):f.sort==='expiry'?(a.endsAt??Infinity)-(b.endsAt??Infinity):(b.createdAt??0)-(a.createdAt??0))||a.code.localeCompare(b.code));}
export async function completeCoupons(load:(cursor?:string)=>Promise<{items:CouponRecord[];nextCursor:string|null}>){let cursor:string|undefined,pages=0;const items=new Map<string,CouponRecord>(),seen=new Set<string>();do{const result=await load(cursor);if(++pages>401)throw Error('Coupon list exceeds the supported limit.');for(const c of result.items){if(items.has(c.code))throw Error('Coupons changed while loading. Please retry.');items.set(c.code,c);}if(items.size>10000)throw Error('Coupon list exceeds 10,000 entries.');if(result.nextCursor){if(seen.has(result.nextCursor))throw Error('Coupon pagination could not be completed.');seen.add(result.nextCursor);}cursor=result.nextCursor||undefined;}while(cursor);return [...items.values()];}
