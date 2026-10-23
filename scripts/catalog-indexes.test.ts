import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
import {AggregateField} from 'firebase-admin/firestore';
import {readFileSync} from 'node:fs';
import {browseService} from '../server/browse.ts';
import {businessService} from '../server/business.ts';
import {ReportingQueryError} from '../server/errors.ts';
import {catalogDiagnostic,catalogFailure,firestoreIndexLink} from '../server/diagnostics.ts';
const evidence=JSON.parse(readFileSync('scripts/fixtures/report-index-evidence.json','utf8'));
const indexes=JSON.parse(readFileSync('firestore.indexes.json','utf8')).indexes;
// Capture actual query builder calls, not a second copy of the query definitions.
function database(){
 const queries:any[]=[];
 function collection(name:string,filters:any[]=[],orders:any[]=[]){
  const query:any={name,filters,orders,
   where(field:any,operator:any,value:any){return collection(name,[...filters,{field,operator,value}],orders);},
   orderBy(field:any,direction='asc'){orders.push({field:typeof field==='string'?field:'__name__',direction});return query;},
   limit(n:number){assert.ok(n<=200);return query;},
   async get(){queries.push(query);return name==='categories'?{empty:false,docs:[{id:'c'.repeat(20)}]}:{size:0,docs:[]};},
   count(){return {async get(){queries.push({...query,countOnly:true,filters:[...filters]});return {data:()=>({count:0})};}};},
   aggregate(fields:any){assert.deepEqual(Object.keys(fields),['count','valuePaise','collectedPaise','refundPaise']);assert.ok(fields.valuePaise.isEqual(AggregateField.sum('reportingPaise')));assert.ok(fields.collectedPaise.isEqual(AggregateField.sum('collectedPaise')));assert.ok(fields.refundPaise.isEqual(AggregateField.sum('refundPaise')));return {async get(){queries.push({...query,aggregate:true,filters:[...filters]});return {data:()=>({count:0,valuePaise:0,collectedPaise:0,refundPaise:0})};}};}
  };return query;
 }
 return {queries,db:{collection,runTransaction:async(callback:any,options:any)=>{assert.equal(options.readOnly,true);return callback({get:(query:any)=>query.get()});}} as any};
}
function covered(name:string,fields:any[]){
 assert.ok(indexes.some((index:any)=>index.collectionGroup===name&&index.queryScope==='COLLECTION'&&JSON.stringify(index.fields)===JSON.stringify(fields)),name+': '+JSON.stringify(fields));
}
const asc=(fieldPath:string)=>({fieldPath,order:'ASCENDING'}),desc=(fieldPath:string)=>({fieldPath,order:'DESCENDING'});
test('actual browse sorts, category and combined filters match prepared collection indexes and descending ID tie-break',async()=>{
 for(const sort of [undefined,'featured','newest','price-asc','price-desc'])for(const category of [undefined,'fixture']){
  const {db,queries}=database();await browseService(db,async()=>{throw new Error('No rows expected');})({browse:'1',...(sort?{sort}:{}),...(category?{category}:{}),q:'saree',colors:'red|gold',maxPrice:'100000',inStock:'true',sale:'true'});
  for(const query of queries){const fields=query.filters.map((f:any)=>asc(f.field));if(query.name==='products'){
    assert.deepEqual(query.orders.at(-1),{field:'__name__',direction:'desc'});
    fields.push(...query.orders.filter((o:any)=>o.field!=='__name__').map((o:any)=>o.direction==='asc'?asc(o.field):desc(o.field)));
  }covered(query.name,fields);}
 }
});
test('actual report aggregates with and without dates have all sum fields covered',async()=>{
 for(const range of [{},{from:0},{to:1000},{from:0,to:1000}]){
  const {db,queries}=database();await businessService(db,async()=>{}).admin('synthetic',{action:'reports:get',...range});
  assert.equal(queries.length,16);
  for(const query of queries){const fields=query.filters.filter((f:any)=>f.field!=='createdAt').sort((a:any,b:any)=>query.countOnly?(a.field==='status'?-1:b.field==='status'?1:0):a.field.localeCompare(b.field)).map((f:any)=>asc(f.field));
   if(query.filters.some((f:any)=>f.field==='createdAt'))fields.push(asc('createdAt'));
   if(!query.countOnly){fields.push(asc('collectedPaise'),asc('refundPaise'),asc('reportingPaise'));const actual=evidence.required.find((row:any)=>row.shape===(query.filters.some((f:any)=>f.field==='paymentStatus')?'due':'status')&&row.dated===query.filters.some((f:any)=>f.field==='createdAt'));assert.deepEqual(fields,actual.index.fields.filter((f:any)=>f.fieldPath!=='__name__'));}
   if(fields.length>1)covered('orders',fields);else assert.equal(fields[0].fieldPath,'status');
  }
 }
});
test('index diagnostics retain only trusted project-bound composite links, never arbitrary error text',()=>{
 const url='https://console.firebase.google.com/v1/r/project/parinaya-silks/firestore/indexes?create_composite=YWJjZA==';
 assert.equal(firestoreIndexLink('The query requires an index. Create it here: '+url),url);
 for(const unsafe of [url+'&token=secret',url.replace('parinaya-silks','other-project'),url.replace('console.firebase.google.com','evil.example'),url+'#secret'])assert.equal(firestoreIndexLink(unsafe),undefined);
 const diagnostic=catalogDiagnostic(Object.assign(new Error('The query requires an index '+url+' private-detail'),{code:9}),'fixture','operation','browse');
 assert.match(JSON.stringify(diagnostic),/indexCreationUrl/);assert.doesNotMatch(JSON.stringify(diagnostic),/private-detail/);
});

