import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import {once} from 'node:events';
import handler from '../api/catalog.ts';
import {serverFirebase} from '../server/firebase.ts';
import {indiaDate} from '../src/orders/delivery.ts';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw new Error('Loopback emulators required.');
process.env.PARINAYA_SERVER_EMULATORS='true';
test('delivery exported handler: both admin checks, atomic metadata/ETA audit, dispatch, revision and exact retry invariants',async()=>{
 const {database:db,auth}=serverFirebase(),tokens:Record<string,string>={},users:string[]=[],id='d'.repeat(32),other='e'.repeat(32),op=()=>randomUUID().replaceAll('-','');
 const server=createServer(handler).listen(0,'127.0.0.1');await once(server,'listening');const url=`http://127.0.0.1:${(server.address() as {port:number}).port}/api/catalog`;
 const call=async(body:Record<string,unknown>,role='admin')=>{const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(tokens[role]?{Authorization:'Bearer '+tokens[role]}:{})},body:JSON.stringify(body)});return {status:response.status,data:await response.json()};};
 const ref=db.doc('orders/'+id),request=(revision:number,patch:Record<string,unknown>={})=>({action:'adminOrders:update',id,command:'delivery-details',expectedRevision:revision,operationId:op(),...patch});
 const snapshot={uid:'delivery-customer',email:'delivery-customer@example.test',reference:'PS-'+id.toUpperCase(),status:'Processing',revision:1,courier:'',trackingNumber:'',trackingUrl:'',createdAt:new Date(),updatedAt:new Date(),history:[],refunds:[],collection:null,paymentStatus:'due',collectedPaise:0,refundPaise:0,totalPaise:'1250000',subtotalPaise:'1250000',shippingPaise:'0',discountPaise:'0',stockRestored:false,items:[],internalNotes:'private',request:null};
 try{
  for(const [role,claim,enabled]of [['admin',true,true],['claim',true,false],['record',false,true],['customer',false,false]] as const){const uid='delivery-'+role,password=randomUUID()+'Aa9!';users.push(uid);await auth.createUser({uid,email:uid+'@example.test',password});await auth.setCustomUserClaims(uid,{admin:claim});await db.doc('adminAccess/'+uid).set({enabled});const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=synthetic',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:uid+'@example.test',password,returnSecureToken:true})});tokens[role]=(await response.json()).idToken;}
  await ref.set(snapshot);await db.doc('orders/'+other).set({...snapshot,uid:'someone-else'});
  assert.equal((await call({...request(1),id:other,command:'Shipped'})).status,400,'Dispatch requires complete resulting courier/tracking record');
  const legacy=await call({...request(1,{estimatedDeliveryDate:indiaDate()}),id:other});assert.equal(legacy.status,200);assert.equal(legacy.data.status,'Processing');
  const concurrent=await Promise.all(['Courier A','Courier B'].map(courier=>call({...request(2,{courier}),id:other})));assert.deepEqual(concurrent.map(result=>result.status).sort(),[200,409]);assert.equal((await db.doc('orders/'+other).get()).data()!.history.length,2,'Exactly one concurrent update commits with its audit');
  assert.equal((await call(request(1,{courier:'Test Courier'}),'guest')).status,401);
  for(const role of ['claim','record','customer'])assert.equal((await call(request(1,{courier:'Test Courier'}),role)).status,403);
  assert.equal((await call({...request(1),action:'orders:request',courier:'Bypass'},'customer')).status,403);
  assert.equal((await call(request(1))).status,400,'No-op rejected');
  let saved=await call(request(1,{courier:' Test Courier ',trackingNumber:' AWB-1/IN ',trackingUrl:'https://courier.example/track',estimatedDeliveryDate:indiaDate()}));assert.equal(saved.status,200);let order=saved.data;assert.equal(order.status,'Processing');assert.equal(order.estimatedDeliveryDate,indiaDate());assert.equal(order.courier,'Test Courier');assert.equal(order.trackingNumber,'AWB-1/IN');assert.equal(order.history.at(-1).action,'Delivery details updated');assert.equal(order.history.at(-1).actor,'delivery-admin');
  for(const key of ['totalPaise','paymentStatus','collectedPaise','stockRestored','items','internalNotes'])assert.deepEqual(order[key],snapshot[key as keyof typeof snapshot]);
  assert.equal((await call(request(1,{courier:'Stale Courier'}))).status,409);
  for(const trackingUrl of ['javascript:alert(1)','https://user:password@courier.example'])assert.equal((await call(request(2,{trackingUrl}))).status,400);
  assert.equal((await call(request(2,{estimatedDeliveryDate:'2026-02-30'}))).status,400);
  const dispatch={...request(2),command:'Shipped'};saved=await call(dispatch);assert.equal(saved.status,200);order=saved.data;assert.equal(order.status,'Shipped');assert.equal(order.courier,'Test Courier','Dispatch uses saved required values');assert.equal(order.paymentStatus,'due');
  const replay=await call(dispatch);assert.equal(replay.status,200);assert.equal(replay.data.history.length,order.history.length);assert.equal(replay.data.revision,order.revision);assert.equal((await call({...dispatch,courier:'Changed retry'})).status,409);
  assert.equal((await call(request(3,{trackingNumber:''}))).status,400,'Cannot erase required shipped tracking');
  saved=await call(request(3,{estimatedDeliveryDate:null,trackingUrl:''}));assert.equal(saved.status,200);order=saved.data;assert.equal(order.estimatedDeliveryDate,null);assert.equal(order.trackingUrl,'');assert.equal(order.status,'Shipped');
  await ref.update({estimatedDeliveryDate:'2020-01-01'});saved=await call(request(4,{courier:'Corrected Courier'}));assert.equal(saved.status,200);order=saved.data;assert.equal(order.estimatedDeliveryDate,'2020-01-01','Omission preserves overdue estimate');
  const customer=await call({action:'orders:get',id},'customer');assert.equal(customer.status,200);assert.equal(customer.data.courier,'Corrected Courier');assert.equal(customer.data.estimatedDeliveryDate,'2020-01-01');assert.ok(!('internalNotes' in customer.data));assert.ok(customer.data.history.every((event:any)=>!('actor' in event)&&!('note' in event)));assert.equal((await call({action:'orders:get',id:other},'customer')).status,404);
  assert.equal((await call({...request(5),command:'Confirmed'})).status,409);
  saved=await call({...request(5),command:'Delivered'});assert.equal(saved.status,200);assert.equal(saved.data.paymentStatus,'due');assert.equal(saved.data.collectedPaise,0);
  for(const status of ['Delivered','Cancelled','Rejected']){await ref.update({status});assert.equal((await call(request(6,{courier:'Terminal edit'}))).status,409);}
  const audit=(await db.collection('inventoryAudit').where('orderId','==',id).get()).size;assert.equal(audit,0,'Delivery operations never change stock');
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));await ref.delete();await db.doc('orders/'+other).delete();for(const uid of users){await db.doc('adminAccess/'+uid).delete();await auth.deleteUser(uid);}}
});
