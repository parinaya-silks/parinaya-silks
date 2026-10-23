import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';import {randomUUID} from 'node:crypto';import {createServer} from 'node:http';import {once} from 'node:events';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import handler from '../api/catalog.ts';import {serverFirebase} from '../server/firebase.ts';import {customRange} from '../src/admin/dashboard/model.ts';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw new Error('Loopback emulators required.');
process.env.PARINAYA_SERVER_EMULATORS='true';
test('orders list handler: dual admin authorization, narrow snapshots, exact search, combined filters, cursor pages and safe errors',async()=>{
 const env=await initializeTestEnvironment({projectId:'parinaya-silks',firestore:{host:'127.0.0.1',port:8080,rules:await readFile('firestore.rules','utf8')}}),{database:db,auth}=serverFirebase(),tokens:Record<string,string>={},users:string[]=[];
 const server=createServer(handler).listen(0,'127.0.0.1');await once(server,'listening');const url=`http://127.0.0.1:${(server.address() as {port:number}).port}/api/catalog`;
 const call=async(body:Record<string,unknown>,role='owner')=>{const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(tokens[role]?{Authorization:'Bearer '+tokens[role]}:{})},body:JSON.stringify(body)});return {status:response.status,data:await response.json()};};
 const request={action:'adminOrders:list',view:'summary',pageSize:10},id=(n:number)=>n.toString(16).padStart(32,'0'),range=customRange('2026-10-22','2026-10-22');
 try{
  await env.clearFirestore();
  for(const [role,claim,enabled]of [['owner',true,true],['customer',false,false],['claim',true,false],['record',false,true]] as const){const uid='list-'+role,password=randomUUID()+'Aa9!';users.push(uid);await auth.createUser({uid,email:uid+'@example.test',password});await auth.setCustomUserClaims(uid,{admin:claim});if(enabled)await db.doc('adminAccess/'+uid).set({enabled:true});const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=synthetic',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:uid+'@example.test',password,returnSecureToken:true})});tokens[role]=(await response.json()).idToken;}
  assert.equal((await call(request,'guest')).status,401);for(const role of ['customer','claim','record'])assert.equal((await call(request,role)).status,403);
  assert.deepEqual((await call(request)).data,{items:[],nextCursor:null});
  for(let i=0;i<25;i++)await db.doc('orders/'+id(i+1)).set({uid:'private',email:'private@example.test',reference:'PS-'+id(i+1).toUpperCase(),status:i%2?'Confirmed':'Placed',revision:1,paymentStatus:i===24?'collected':'due',collectedPaise:i===24?10000:i===1?3000:0,totalPaise:'10000',address:{recipientName:i===0?'=HYPERLINK("bad")':'List fixture '+i,mobileNumber:'+919876543210',line1:'PRIVATE STREET'},internalNotes:'PRIVATE',items:[],history:[],createdAt:new Date(range.from+i*1000),updatedAt:new Date()});
  const first=await call(request);assert.equal(first.status,200);assert.equal(first.data.items.length,10);assert.ok(first.data.nextCursor);assert.equal(first.data.items[0].id,id(25));assert.ok(!JSON.stringify(first.data).includes('private@example.test'));assert.ok(!JSON.stringify(first.data).includes('PRIVATE'));assert.ok(!('address' in first.data.items[0]));
  const second=(await call({...request,cursor:first.data.nextCursor})).data,third=(await call({...request,cursor:second.nextCursor})).data;assert.equal(third.items.length,5);assert.equal(third.nextCursor,null);assert.equal(new Set([...first.data.items,...second.items,...third.items].map((row:any)=>row.id)).size,25);
  assert.equal((await call({...request,pageSize:25})).data.nextCursor,null,'lookahead avoids a false extra page when size is exact');
  const ref='PS-'+id(2).toUpperCase(),exact=await call({...request,search:ref.toLowerCase(),statuses:['Placed','Confirmed'],paymentStatus:'due',from:range.from,to:range.to});assert.equal(exact.status,200);assert.equal(exact.data.items.length,1);assert.equal(exact.data.items[0].collectedPaise,'3000');
  assert.equal((await call({...request,search:ref,status:'Placed'})).data.items.length,0);
  assert.equal((await call({...request,from:range.from,to:range.from})).data.items.length,1);assert.equal((await call({...request,from:range.to,to:range.to})).data.items.length,0);
  for(const change of [{statuses:[]},{statuses:['Placed','Placed']},{statuses:['Packed']},{status:'Placed',statuses:['Confirmed']},{view:'private'},{search:'private@example.test'},{from:10,to:0},{paymentStatus:'paid'},{pageSize:26}])assert.equal((await call({...request,...change})).status,400);
  await db.doc('adminAccess/list-owner').update({enabled:false});assert.equal((await call(request)).status,403);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));for(const uid of users)await auth.deleteUser(uid);await env.clearFirestore();await env.cleanup();}
});
