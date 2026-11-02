import {FieldValue,type Firestore} from 'firebase-admin/firestore';
import {deliveryAwardBlocker} from './loyaltyEligibility.ts';
import {loyaltyService} from './loyalty.ts';
import {customerUid} from '../src/admin/customers/model.ts';
import {referenceId} from '../src/orders/model.ts';
import type {LoyaltyOrder} from '../src/loyalty/model.ts';

// Workstation-only procedure, deliberately absent from catalog API routing.
// No collection scan: the operator supplies at most 25 reviewed order IDs.
export async function repairDeliveryAwards(db:Firestore,ids:string[],apply=false){
 if(!ids.length||ids.length>25||new Set(ids).size!==ids.length)throw Error('Supply 1-25 distinct reviewed order IDs.');ids.forEach(referenceId);
 const service=loyaltyService(db),results=[];
 for(const id of ids)results.push(await db.runTransaction(async tx=>{
  const ref=db.doc('orders/'+id),row=await tx.get(ref);if(!row.exists)return {id,result:'missing'};
  const data=row.data()!;try{customerUid(data.uid);}catch{return {id,result:'invalid-owner'};}const award=await tx.get(db.doc(`loyaltyAccounts/${data.uid}/ledger/${id}_earned`)),placed=await tx.get(db.doc(`loyaltyAccounts/${data.uid}/ledger/${id}_placed`));
  const blocked=deliveryAwardBlocker(data as {status:string;loyalty?:LoyaltyOrder});
  if(award.exists)return {id,result:'already-awarded'};if(blocked)return {id,result:blocked};
  if(!Number.isSafeInteger(data.revision)||data.revision<1||typeof data.reference!=='string'||placed.data()?.kind!=='Reserved'||placed.data()?.pendingDelta!==data.loyalty.expected||placed.data()?.reservedDelta!==data.loyalty.redeemed)return {id,result:'inconsistent-placement'};
  // transition reads/validates the account and creates the same stable ledger IDs.
  const change=await service.transition(tx,{...data,id} as Parameters<typeof service.transition>[1],{status:'Delivered'},undefined,undefined,'delivery-repair');
  if(!change)return {id,result:'no-change'};if(!apply)return {id,result:'eligible-dry-run',points:data.loyalty.expected};
  change.commit();tx.update(ref,{loyalty:change.snapshot,revision:data.revision+1,updatedAt:FieldValue.serverTimestamp()});return {id,result:'credited',points:data.loyalty.expected};
 }));return results;
}
