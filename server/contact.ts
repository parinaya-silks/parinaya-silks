import {createHash} from 'node:crypto';
import {FieldValue,type Firestore,type Transaction} from 'firebase-admin/firestore';
import {blankContent} from '../src/content/model.ts';
import {storedContact,validateContact} from '../src/contact/model.ts';
import {exact,referenceId} from '../src/orders/model.ts';
import {ProductError} from '../src/products/model.ts';
export function contactService(db:Firestore,access:(tx:Transaction,uid:string)=>Promise<void>){
 const ref=db.doc('siteSettings/storeContent');
 async function get(){const raw=(await ref.get()).data()??{},specific=raw.contactMeta?.updatedAt?.toMillis?.()??null,shared=raw.updatedAt?.toMillis?.()??null;return {contact:storedContact(raw.contact),revision:raw.revision??0,updatedAt:specific??shared,updatedScope:specific!==null?'contact':shared!==null?'document':'none'};}
 return {get,async save(uid:string,body:Record<string,unknown>){exact(body,['action','contact','expectedRevision','operationId']);const input=validateContact(body.contact),operation=referenceId(body.operationId),hash=createHash('sha256').update(JSON.stringify(input)).digest('hex');if(!Number.isSafeInteger(body.expectedRevision)||(body.expectedRevision as number)<0)throw new ProductError('invalid','Invalid contact revision.');
  await db.runTransaction(async tx=>{await access(tx,uid);const doc=await tx.get(ref),old=doc.data()??{};if(old.schemaVersion!==undefined&&old.schemaVersion!==1)throw new ProductError('schema','Saved contact settings need owner review.');if(old.contactMeta?.operationId===operation){if(old.contactMeta.hash!==hash||old.contactMeta.actor!==uid)throw new ProductError('conflict','Contact save operation changed.');return;}if((old.revision??0)!==body.expectedRevision)throw new ProductError('conflict','Website settings changed. Your contact entries are kept; review the latest saved version before saving.');
   if(!doc.exists)tx.set(ref,{...blankContent(),schemaVersion:1});
   tx.update(ref,{...Object.fromEntries(Object.entries(input).flatMap(([key,value])=>key==='addressDetails'?Object.entries(value).map(([field,v])=>['contact.addressDetails.'+field,v]):[['contact.'+key,value]])),revision:(old.revision??0)+1,updatedAt:FieldValue.serverTimestamp(),updatedBy:uid,contactMeta:{operationId:operation,hash,actor:uid,updatedAt:FieldValue.serverTimestamp()}});
  });return get();
 }};
}
