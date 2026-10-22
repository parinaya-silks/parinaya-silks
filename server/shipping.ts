import {createHash} from 'node:crypto';
import {FieldValue,type Firestore,type Transaction} from 'firebase-admin/firestore';
import {ProductError} from '../src/products/model.ts';
import {savedShipping,validateShipping} from '../src/shipping/model.ts';
export function shippingService(db:Firestore,access:(tx:Transaction,uid:string)=>Promise<void>){
  const ref=db.doc('siteSettings/shipping');
  async function get(){return savedShipping((await ref.get()).data());}
  return {get,async save(uid:string,body:Record<string,unknown>){
    const allowed=['action','settings','expectedRevision','operationId'];
    if(Object.keys(body).some(key=>!allowed.includes(key))||allowed.some(key=>!(key in body)))throw new ProductError('invalid','Unsupported or missing shipping request fields.');
    const input=validateShipping(body.settings);
    if(!Number.isSafeInteger(body.expectedRevision)||(body.expectedRevision as number)<0||typeof body.operationId!=='string'||!/^[a-f0-9]{32}$/.test(body.operationId))throw new ProductError('invalid','Invalid shipping revision or save operation.');
    const hash=createHash('sha256').update(JSON.stringify(input)).digest('hex');
    await db.runTransaction(async tx=>{
      await access(tx,uid);const snapshot=await tx.get(ref),old=snapshot.data();
      if(old&&old.lastOperationId===body.operationId){if(old.lastOperationHash!==hash)throw new ProductError('conflict','This shipping save was used for different changes.');return;}
      if(old&&(!Number.isSafeInteger(old.revision)||old.revision<1||old.revision>=1000000000))throw new ProductError('schema','The shipping revision needs trusted owner review.');
      if((old?.revision||0)!==body.expectedRevision)throw new ProductError('conflict','Shipping settings changed in another session. Cancel to reload before saving.');
      const revision=(old?.revision||0)+1;
      tx.set(ref,{...input,schemaVersion:1,revision,updatedAt:FieldValue.serverTimestamp(),updatedBy:uid,lastOperationId:body.operationId,lastOperationHash:hash});
      // Authenticated customers can listen to this safe invalidation signal only.
      tx.set(db.doc('siteSettings/shippingRevision'),{revision});
    });return get();
  }};
}
