import type {Firestore,Transaction} from 'firebase-admin/firestore';
import {storedCoupon,couponUses,exact} from '../src/orders/model.ts';
import {availableCoupon} from '../src/offers/model.ts';
import {checkoutSource,type CheckoutSource} from '../src/checkout/source.ts';
import type {CheckoutReview} from '../src/delivery/model.ts';
import {ProductError} from '../src/products/model.ts';
export function couponDiscoveryService(db:Firestore,review:(tx:Transaction,uid:string,address:string|null,code:unknown,source:CheckoutSource)=>Promise<{value:CheckoutReview}>){
 async function read(uid:string|null,body:Record<string,unknown>){
  exact(body,['action'],['source','eligibleOnly']);if(body.eligibleOnly!==undefined&&typeof body.eligibleOnly!=='boolean')throw new ProductError('invalid','Invalid offer selection.');const source=checkoutSource(body.source);
  return db.runTransaction(async tx=>{
   const page=await tx.get(db.collection('coupons').where('discoverable','==',true).limit(10001));
   if(page.size>10000)throw new ProductError('schema','Available offers need owner review.');
   const candidates=page.docs.map(doc=>{const c=storedCoupon(doc.data());if(c.code!==doc.id)throw new ProductError('schema','Offer identity needs owner review.');return {c,global:couponUses(doc.get('uses'))};});
   const sequence=Math.max(0,...candidates.map(({c})=>c.eligibleOrderNumber??0));
   const delivered=uid&&sequence?(await tx.get(db.collection('orders').where('uid','==',uid).where('status','==','Delivered').select().limit(sequence))).size:uid?0:null;
   const usages=uid&&page.size?await tx.getAll(...page.docs.map(doc=>doc.ref.collection('customers').doc(uid))):[];
   const quoted=uid?(await review(tx,uid,null,null,source)).value:null;
   const hasItems=!!quoted?.items.length&&quoted.items.every(item=>item.product&&!item.issues.length);
   const serverNow=Date.now();const items=candidates.map(({c,global},i)=>availableCoupon(c,global,couponUses(usages[i]?.data()?.uses),delivered,quoted?BigInt(quoted.subtotalPaise):null,hasItems,serverNow)).filter(v=>v!==null);
   return {items:body.eligibleOnly===true?items.filter(item=>item.state==='eligible'):items,serverNow};
  },{readOnly:true});
 }
 return {publicList:()=>read(null,{action:'coupons:available'}),personal:(uid:string,body:Record<string,unknown>)=>read(uid,body)};
}
