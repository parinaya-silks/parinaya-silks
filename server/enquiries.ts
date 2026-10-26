import {createHash} from 'node:crypto';
import {FieldPath,FieldValue,Timestamp,type Firestore,type Transaction} from 'firebase-admin/firestore';
import {parsePhoneNumberFromString} from 'libphonenumber-js/max';
import {exact,referenceId} from '../src/orders/model.ts';
import {ProductError} from '../src/products/model.ts';
import {validateEnquiry,enquiryTerm,enquiryFilters,type EnquiryRow,type Enquiry,type EnquiryStatus} from '../src/enquiries/model.ts';
const digest=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export function enquiryPrefixes(name:string,email:string,phone:string){const terms=[name,...name.split(/\s+/),email,phone,phone?parsePhoneNumberFromString(phone)?.nationalNumber||'':''].map(enquiryTerm);return [...new Set(terms.flatMap(v=>Array.from({length:Math.min(v.length,254)},(_,i)=>v.slice(0,i+1))))];}
export function enquiriesService(db:Firestore,access:(tx:Transaction,uid:string)=>Promise<void>,clock:()=>number=Date.now){
 const collection=db.collection('enquiries');
 function present(id:string,v:FirebaseFirestore.DocumentData,full=false):EnquiryRow|Enquiry{if(v.schemaVersion!==1||!['New','Read','Replied'].includes(v.status)||!v.createdAt?.toMillis||!Number.isSafeInteger(v.revision))throw new ProductError('schema','This enquiry needs owner review.');const row={id,name:v.name,email:v.email,phone:v.phone,preview:v.message.slice(0,240),status:v.status,createdAt:v.createdAt.toMillis(),revision:v.revision};return full?{...row,message:v.message}:row;}
 async function get(id:string){const doc=await collection.doc(referenceId(id)).get();if(!doc.exists)throw new ProductError('not-found','This enquiry is no longer available.');return present(doc.id,doc.data()!,true) as Enquiry;}
 return {async submit(body:Record<string,unknown>){
  exact(body,['action','enquiry','operationId','website']);if(typeof body.website!=='string'||body.website!=='')throw new ProductError('invalid','Unable to accept this submission.');
  const input=validateEnquiry(body.enquiry),id=referenceId(body.operationId),hash=digest(input),receipt=db.doc('enquiryReceipts/'+id),hour=Math.floor(clock()/3600000),limits=[{ref:db.doc('enquirySubmissionLimits/email_'+digest(input.email.toLowerCase())+'_'+hour),max:5},{ref:db.doc('enquirySubmissionLimits/global_'+hour),max:200}];
  await db.runTransaction(async tx=>{const previous=await tx.get(receipt);if(previous.exists){if(previous.data()!.hash!==hash)throw new ProductError('conflict','This submission attempt changed. Please start a new submission.');return;}
   const counters=await tx.getAll(...limits.map(v=>v.ref));if(counters.some((doc,i)=>(doc.data()?.count??0)>=limits[i].max))throw new ProductError('rate-limited','Too many messages have been submitted recently. Please try again in an hour.');
   for(const [i,item]of limits.entries())tx.set(item.ref,{count:(counters[i].data()?.count??0)+1,expiresAt:Timestamp.fromMillis((hour+48)*3600000)});
   tx.create(collection.doc(id),{schemaVersion:1,name:input.name,email:input.email,phone:input.phone,message:input.message,searchPrefixes:enquiryPrefixes(input.name,input.email,input.phone),status:'New',createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp(),revision:1});
   tx.create(receipt,{hash,receivedAt:FieldValue.serverTimestamp()});
  });return {received:true};
 },async admin(uid:string,body:Record<string,unknown>){
  if(body.action==='enquiries:get'){exact(body,['action','id']);return get(referenceId(body.id));}
  if(body.action==='enquiries:list'){
   exact(body,['action','search','status'],['cursor']);const f=enquiryFilters(body.search,body.status),key=digest(f);let query=collection.orderBy('createdAt','desc').orderBy(FieldPath.documentId(),'desc');
   if(f.search)query=query.where('searchPrefixes','array-contains',f.search);if(f.status!=='All')query=query.where('status','==',f.status);
   if(body.cursor!==undefined){try{if(typeof body.cursor!=='string'||body.cursor.length>1500)throw Error();const c=JSON.parse(Buffer.from(body.cursor,'base64url').toString());if(!Array.isArray(c)||c.length!==4||c[0]!==key||!Number.isSafeInteger(c[1])||!Number.isInteger(c[2])||c[2]<0||c[2]>999999999)throw Error();query=query.startAfter(new Timestamp(c[1],c[2]),referenceId(c[3]));}catch{throw new ProductError('invalid','This enquiry page no longer matches the filters. Refresh the list.');}}
   const docs=await query.limit(21).get(),page=docs.docs.slice(0,20),last=page.at(-1);return {items:page.map(doc=>present(doc.id,doc.data())),nextCursor:docs.size>20&&last?Buffer.from(JSON.stringify([key,last.get('createdAt').seconds,last.get('createdAt').nanoseconds,last.id])).toString('base64url'):null};
  }
  if(!['enquiries:update','enquiries:delete'].includes(String(body.action)))throw new ProductError('invalid','Unsupported enquiry action.');
  const deleting=body.action==='enquiries:delete';exact(body,['action','id','expectedRevision','operationId'],deleting?[]:['status']);const id=referenceId(body.id),operationId=referenceId(body.operationId),status=body.status as EnquiryStatus;if(!deleting&&!['Read','Replied'].includes(status)||!Number.isSafeInteger(body.expectedRevision)||(body.expectedRevision as number)<1)throw new ProductError('invalid','Choose a valid enquiry update.');
  const hash=digest([deleting?'delete':status,body.expectedRevision]),ref=collection.doc(id),receipt=db.doc('enquiryReceipts/'+id);
  await db.runTransaction(async tx=>{await access(tx,uid);const [doc,proof]=await tx.getAll(ref,receipt),old=doc.data(),operation=deleting?proof.data()?.deleteOperation:old?.lastOperation;
   if(operation?.id===operationId){if(operation.hash!==hash||operation.actor!==uid)throw new ProductError('conflict','This enquiry operation changed.');return;}
   if(!old)throw new ProductError('not-found','This enquiry is no longer available.');present(id,old);
   if(old.revision!==body.expectedRevision)throw new ProductError('conflict','This enquiry changed. Reload its latest details before continuing.');
   if(deleting){tx.delete(ref);tx.set(receipt,{deleteOperation:{id:operationId,hash,actor:uid,at:FieldValue.serverTimestamp()}},{merge:true});}
   else{if(old.status==='Replied'||old.status===status)throw new ProductError('conflict','This enquiry status has already changed. Reload its latest details.');tx.update(ref,{status,revision:old.revision+1,updatedAt:FieldValue.serverTimestamp(),updatedBy:uid,lastOperation:{id:operationId,hash,actor:uid}});}
  });return deleting?{deleted:true,id}:get(id);
 }};
}