test('live missing-index links decode to four absent exact collection indexes; ready indexes are not recreated',()=>{
 const require=createRequire(import.meta.url),root=dirname(require.resolve('@google-cloud/firestore/package.json'));
 const Index=require(join(root,'build/protos/firestore_admin_v1_proto_api.js')).google.firestore.admin.v1.Index;
 assert.equal(evidence.readyOrdersIndexes.length,7);assert.ok(evidence.readyOrdersIndexes.every((index:any)=>index.state==='READY'));
 assert.equal(evidence.required.length,4);
 for(const row of evidence.required){const url=firestoreIndexLink(row.indexCreationUrl);assert.ok(url);const decoded=Index.toObject(Index.decode(Buffer.from(new URL(url!).searchParams.get('create_composite')!,'base64url')),{enums:String});assert.deepEqual(decoded,row.index);
  covered('orders',decoded.fields.filter((f:any)=>f.fieldPath!=='__name__'));
  assert.ok(!evidence.readyOrdersIndexes.some((index:any)=>JSON.stringify(index.fields)===JSON.stringify(decoded.fields)));
  assert.deepEqual(decoded.fields.slice(-4).map((f:any)=>f.fieldPath),['collectedPaise','refundPaise','reportingPaise','__name__']);
 }
});

test('report query context and original index URL survive wrapping without leaking to the public error',()=>{
 const original=Object.assign(new Error('The query requires an index. '+evidence.required[1].indexCreationUrl),{code:9});
 const wrapped=new ReportingQueryError('status-aggregate-date-range',original),failure=catalogFailure(wrapped);
 assert.equal(failure.status,503);assert.equal(failure.code,'index-required');
 const diagnostic=catalogDiagnostic(wrapped,'synthetic-request','operation','reports:get');
 assert.equal((diagnostic.errors[0] as any).reportQuery,'status-aggregate-date-range');assert.equal((diagnostic.errors[1] as any).indexCreationUrl,evidence.required[1].indexCreationUrl);
 assert.ok(!JSON.stringify(failure).includes('reportQuery'));assert.ok(!JSON.stringify(failure).includes('console.firebase'));
});
