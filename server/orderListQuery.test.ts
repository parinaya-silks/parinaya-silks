import test from 'node:test';
import assert from 'node:assert/strict';
import {Timestamp,type Query} from 'firebase-admin/firestore';
import {readOrderList,type OrderListConstraint} from './orderListQuery.ts';
import {orderLoadError} from '../src/admin/orders/model.ts';

const missingIndex=Object.assign(new Error('The query requires an index.'),{code:9});
const failing=(error=missingIndex)=>({limit(){return this;},async get(){throw error;}}) as unknown as Query;
function fixture(count:number){
 const rows=Array.from({length:count},(_,i)=>({id:String(count-i).padStart(32,'0'),get(field:string){return ({createdAt:Timestamp.fromMillis(count-i),paymentStatus:i%20===0?'due':'collected',status:i%40===0?'Confirmed':'Placed',reference:'PS-'+i} as any)[field];}}));
 const calls:{filters:OrderListConstraint[];limit:number}[]=[];
 function query(filters:OrderListConstraint[]=[],after?:string,limit=100){
  const q:any={where:(field:any,op:any,value:any)=>query([...filters,[field,op,value]],after,limit),orderBy:()=>q,startAfter:(doc:any)=>query(filters,doc.id,limit),limit:(n:number)=>query(filters,after,n),async get(){
   assert.ok(filters.every(([field])=>field==='createdAt'),'fallback must not require a composite index');calls.push({filters,limit});
   const docs=rows.filter(row=>(!after||row.id<after)&&filters.every(([field,op,value])=>op==='>='?row.get(field).toMillis()>=(value as Timestamp).toMillis():row.get(field).toMillis()<=(value as Timestamp).toMillis())).slice(0,limit);
   return {docs,size:docs.length,empty:!docs.length};
  }};return q;
 }
 return {collection:query() as Query,rows,calls};
}
test('missing-index fallback filters before paging across batches and keeps newest-first cursors',async()=>{
 const f=fixture(501),filters:OrderListConstraint[]=[['paymentStatus','==','due']];
 const first=await readOrderList(failing(),11,{collection:f.collection,filters});assert.equal(first.length,11);assert.equal(first[0].id,f.rows[0].id);assert.equal(first[10].id,f.rows[200].id);assert.equal(f.calls.length,3);
 const next=await readOrderList(failing(),11,{collection:f.collection,filters,after:first[9]});assert.equal(next[0].id,first[10].id);assert.ok(!next.some(row=>first.slice(0,10).some(prior=>prior.id===row.id)));
 const combined=await readOrderList(failing(),11,{collection:f.collection,filters:[...filters,['status','in',['Confirmed']],['createdAt','>=',Timestamp.fromMillis(421)],['createdAt','<=',Timestamp.fromMillis(461)]]});assert.deepEqual(combined.map(row=>row.id),[f.rows[40].id,f.rows[80].id]);
 const exact=await readOrderList(failing(),11,{collection:f.collection,filters:[...filters,['reference','==','PS-500']]});assert.deepEqual(exact.map(row=>row.id),[f.rows[500].id]);
 assert.deepEqual(await readOrderList(failing(),11,{collection:f.collection,filters:[['reference','==','PS-missing']]}),[]);
});
test('indexed success needs no scan; permission, outage, unrelated precondition and customer errors propagate',async()=>{
 const f=fixture(1),success={limit(){return this;},async get(){return {docs:f.rows};}} as unknown as Query;
 assert.deepEqual(await readOrderList(success,11,{collection:f.collection,filters:[]}),f.rows);assert.equal(f.calls.length,0);
 for(const error of [Object.assign(new Error('denied'),{code:7}),Object.assign(new Error('offline'),{code:14}),Object.assign(new Error('other precondition'),{code:9})])await assert.rejects(readOrderList(failing(error),11,{collection:f.collection,filters:[]}),value=>value===error);
 await assert.rejects(readOrderList(failing(),11),value=>value===missingIndex);assert.equal(f.calls.length,0);
});
test('scan cap fails explicitly instead of reporting partial or false empty results',async()=>{
 const f=fixture(5001);await assert.rejects(readOrderList(failing(),11,{collection:f.collection,filters:[['reference','==','PS-missing']]}),value=>value===missingIndex);assert.equal(f.calls.length,51);
 const exact=fixture(5000);assert.deepEqual(await readOrderList(failing(),11,{collection:exact.collection,filters:[['reference','==','PS-missing']]}),[]);
});
test('order errors retain actionable safe codes and request IDs without echoing backend text',()=>{
 const requestId='12345678-1234-1234-1234-123456789abc';assert.match(orderLoadError({code:'index-required',requestId,message:'PRIVATE'}),/ready Firestore index.*Request ID: /);assert.ok(orderLoadError({code:'index-required',requestId}).endsWith(requestId));
 assert.match(orderLoadError({code:'configuration'}),/cannot access/);assert.equal(orderLoadError({code:'internal',requestId:'PRIVATE',message:'PRIVATE'}),'Unable to load orders. Please try again.');assert.equal(orderLoadError(null),'Unable to load orders. Please try again.');
});
