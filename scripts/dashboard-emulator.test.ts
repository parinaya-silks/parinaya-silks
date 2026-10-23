import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';import {randomUUID} from 'node:crypto';import {createServer} from 'node:http';import {once} from 'node:events';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import handler from '../api/catalog.ts';import {serverFirebase} from '../server/firebase.ts';import {customRange} from '../src/admin/dashboard/model.ts';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw new Error('Loopback emulators required.');
process.env.PARINAYA_SERVER_EMULATORS='true';
test('dashboard exported handler: India dates, global backlog/COD, minimum customer projection and audited revision-safe actions',async()=>{
 const env=await initializeTestEnvironment({projectId:'parinaya-silks',firestore:{host:'127.0.0.1',port:8080,rules:await readFile('firestore.rules','utf8')}}),{database:db,auth}=serverFirebase(),tokens:Record<string,string>={},users:string[]=[],op=()=>randomUUID().replaceAll('-','');
 const server=createServer(handler).listen(0,'127.0.0.1');await once(server,'listening');const url=`http://127.0.0.1:${(server.address() as {port:number}).port}/api/catalog`;
 const call=async(body:Record<string,unknown>,role='owner')=>{const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(tokens[role]?{Authorization:'Bearer '+tokens[role]}:{})},body:JSON.stringify(body)});return {status:response.status,data:await response.json()};};
 const range=customRange('2026-10-23','2026-10-23'),oid=(n:number)=>n.toString(16).padStart(32,'0');
 try{
  await env.clearFirestore();
  for(const [role,claim,enabled]of [['owner',true,true],['customer',false,false],['claim',true,false],['record',false,true]] as const){const uid='dashboard-'+role,password=randomUUID()+'Aa9!';users.push(uid);await auth.createUser({uid,email:uid+'@example.test',password});await auth.setCustomUserClaims(uid,{admin:claim});if(enabled)await db.doc('adminAccess/'+uid).set({enabled:true});const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=synthetic',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:uid+'@example.test',password,returnSecureToken:true})});tokens[role]=(await response.json()).idToken;}
  const requests=[{action:'dashboard:period',from:range.from,to:range.to},{action:'dashboard:backlog'},{action:'dashboard:orders',from:range.from,to:range.to}];
  for(const body of requests){assert.equal((await call(body,'guest')).status,401);for(const role of ['customer','claim','record'])assert.equal((await call(body,role)).status,403);}
  assert.equal((await call(requests[0])).data.count,0);assert.equal((await call(requests[1])).data.duePaise,0);assert.deepEqual((await call(requests[2])).data.items,[]);
  const statuses=['Placed','Placed','Placed','Confirmed','Processing','Shipped','Delivered','Delivered','Cancelled','Rejected','Delivered','Delivered'];
  for(let i=0;i<statuses.length;i++){const collected=[7,11].includes(i),total=i===10?8000:10000;await db.doc('orders/'+oid(i+1)).set({schemaVersion:1,uid:'private-customer',email:'private@example.test',reference:'PS-'+oid(i+1).toUpperCase(),currency:'INR',status:statuses[i],paymentMethod:'COD',paymentStatus:collected?'collected':'due',revision:1,address:{recipientName:'Emulator Customer',mobileNumber:i===2?null:'+919876543210',line1:'PRIVATE STREET'},items:[],history:[],refunds:[],request:null,collection:null,internalNotes:'PRIVATE NOTE',reportingPaise:total,collectedPaise:i===10?3000:collected?10000:0,refundPaise:i===11?2000:0,totalPaise:String(total),subtotalPaise:String(total),shippingPaise:'0',discountPaise:'0',createdAt:new Date(i===0?range.from:i===1?range.from-1:i===2?range.to:i===3||i===4?range.from-86400000:range.from+1000),updatedAt:new Date()});}
  assert.equal((await call(requests[0])).data.count,2,'Both IST boundaries included; preceding day excluded');
  const backlog=(await call(requests[1])).data;assert.equal(backlog.toPack,1);assert.equal(backlog.processing,1);assert.equal(backlog.duePaise,75000,'Current active COD less existing collections; refunds are not new delivery debt');
  const recent=(await call(requests[2])).data;assert.equal(recent.items.length,5);assert.doesNotMatch(JSON.stringify(recent),/PRIVATE|private@example|private-customer/);assert.ok(recent.items.every((order:{createdAt:number})=>order.createdAt>=range.from&&order.createdAt<=range.to));
  const filtered=(await call({...requests[2],status:'Placed'})).data;assert.equal(filtered.items.length,2);assert.equal(filtered.items[0].customerPhone,null);
  assert.equal((await call({...requests[0],from:range.to,to:range.from})).status,400);assert.equal((await call({...requests[2],status:'Packed'})).status,400);
  const action={action:'adminOrders:update',id:oid(1),expectedRevision:1,operationId:op(),command:'Confirmed',note:'Dashboard fixture'};
  assert.equal((await call(action)).status,200);assert.equal((await call(action)).status,200);assert.equal((await db.doc('orders/'+oid(1)).get()).data()!.history.length,1);
  const partial=await Promise.all([call({...action,id:oid(3),operationId:op()}),call({...action,operationId:op()})]);assert.deepEqual(partial.map(item=>item.status),[200,409]);
  assert.equal((await call({...action,id:oid(2),command:'Shipped',operationId:op()})).status,409);
  const before=(await call(requests[1])).data.duePaise;assert.equal((await call({...action,id:oid(6),command:'Delivered',operationId:op()})).status,200);assert.equal((await call(requests[1])).data.duePaise,before,'Delivered is not collected');
  const collect={...action,id:oid(6),expectedRevision:2,command:'collect',reference:'LOCAL REMITTANCE',operationId:op()};assert.equal((await call(collect)).status,200);assert.equal((await call(collect)).status,200);assert.equal((await call(requests[1])).data.duePaise,before-10000);
  await db.doc('adminAccess/dashboard-owner').update({enabled:false});for(const body of [...requests,{...action,operationId:op()}])assert.equal((await call(body)).status,403);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));for(const uid of users)await auth.deleteUser(uid);await env.clearFirestore();await env.cleanup();}
});
