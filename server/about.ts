import {createHash} from 'node:crypto';
import {FieldValue,type Firestore,type Transaction} from 'firebase-admin/firestore';
import {blankContent} from '../src/content/model.ts';
import {storedAbout,validateAbout,type AboutSettings} from '../src/about/model.ts';
import {loginImage} from '../src/appearance/model.ts';
import {exact,referenceId} from '../src/orders/model.ts';
import {ProductError} from '../src/products/model.ts';
export function aboutService(db:Firestore,access:(tx:Transaction,uid:string)=>Promise<void>){
 const ref=db.doc('siteSettings/storeContent');
 async function get(){const raw=(await ref.get()).data()??{};return {about:storedAbout(raw.about),saved:raw.about!==undefined,revision:raw.revision??0,updatedAt:raw.aboutMeta?.updatedAt?.toMillis?.()??null};}
 return {get,async save(uid:string,body:Record<string,unknown>){
  exact(body,['action','about','expectedRevision','operationId']);const input=validateAbout(body.about),operationId=referenceId(body.operationId),hash=createHash('sha256').update(JSON.stringify(input)).digest('hex');if(!Number.isSafeInteger(body.expectedRevision)||(body.expectedRevision as number)<0)throw new ProductError('invalid','Invalid About Us revision.');
  await db.runTransaction(async tx=>{await access(tx,uid);const doc=await tx.get(ref),old=doc.data()??{};
   if(old.schemaVersion!==undefined&&old.schemaVersion!==1)throw new ProductError('schema','Saved website content needs owner review.');
   if(old.aboutMeta?.operationId===operationId){if(old.aboutMeta.hash!==hash||old.aboutMeta.actor!==uid)throw new ProductError('conflict','About Us save operation changed.');return;}
   if((old.revision??0)!==body.expectedRevision)throw new ProductError('conflict','Website content changed. Your About Us entries are kept; review the latest saved version.');
   const about:AboutSettings={...input,photo:null};if(input.photo){const asset=(await tx.get(db.doc('aboutFounderMedia/'+input.photo.mediaId))).data();if(!asset||asset.verified!==true||asset.purpose!=='about-founder'||asset.device!=='desktop'||(asset.uid!==uid&&old.about?.photo?.mediaId!==input.photo.mediaId))throw new ProductError('media','Use a verified founder photo uploaded by this administrator or the existing saved founder photo.');about.photo=loginImage(input.photo,asset.metadata);}
   if(!doc.exists)tx.set(ref,{...blankContent(),schemaVersion:1});
   tx.update(ref,{...Object.fromEntries(Object.entries(about).map(([k,v])=>['about.'+k,v])),revision:(old.revision??0)+1,updatedAt:FieldValue.serverTimestamp(),updatedBy:uid,aboutMeta:{operationId,hash,actor:uid,updatedAt:FieldValue.serverTimestamp()}});
  });return get();
 }};
}
