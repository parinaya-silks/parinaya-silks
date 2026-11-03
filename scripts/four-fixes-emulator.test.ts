import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {createServer} from 'node:http';import {once} from 'node:events';
import {serverFirebase} from '../server/firebase.ts';import {catalogService} from '../server/catalog.ts';import {catalogHandler} from '../server/handler.ts';
import {emptyBalance,loyaltyQuote,loyaltySnapshot,type LoyaltySettings} from '../src/loyalty/model.ts';import {loyaltyService} from '../server/loyalty.ts';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('Loopback only');process.env.PARINAYA_SERVER_EMULATORS='true';
test('trusted category media saves and bulk-style transitions preserve authorization, snapshots and idempotency',async()=>{
 const db=serverFirebase().database,op=()=>randomUUID().replaceAll('-','');
 const service=catalogService({database:db,auth:{verifyIdToken:async uid=>({uid,aud:'parinaya-silks',admin:uid==='four-owner'||uid==='four-claim'}) as any},media:{sign:()=>({}),verify:async ticket=>({url:'https://res.cloudinary.com/parinaya-emulator/image/upload/'+ticket.publicId+'.png',publicId:ticket.publicId,assetId:'local',width:800,height:800,bytes:1000,format:'png',version:1})}});
 await db.doc('adminAccess/four-owner').set({enabled:true});await db.doc('adminAccess/four-record').set({enabled:true});
 const server=createServer(catalogHandler(()=>service,()=>{})).listen(0,'127.0.0.1');await once(server,'listening');const url='http://127.0.0.1:'+(server.address() as any).port+'/api/catalog';
 const call=async(body:any,uid='four-owner')=>{const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json',...(uid?{authorization:'Bearer '+uid}:{})},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
 try{
  const id='FourCategoryFixture1',input={name:'Category fixture',slug:'four-category-fixture',description:'Local',enabled:true,displayOrder:1},mid=op();
  const sign={action:'categories:sign',categoryId:id,device:'desktop',mediaId:mid,type:'image/png',size:1000};
  for(const role of ['four-customer','four-claim','four-record'])assert.equal((await call(sign,role)).status,403);assert.equal((await call(sign,'')).status,401);
  assert.equal((await call(sign)).status,200);assert.equal((await db.doc('categories/'+id).get()).exists,false,'uploads are not published');
  const verified=await call({action:'categories:verify',categoryId:id,device:'desktop',mediaId:mid});assert.equal(verified.status,200);const image={...verified.body,alt:'Category saree photo'};
  const save={action:'categories:save',id,expectedUpdatedAt:0,category:{...input,homepageImage:image}};
  assert.equal((await call({...save,category:{...save.category,homepageImage:{...image,mediaId:op()}}})).status,400);
  assert.equal((await call(save)).status,200);const original=(await db.doc('categories/'+id).get()).data()!;assert.equal((await call(save)).status,200);assert.ok((await db.doc('categories/'+id).get()).get('updatedAt').isEqual(original.updatedAt));
  assert.equal((await call({...save,id:'OtherCategoryFixture',category:{...input,slug:'other-fixture',homepageImage:image}})).status,400,'media is category-bound');
  await db.doc('categories/'+id).update({unrelated:'retained'});const edit={...save,expectedUpdatedAt:original.updatedAt.toMillis(),category:{...input,homepageImage:null}};assert.equal((await call(edit)).status,200);assert.equal((await db.doc('categories/'+id).get()).get('unrelated'),'retained');assert.equal((await db.doc('categoryMedia/'+mid).get()).get('verified'),true,'removing never deletes media');assert.equal((await call({...edit,category:{...input,name:'Stale',homepageImage:null}})).status,409);
  // Each order retains its own courier/AWB. No shared fulfillment fields are sent.
  const settings:LoyaltySettings={revision:1,config:{enabled:true,earnSpendPaise:10000,earnPoints:10,pointValuePaise:100,minRedeemPoints:10,maxPercent:20,allowCoupons:true}},loyalty=loyaltyService(db),requests:any[]=[];
  for(let i=0;i<3;i++){const oid=op(),uid='four-customer-'+i,snapshot=loyaltySnapshot(settings,loyaltyQuote(settings,emptyBalance(),100000n,false,0),[100000n],100000n)!;
   await db.runTransaction(async tx=>{loyalty.placed(tx,uid,emptyBalance(),snapshot,oid,'LOCAL');tx.set(db.doc('orders/'+oid),{schemaVersion:1,uid,email:'local@example.test',reference:'PS-'+oid.toUpperCase(),status:'Shipped',revision:1,paymentStatus:'due',collectedPaise:0,totalPaise:'100000',shippingPaise:'0',items:[],address:{recipientName:'Local'},history:[],refunds:[],request:null,collection:null,loyalty:snapshot,courier:'Local courier',trackingNumber:i===2?'':'AWB-'+i,trackingUrl:'',createdAt:new Date(),updatedAt:new Date()});});requests.push({action:'adminOrders:update',id:oid,expectedRevision:1,operationId:op(),expectedStatus:'Shipped',command:'Delivered'});
  }
  assert.equal((await call(requests[0],'four-claim')).status,403);assert.equal((await call({...requests[0],expectedStatus:'Processing'})).status,409);assert.equal((await call({...requests[0],command:'Cancelled'})).status,409);
  const results=await Promise.all(requests.map(r=>call(r)));assert.deepEqual(results.map(r=>r.status),[200,200,400]);
  for(const request of requests.slice(0,2)){assert.equal((await call(request)).status,200);assert.equal((await call({...request,operationId:op()})).status,409);const saved=(await db.doc('orders/'+request.id).get()).data()!;assert.equal(saved.paymentStatus,'due');assert.equal(saved.collectedPaise,0);assert.equal(saved.history.length,1);assert.equal((await db.collection('loyaltyAccounts/'+saved.uid+'/ledger').where('kind','==','Earned').get()).size,1);assert.equal((await db.doc('loyaltyAccounts/'+saved.uid).get()).get('net'),100);}
 }finally{for(let i=0;i<3;i++){const uid='four-customer-'+i;for(const doc of (await db.collection('orders').where('uid','==',uid).get()).docs)await db.recursiveDelete(doc.ref);await db.recursiveDelete(db.doc('loyaltyAccounts/'+uid));}await db.doc('categories/FourCategoryFixture1').delete();await db.doc('categorySlugs/four-category-fixture').delete();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
