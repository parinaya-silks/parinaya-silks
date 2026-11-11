import {ProductError} from '../products/model.ts';
import {defaultSlabs,validateSlabs,type DistanceSlab} from './distance.ts';
export const MAX_FLAT_FEE=10_000_000,MAX_THRESHOLD=1_000_000_000;
export interface ShippingInput {country:'India';coverage:'all-india'|'distance-slabs';method:'flat'|'road-distance';flatFeePaise:number;freeShippingEnabled:boolean;freeThresholdPaise:number;slabs?:DistanceSlab[]}
export interface ShippingConfig extends ShippingInput {revision:number}
export interface ShippingSettings {state:'missing'|'invalid'|'ready';revision:number;config:ShippingConfig|null}
export interface ShippingQuote {method?:'flat'|'road-distance';state:'missing'|'invalid'|'unavailable'|'blocked'|'ready';revision:number|null;shippingPaise:string|null;totalPaise:string|null;free:boolean;freeShippingEnabled:boolean;freeThresholdPaise:number|null;quoteId?:string;expiresAt?:number;remainingPaise?:string;message?:string}
// Draft values only. Customer reads never seed or fall back to these values.
export const initialShipping=():ShippingInput=>({country:'India',coverage:'all-india',method:'flat',flatFeePaise:9900,freeShippingEnabled:true,freeThresholdPaise:1000000});
export const initialDistanceShipping=():ShippingInput=>({...initialShipping(),method:'road-distance',coverage:'distance-slabs',flatFeePaise:0,slabs:defaultSlabs()});
export function validateShipping(value:unknown):ShippingInput {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new ProductError('invalid','Enter valid shipping settings.');
  const data=value as Record<string,unknown>,allowed=[...Object.keys(initialShipping()),...(data.method==='road-distance'?['slabs']:[])],fields:Record<string,string>={};
  if(Object.keys(data).some(key=>!allowed.includes(key))||allowed.some(key=>!(key in data)))throw new ProductError('invalid','Unsupported or missing shipping fields.');
  if(data.country!=='India'||data.coverage!==(data.method==='road-distance'?'distance-slabs':'all-india')||!['flat','road-distance'].includes(String(data.method)))throw new ProductError('invalid','Use supported delivery settings.');
  if(data.method==='road-distance'){validateSlabs(data.slabs);if(data.flatFeePaise!==0)throw new ProductError('invalid','Flat shipping is not used for distance delivery.');}
  for(const [key,max]of [['flatFeePaise',MAX_FLAT_FEE],['freeThresholdPaise',MAX_THRESHOLD]] as const)if(!Number.isSafeInteger(data[key])||(data[key] as number)<0||(data[key] as number)>max)fields[key]='Enter a nonnegative amount within the stated limit, using at most two decimal places.';
  if(typeof data.freeShippingEnabled!=='boolean')fields.freeShippingEnabled='Choose whether free shipping is enabled.';
  if(Object.keys(fields).length)throw new ProductError('invalid','Please check the shipping amounts.',fields);
  return Object.fromEntries(allowed.map(key=>[key,data[key]])) as unknown as ShippingInput;
}
export function shippingAmount(text:string,max:number):number {
  if(text.length>20||!/^\d+(?:\.\d{1,2})?$/.test(text))throw new ProductError('invalid','Enter an amount with at most two decimal places.');
  const [whole,fraction='']=text.split('.'),value=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  if(!Number.isSafeInteger(value)||value<0||value>max)throw new ProductError('invalid','The shipping amount exceeds the stated limit.');return value;
}
export function savedShipping(data:Record<string,unknown>|undefined):ShippingSettings {
  if(!data)return {state:'missing',revision:0,config:null};
  const revision=Number.isSafeInteger(data.revision)&&(data.revision as number)>=1&&(data.revision as number)<=1000000000?data.revision as number:0;
  try{if(![1,2].includes(Number(data.schemaVersion))||!revision||(data.method==='road-distance'&&data.schemaVersion!==2))throw new Error('Invalid version');const config=validateShipping(Object.fromEntries([...Object.keys(initialShipping()),...(data.method==='road-distance'?['slabs']:[])].map(key=>[key,data[key]])));return {state:'ready',revision,config:{...config,revision}};}catch{return {state:'invalid',revision,config:null};}
}
export function quoteShipping(settings:ShippingSettings,subtotal:bigint,eligible:boolean):ShippingQuote {
  const base={method:settings.config?.method,revision:settings.revision||null,shippingPaise:null,totalPaise:null,free:false,freeShippingEnabled:settings.config?.freeShippingEnabled||false,freeThresholdPaise:settings.config?.freeThresholdPaise??null};
  if(settings.state!=='ready'||!settings.config)return {...base,state:settings.state};
  if(settings.config.method==='road-distance')return {...base,state:'blocked'};
  if(!eligible||subtotal<0n)return {...base,state:'blocked'};
  const config=settings.config,free=config.freeShippingEnabled&&subtotal>BigInt(config.freeThresholdPaise),fee=free?0n:BigInt(config.flatFeePaise);
  return {...base,state:'ready',shippingPaise:String(fee),totalPaise:String(subtotal+fee),free};
}
