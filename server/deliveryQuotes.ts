import {createHash,randomUUID} from 'node:crypto';
import {distanceDeliveryEnabled} from './deliveryMode.ts';
import {Timestamp,type Firestore,type Transaction} from 'firebase-admin/firestore';
import {ProductError} from '../src/products/model.ts';
import {validateDispatch,distanceFee,codAvailable} from '../src/shipping/distance.ts';
import {savedShipping,type ShippingQuote} from '../src/shipping/model.ts';
import {validateAddress,type DeliveryAddress} from '../src/delivery/model.ts';
import {drivingRoute,type RouteCalculator} from './routes.ts';

const digest=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export const QUOTE_LIFETIME=5*60*1000;
export const addressIdentity=(address:DeliveryAddress)=>digest([address.id,address.revision,validateAddress(Object.fromEntries(Object.entries(address).filter(([k])=>!['id','revision','createdAt','updatedAt'].includes(k))))]);
const revision=(raw:Record<string,unknown>|undefined)=>raw?.schemaVersion===1&&Number.isSafeInteger(raw.revision)&&Number(raw.revision)>0?Number(raw.revision):0;
export function deliveryQuotes(db:Firestore,route:RouteCalculator=drivingRoute){
 if(route!==drivingRoute&&(process.env.VERCEL||process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'))throw new Error('Route test doubles require loopback emulators and cannot run on hosted deployments.');
 async function prepare(uid:string,address:DeliveryAddress,merchandise:bigint){
  if(!distanceDeliveryEnabled())throw new ProductError('configuration','Distance delivery is disabled.');
  const [o,p]=await db.getAll(db.doc('siteSettings/dispatchLocation'),db.doc('siteSettings/shipping')),origin=o.data(),pricing=savedShipping(p.data());
  if(!revision(origin))throw new ProductError('configuration','Delivery calculation is unavailable. The store must configure its dispatch location.');
  const dispatch=validateDispatch(Object.fromEntries(Object.keys({name:1,fullAddress:1,latitude:1,longitude:1,mapsUrl:1,active:1}).map(k=>[k,origin![k]])));
  if(!dispatch.active||pricing.state!=='ready'||pricing.config?.method!=='road-distance')throw new ProductError('configuration','Delivery calculation is unavailable. Please contact the store.');
  const minute=Math.floor(Date.now()/60000),limit=db.doc('deliveryQuoteLimits/'+digest([uid,minute]));
  await db.runTransaction(async tx=>{const saved=(await tx.get(limit)).data(),count=saved?.count??0;if(count>=20)throw new ProductError('rate-limited','Too many delivery calculations. Please wait a minute.');tx.set(limit,{count:count+1,expiresAt:Timestamp.fromMillis(Date.now()+3600000)});});
  // External I/O occurs before any transaction, and never reserves stock.
  const result=await route(dispatch,address),fee=distanceFee(pricing.config.slabs!,result.distanceMeters,merchandise,pricing.config.freeShippingEnabled,pricing.config.freeThresholdPaise);
  if(!fee)return null;
  const id=randomUUID().replaceAll('-',''),createdAt=Date.now(),record={schemaVersion:1,uid,addressId:address.id,addressHash:addressIdentity(address),destination:result.destination,originRevision:origin!.revision,pricingRevision:pricing.revision,distanceMeters:result.distanceMeters,merchandisePaise:String(merchandise),...fee,createdAt,expiresAt:createdAt+QUOTE_LIFETIME,deleteAfter:Timestamp.fromMillis(createdAt+QUOTE_LIFETIME)};
  await db.doc('deliveryQuotes/'+id).create(record);
  return id;
 }
 async function read(tx:Transaction,uid:string,address:DeliveryAddress|null,merchandise:bigint,id?:unknown):Promise<{shipping:ShippingQuote;codEnabled:boolean;snapshot:import('../src/shipping/distance.ts').DeliverySnapshot|null}>{
  if(!distanceDeliveryEnabled())throw new ProductError('configuration','Distance delivery is disabled.');
  const [o,p,c]=await tx.getAll(db.doc('siteSettings/dispatchLocation'),db.doc('siteSettings/shipping'),db.doc('siteSettings/codAvailability')),pricing=savedShipping(p.data());
  const codEnabled=codAvailable(c.data()),base:ShippingQuote={method:'road-distance',state:'unavailable',revision:pricing.revision||null,shippingPaise:null,totalPaise:null,free:false,freeShippingEnabled:pricing.config?.freeShippingEnabled??false,freeThresholdPaise:pricing.config?.freeThresholdPaise??null,message:'Delivery calculation is unavailable. Please refresh your checkout review.'};
  if(!address)return {shipping:{...base,state:'blocked',message:'Select your delivery address to calculate delivery.'},codEnabled,snapshot:null};
  if(pricing.state!=='ready'||pricing.config?.method!=='road-distance'||!revision(o.data())||o.data()?.active!==true)return {shipping:base,codEnabled,snapshot:null};
  if(id===undefined)return {shipping:base,codEnabled,snapshot:null};
  if(typeof id!=='string'||!/^[a-f0-9]{32}$/.test(id))throw new ProductError('invalid','Refresh the delivery quote.');
  const q=(await tx.get(db.doc('deliveryQuotes/'+id))).data();
  if(!q||!Number.isSafeInteger(q.expiresAt)||!Number.isSafeInteger(q.createdAt)||q.expiresAt!==q.createdAt+QUOTE_LIFETIME||q.createdAt>Date.now()+1000||q.schemaVersion!==1||q.uid!==uid||q.addressId!==address.id||q.addressHash!==addressIdentity(address)||q.expiresAt<=Date.now()||q.originRevision!==o.data()!.revision||q.pricingRevision!==pricing.revision||q.merchandisePaise!==String(merchandise))throw new ProductError('conflict','Delivery quote expired or changed. Refresh checkout review before placing your order.');
  const fee=distanceFee(pricing.config.slabs!,q.distanceMeters,merchandise,pricing.config.freeShippingEnabled,pricing.config.freeThresholdPaise);
  if(!fee||fee.feePaise!==q.feePaise||fee.free!==q.free||fee.slabMaximumMeters!==q.slabMaximumMeters)throw new ProductError('conflict','Delivery quote changed. Refresh checkout review.');
  return {shipping:{...base,state:'ready',message:undefined,quoteId:id,expiresAt:q.expiresAt,shippingPaise:String(fee.feePaise),totalPaise:String(merchandise+BigInt(fee.feePaise)),free:fee.free,remainingPaise:fee.remainingPaise},codEnabled,snapshot:{quoteId:id,pricingRevision:q.pricingRevision,dispatchRevision:q.originRevision,slabMaximumMeters:fee.slabMaximumMeters,feePaise:fee.feePaise,free:fee.free,quotedAt:q.createdAt}};
 }
 return {prepare,read};
}
