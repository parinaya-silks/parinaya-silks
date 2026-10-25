import {createHash} from 'node:crypto';
import {FieldValue,type Firestore,type Transaction} from 'firebase-admin/firestore';
import {blankContent} from '../src/content/model.ts';
import {sectionDefinition,sectionValue,websiteSnapshot} from '../src/content/sections.ts';
import {ProductError} from '../src/products/model.ts';
import {exact,referenceId} from '../src/orders/model.ts';
export function websiteTextService(db:Firestore,access:(tx:Transaction,uid:string)=>Promise<void>){
 const ref=db.doc('siteSettings/storeContent');
 async function list(){return websiteSnapshot((await ref.get()).data()??{});}
 return {list,async get(body:Record<string,unknown>){exact(body,['action','section']);const section=sectionDefinition(body.section),snapshot=await list();return {revision:snapshot.revision,section:snapshot.sections.find(s=>s.id===section.id)!};},async save(uid:string,body:Record<string,unknown>){
  exact(body,['action','section','value','expectedRevision','operationId']);const section=sectionDefinition(body.section),value=sectionValue(section.id,body.value),operation=referenceId(body.operationId),hash=createHash('sha256').update(JSON.stringify(value)).digest('hex');
  if(!Number.isSafeInteger(body.expectedRevision)||(body.expectedRevision as number)<0)throw new ProductError('invalid','Invalid website content revision.');
  if(section.kind==='policy'&&(!('approved' in value&&value.approved)||!('text' in value&&value.text.trim())))throw new ProductError('invalid','Confirm nonempty policy wording is approved by the business owner before saving.');
  await db.runTransaction(async tx=>{
   await access(tx,uid);const doc=await tx.get(ref),old=doc.data()??{},metadata=old.textSectionMeta?.[section.id];
   if(old.schemaVersion!==undefined&&old.schemaVersion!==1)throw new ProductError('schema','Saved website content needs owner review.');
   if(metadata?.operationId===operation){if(metadata.hash!==hash||metadata.actor!==uid)throw new ProductError('conflict','This save operation already has different content.');return;}
   if((old.revision??0)!==body.expectedRevision)throw new ProductError('conflict','Website content changed in another session. Your entries are kept. Reload the saved section and review before saving.');
   const patch:Record<string,unknown>={revision:(old.revision??0)+1,updatedAt:FieldValue.serverTimestamp(),updatedBy:uid,[`textSectionMeta.${section.id}`]:{updatedAt:FieldValue.serverTimestamp(),actor:uid,operationId:operation,hash}};
   if(section.kind==='policy'){const policy=value as {heading:string;text:string;approved:boolean};patch[`policies.${section.id}.heading`]=policy.heading;patch[`policies.${section.id}.text`]=policy.text;patch[`policies.${section.id}.approved`]=policy.approved;}
   else patch[`textSections.${section.id}`]=value;
   if(!doc.exists)tx.set(ref,{...blankContent(),schemaVersion:1});
   tx.update(ref,patch);
   // Text-only changes never write siteSettings/returns, shipping, assignments or media.
  });const snapshot=await list();return {revision:snapshot.revision,section:snapshot.sections.find(s=>s.id===section.id)!};
 }};
}
