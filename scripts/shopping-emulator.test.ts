import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {collection,doc,getDoc,getDocs,setDoc,setLogLevel} from 'firebase/firestore';
import handler from '../api/catalog.ts';
import {serverFirebase} from '../server/firebase.ts';
import {emptyProduct} from '../src/products/model.ts';
import {bagId} from '../src/shopping/model.ts';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw new Error('Loopback emulators required.');
process.env.PARINAYA_SERVER_EMULATORS='true';setLogLevel('silent');
test('exported shopping API: real auth, transactions, replay, isolation and live catalog resolution',async()=>{
  const env=await initializeTestEnvironment({projectId:'parinaya-silks',firestore:{host:'127.0.0.1',port:8080,rules:await readFile('firestore.rules','utf8')}});
  const {database:db,auth}=serverFirebase(),users:string[]=[],tokens:Record<string,string>={};
  const server=createServer(handler).listen(0,'127.0.0.1');await once(server,'listening');
  const url=`http://127.0.0.1:${(server.address() as {port:number}).port}/api/catalog`;
  const op=()=>randomUUID().replaceAll('-','');
  const call=async(body:Record<string,unknown>,who='a')=>{const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(tokens[who]?{Authorization:'Bearer '+tokens[who]}:{})},body:JSON.stringify(body)});return {status:response.status,data:await response.json()};};
  const pid='s'.repeat(20),vid='v'.repeat(20),cid='c'.repeat(20);
  const add=(productId=pid,variantId:string|null=null,quantity=1,operationId=op())=>({action:'bag:add',productId,variantId,quantity,operationId});
  const list=async(who='a')=>{const response=await call({action:'shopping:get'},who);assert.equal(response.status,200);return response.data;};
  try{
    await env.clearFirestore();
    for(const role of ['a','b','claim-only','record-only']){
      const uid='shopping-'+role,password=randomUUID()+'Aa9!';users.push(uid);await auth.createUser({uid,email:uid+'@example.test',password,emailVerified:false});
      if(role==='claim-only')await auth.setCustomUserClaims(uid,{admin:true});if(role==='record-only')await db.doc('adminAccess/'+uid).set({enabled:true});
      const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=synthetic',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:uid+'@example.test',password,returnSecureToken:true})});tokens[role]=(await response.json()).idToken;
    }
    assert.equal((await call({action:'shopping:get'},'guest')).status,401);assert.deepEqual(await list(),{bag:[],wishlist:[]});
    for(const who of ['a','claim-only','record-only'])assert.equal((await call({action:'list'},who)).status,403);
    await db.doc('categories/'+cid).set({name:'Emulator Silk',enabled:true});
    const base={...emptyProduct(),schemaVersion:1,status:'Published',name:'Shopping fixture',slug:'shopping-simple',sku:'SECRET-SKU',description:'Emulator-only saree',images:[{mediaId:'a'.repeat(32),alt:'Emulator saree',url:'https://res.cloudinary.com/parinaya-emulator/image/upload/v1/fixture.jpg',width:300,height:400}],coverMediaId:'a'.repeat(32),categoryId:cid,pricePaise:123405,inventory:{mode:'simple',quantity:5},createdAt:new Date(),updatedAt:new Date(),revision:1};
    await db.doc('products/'+pid).set(base);
    await db.doc('products/'+vid).set({...base,slug:'shopping-colours',inventory:{mode:'variants',variants:[{id:'red',name:'Red',hex:'#780D24',sku:'SECRET-RED',quantity:3},{id:'blue',name:'Blue',hex:'#0000FF',sku:'SECRET-BLUE',quantity:0}]}});
    assert.equal((await call({...add(),uid:'shopping-b'})).status,400);assert.equal((await call({...add(),pricePaise:1})).status,400);
    for(const quantity of [0,-1,1.5,6])assert.notEqual((await call(add(pid,null,quantity))).status,200);
    const first=add();assert.equal((await call(first)).status,200);assert.equal((await call(first)).data.outcome,'saved');
    assert.equal((await call({...first,quantity:2})).status,409);
    const duplicates=await Promise.all([call(add()),call(add())]);assert.ok(duplicates.every(value=>value.data.outcome==='already'));
    assert.equal((await list()).bag[0].quantity,1);
    assert.equal((await call(add(vid))).status,409);assert.equal((await call(add(vid,'blue'))).status,409);assert.equal((await call(add(vid,'wrong'))).status,409);assert.equal((await call(add(vid,'red'))).status,200);
    const adjust=(delta:number,operationId=op())=>({action:'bag:adjust',productId:pid,variantId:null,delta,operationId});
    const race=await Promise.all([call(adjust(1)),call(adjust(1))]);assert.ok(race.every(value=>value.status===200));assert.equal((await list()).bag.find((item:any)=>item.productId===pid).quantity,3);
    const repeated=adjust(1);await call(repeated);await call(repeated);assert.equal((await list()).bag.find((item:any)=>item.productId===pid).quantity,4);
    await db.doc('products/'+pid).update({pricePaise:200005,'inventory.quantity':2});
    let item=(await list()).bag.find((item:any)=>item.productId===pid);assert.equal(item.product.pricePaise,200005);assert.match(item.reason,/Only 2/);
    assert.equal((await call(adjust(1))).status,409);assert.equal((await call(adjust(-1))).status,200);assert.equal((await call(adjust(-1))).status,200);assert.equal((await list()).bag.find((item:any)=>item.productId===pid).reason,null);
    const wish=(enabled:boolean,productId=pid)=>({action:'wishlist:set',productId,enabled,operationId:op()});
    await Promise.all([call(wish(true)),call(wish(true))]);assert.equal((await list()).wishlist.length,1);
    await db.doc('products/'+pid).update({'inventory.quantity':0});assert.equal((await call(wish(true))).status,200);
    assert.equal((await list()).wishlist[0].stock,0);assert.equal((await list()).bag.length,2);
    await db.doc('products/'+pid).update({status:'Draft'});item=(await list()).bag.find((item:any)=>item.productId===pid);assert.equal(item.product,null);assert.ok(item.reason);
    await db.doc('products/'+pid).update({status:'Published'});await db.doc('categories/'+cid).update({enabled:false});assert.ok((await list()).bag.every((item:any)=>item.product===null));
    await db.doc('categories/'+cid).update({enabled:true});await db.doc('products/'+vid).delete();assert.equal((await list()).bag.find((item:any)=>item.productId===vid).product,null);
    const owner=env.authenticatedContext('shopping-a').firestore(),other=env.authenticatedContext('shopping-b').firestore(),guest=env.unauthenticatedContext().firestore();
    const path='customerShopping/shopping-a/bag/'+bagId(pid,null);
    await assertSucceeds(getDoc(doc(owner,path)));await assertSucceeds(getDocs(collection(owner,'customerShopping/shopping-a/wishlist')));
    for(const client of [other,guest]){await assertFails(getDoc(doc(client,path)));await assertFails(getDocs(collection(client,'customerShopping/shopping-a/bag')));}
    for(const client of [owner,other,guest])await assertFails(setDoc(doc(client,path),{quantity:999}));
    await assertFails(getDocs(collection(owner,'customerShopping/shopping-a/operations')));assert.deepEqual(await list('b'),{bag:[],wishlist:[]});
    const removal={action:'bag:remove',productId:vid,variantId:'red',operationId:op()};assert.equal((await call(removal)).status,200);assert.equal((await call(removal)).status,200);
    assert.equal((await call(wish(false))).status,200);assert.equal((await list()).wishlist.length,0);
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));for(const uid of users)await auth.deleteUser(uid);await env.clearFirestore();await env.cleanup();}
});
