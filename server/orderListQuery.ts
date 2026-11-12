import {FieldPath,Timestamp,type Query,type DocumentSnapshot,type QueryDocumentSnapshot} from 'firebase-admin/firestore';
import {catalogFailure} from './diagnostics.ts';

export type OrderListConstraint=[field:string,operator:'=='|'in'|'>='|'<=',value:unknown];
const scalar=(value:any)=>value instanceof Timestamp?value.valueOf():value;
function matches(doc:QueryDocumentSnapshot,filters:OrderListConstraint[]){
 return filters.every(([field,operator,value])=>{
  const actual=scalar(doc.get(field)),expected=scalar(value);
  if(operator==='in')return (value as unknown[]).includes(actual);
  if(operator==='==')return actual===expected;
  return actual!=null&&(operator==='>='?actual>=expected:actual<=expected);
 });
}

// Use the indexed query normally. Only the authorized Admin summary can opt
// into this read-only fallback; other failures and customer queries propagate.
export async function readOrderList(query:Query,limit:number,fallback?:{collection:Query;filters:OrderListConstraint[];after?:DocumentSnapshot}){
 try{return (await query.limit(limit).get()).docs;}
 catch(error){
  if(!fallback||catalogFailure(error).code!=='index-required')throw error;
  // createdAt + document ID use the ordinary single-field index. Date bounds
  // stay on that field; all other predicates are checked before pagination.
  let scan=fallback.collection;
  for(const [field,operator,value] of fallback.filters)if(field==='createdAt')scan=scan.where(field,operator,value);
  scan=scan.orderBy('createdAt','desc').orderBy(FieldPath.documentId(),'desc');
  let after=fallback.after,read=0;
  const found:QueryDocumentSnapshot[]=[];
  while(read<5000){
   const batch=await (after?scan.startAfter(after):scan).limit(100).get();
   for(const doc of batch.docs){if(matches(doc,fallback.filters))found.push(doc);if(found.length===limit)return found;}
   read+=batch.size;
   if(batch.size<100)return found;
   after=batch.docs.at(-1);
  }
  // Never present a truncated scan as an empty/complete result. If the scope
  // exceeds the fallback budget, keep the original actionable index error.
  if((await scan.startAfter(after!).limit(1).get()).empty)return found;
  throw error;
 }
}
