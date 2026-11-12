import {categoryRevision} from './categories.ts';
import {createHash} from 'node:crypto';
import {FieldValue,type Firestore,type Transaction} from 'firebase-admin/firestore';
import {ProductError} from '../src/products/model.ts';
import {exact,referenceId} from '../src/orders/model.ts';
export type DeleteKind='categories'|'products'|'coupons'|'campaigns';
export function containsReference(value:unknown,id:string):boolean {return value===id||Array.isArray(value)&&value.some(v=>containsReference(v,id))||!!value&&typeof value==='object'&&Object.values(value).some(v=>containsReference(v,id));}
export function safeDeletion(db:Firestore,access:(tx:Transaction,uid:string)=>Promise<void>){return async(uid:string,body:Record<string,unknown>)=>{
 exact(body,['action','kind','id','expectedRevision','confirmation','operationId']);const kind=body.kind as DeleteKind,id=body.id as string,operationId=referenceId(body.operationId);
 if(!['categories','products','coupons','campaigns'].includes(kind)||typeof id!=='string'||!(kind==='coupons'?/^[A-Z0-9][A-Z0-9_-]{2,31}$/:kind==='campaigns'?/^[a-f0-9]{32}$/:/^[A-Za-z0-9]{20}$/).test(id)||body.confirmation!=='DELETE'||(kind==='categories'?(typeof body.expectedRevision!=='number'||!Number.isFinite(body.expectedRevision)):!Number.isSafeInteger(body.expectedRevision))||Number(body.expectedRevision)<1)throw new ProductError('invalid','Identify the current record and type DELETE to confirm.');
 const hash=createHash('sha256').update(JSON.stringify([kind,id,body.expectedRevision])).digest('hex');
 return db.runTransaction(async tx=>{
  await access(tx,uid);const receipt=db.doc('deletionOperations/'+operationId),tombstone=db.doc('deletedRecords/'+kind+'_'+id),[accepted,removed,doc]=await tx.getAll(receipt,tombstone,db.doc(kind+'/'+id));
  if(accepted.exists){if(accepted.data()?.hash!==hash||accepted.data()?.actor!==uid)throw new ProductError('conflict','Deletion operation changed.');return {deleted:true,recovered:true};}
  if(!doc.exists||removed.exists)throw new ProductError('not-found','Record no longer exists. Refresh this section.');const raw=doc.data()!,revision=kind==='categories'?categoryRevision(raw.updatedAt):raw.revision;
  if(revision!==body.expectedRevision)throw new ProductError('conflict','Record changed. Reload before deleting.');
  if(kind==='categories'&&raw.enabled!==false)throw new ProductError('deletion-blocked','Disable this category first. Products and campaigns must not depend on it.');
  // Published products/campaigns can have external analytics or shared URLs which cannot be exhaustively audited here.
  if(kind==='products'&&(raw.status!=='Draft'||raw.revision!==1))throw new ProductError('deletion-blocked','Only an untouched initial Draft can be permanently deleted. Archive this product to preserve publication and historical references.');
  if(kind==='campaigns'&&(raw.intent!=='draft'||raw.revision!==1))throw new ProductError('deletion-blocked','Only an untouched initial Draft campaign can be permanently deleted. Archive it to preserve analytics and publication history.');
  if(kind==='coupons'&&(raw.enabled!==false||raw.uses!==0))throw new ProductError('deletion-blocked','Disable an unused coupon first. Used coupons must be retained.');
  const collections=['orders','inventoryAudit','campaigns','siteSettings','banners','collections','reports','invoices','analytics','paymentAttempts','paymentEvents','paymentReconciliation'];
  if(kind==='categories')collections.push('products');
  for(const collection of collections){const rows=await tx.get(db.collection(collection).limit(5001));if(rows.size>5000)throw new ProductError('deletion-blocked','Dependency verification exceeds its safe limit. Keep this record archived or disabled.');if(rows.docs.some(row=>row.ref.path!==doc.ref.path&&[id,raw.slug,...(raw.slug?['/product/'+raw.slug,'/collections/'+raw.slug,'/sale/'+raw.slug]:[])].filter(Boolean).some(token=>containsReference(row.data(),token))))throw new ProductError('deletion-blocked','Referenced by '+collection+'. Keep this record archived or disabled.');}
  if(kind==='coupons'&&!(await tx.get(doc.ref.collection('customers').limit(1))).empty)throw new ProductError('deletion-blocked','Coupon redemption history must be preserved.');
  if(kind==='products')for(const group of ['bag','wishlist']){const rows=await tx.get(db.collectionGroup(group).limit(5001));if(rows.size>5000||rows.docs.some(row=>[id,raw.slug,...(raw.slug?['/product/'+raw.slug,'/collections/'+raw.slug,'/sale/'+raw.slug]:[])].filter(Boolean).some(token=>containsReference(row.data(),token))))throw new ProductError('deletion-blocked','Saved customer shopping references cannot be removed. Archive this product.');}
  tx.create(tombstone,{kind,id,actor:uid,createdAt:FieldValue.serverTimestamp()});tx.create(receipt,{hash,actor:uid,kind,id,createdAt:FieldValue.serverTimestamp()});tx.delete(doc.ref);
  return {deleted:true};
 });
};}
