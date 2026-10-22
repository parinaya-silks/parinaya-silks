import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {execFileSync,spawnSync} from 'node:child_process';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {getDoc,getDocs,collection,doc,setDoc,setLogLevel} from 'firebase/firestore';
import handler from '../api/catalog.ts';
import {serverFirebase} from '../server/firebase.ts';
import {emptyProduct} from '../src/products/model.ts';
import {blankAddress} from '../src/delivery/model.ts';
import {initialShipping} from '../src/shipping/model.ts';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw new Error('Loopback emulators required.');
process.env.PARINAYA_SERVER_EMULATORS='true';setLogLevel('silent');
test('shipping API requires both admin permissions; checkout uses saved current policy without writes or client totals',async()=>{
  const env=await initializeTestEnvironment({projectId:'parinaya-silks',firestore:{host:'127.0.0.1',port:8080,rules:await readFile('firestore.rules','utf8')}}),{database:db,auth}=serverFirebase(),users:string[]=[],tokens:Record<string,string>={};
  const server=createServer(handler).listen(0,'127.0.0.1');await once(server,'listening');const url=`http://127.0.0.1:${(server.address() as {port:number}).port}/api/catalog`,op=()=>randomUUID().replaceAll('-','');
  const call=async(body:Record<string,unknown>,role='owner')=>{const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(tokens[role]?{Authorization:'Bearer '+tokens[role]}:{})},body:JSON.stringify(body)});return {status:response.status,data:await response.json()};};
  const save=(expectedRevision:number,settings=initialShipping(),operationId=op())=>call({action:'shipping:save',settings,expectedRevision,operationId});
  const aid='a'.repeat(32),pid='p'.repeat(20),cid='c'.repeat(20),review=()=>call({action:'checkout:review',addressId:aid},'customer');
  try{
    await env.clearFirestore();
    for(const [role,claim,enabled]of [['owner',true,true],['customer',false,false],['claim',true,false],['record',false,true]] as const){const uid='shipping-'+role,password=randomUUID()+'Aa9!';users.push(uid);await auth.createUser({uid,email:uid+'@example.test',password});await auth.setCustomUserClaims(uid,{admin:claim});if(enabled)await db.doc('adminAccess/'+uid).set({enabled:true});const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=synthetic',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:uid+'@example.test',password,returnSecureToken:true})});tokens[role]=(await response.json()).idToken;}
    assert.equal((await call({action:'shipping:get'},'guest')).status,401);
    for(const role of ['customer','claim','record'])for(const action of ['shipping:get','shipping:save'])assert.equal((await call({action},role)).status,403);
    assert.equal((await call({action:'shipping:get'})).data.state,'missing');
    await db.doc('customerShopping/shipping-customer/addresses/'+aid).set({...blankAddress(),recipientName:'Emulator Recipient',mobileNumber:'+919876543210',pinCode:'500034',line1:'Example street',locality:'Locality',city:'Hyderabad',state:'Telangana',revision:1,createdAt:new Date(),updatedAt:new Date()});
    await db.doc('categories/'+cid).set({name:'Silk',enabled:true});
    await db.doc('products/'+pid).set({...emptyProduct(),schemaVersion:1,status:'Published',name:'Shipping Saree',slug:'shipping-saree',sku:'SHIPPING',description:'Emulator fixture',categoryId:cid,pricePaise:999900,inventory:{mode:'simple',quantity:3},images:[{mediaId:'a'.repeat(32),alt:'Saree',url:'https://res.cloudinary.com/parinaya-emulator/image/upload/v1/fixture.jpg',width:300,height:400}],coverMediaId:'a'.repeat(32),createdAt:new Date(),updatedAt:new Date(),revision:1});
    const line=db.doc('customerShopping/shipping-customer/bag/'+pid+'--simple');await line.set({productId:pid,variantId:null,quantity:1,createdAt:new Date(),updatedAt:new Date()});
    let result=await review();assert.equal(result.data.shipping.state,'missing');assert.equal(result.data.shipping.totalPaise,null);assert.equal((await db.doc('siteSettings/shipping').get()).exists,false,'Customer reads must not seed configuration');
    for(const settings of [{...initialShipping(),flatFeePaise:-1},{...initialShipping(),flatFeePaise:1.1},{...initialShipping(),country:'Other'},{...initialShipping(),freeShippingEnabled:'true'}])assert.equal((await call({action:'shipping:save',settings,expectedRevision:0,operationId:op()})).status,400);
    const operation=op();assert.equal((await save(0,initialShipping(),operation)).status,200);assert.equal((await save(0,initialShipping(),operation)).data.revision,1);assert.equal((await save(0)).status,409);
    const cfg=(await db.doc('siteSettings/shipping').get()).data()!;assert.equal(cfg.updatedBy,'shipping-owner');assert.ok(cfg.updatedAt.toMillis()>0);
    const owner=env.authenticatedContext('shipping-owner',{admin:true}).firestore(),customer=env.authenticatedContext('shipping-customer').firestore(),guest=env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(customer,'siteSettings/shippingRevision')));await assertFails(getDoc(doc(guest,'siteSettings/shippingRevision')));
    for(const client of [owner,customer,guest]){await assertFails(getDoc(doc(client,'siteSettings/shipping')));await assertFails(setDoc(doc(client,'siteSettings/shipping'),initialShipping()));await assertFails(setDoc(doc(client,'siteSettings/shippingRevision'),{revision:99}));await assertFails(getDocs(collection(client,'siteSettings')));}
    const beforeBag=(await line.get()).data(),ordersBefore=(await db.collection('orders').get()).size;
    for(const [subtotal,fee,total]of [[999900,'9900','1009800'],[1000000,'9900','1009900'],[1000001,'0','1000001']] as const){await db.doc('products/'+pid).update({pricePaise:subtotal});const beforeProduct=(await db.doc('products/'+pid).get()).data();result=await review();assert.equal(result.status,200);assert.equal(result.data.shipping.shippingPaise,fee);assert.equal(result.data.shipping.totalPaise,total);assert.equal(result.data.shipping.revision,1);assert.deepEqual((await db.doc('products/'+pid).get()).data(),beforeProduct);}
    assert.deepEqual((await line.get()).data(),beforeBag);assert.equal((await db.collection('orders').get()).size,ordersBefore);
    assert.equal((await save(1,{...initialShipping(),flatFeePaise:1234,freeShippingEnabled:false,freeThresholdPaise:100})).data.revision,2);result=await review();assert.equal(result.data.shipping.shippingPaise,'1234');assert.equal(result.data.shipping.totalPaise,'1001235');assert.equal(result.data.shipping.revision,2);
    await save(2,{...initialShipping(),flatFeePaise:0,freeShippingEnabled:false});assert.equal((await review()).data.shipping.shippingPaise,'0');
    await db.doc('products/'+pid).update({'inventory.quantity':0});assert.equal((await review()).data.shipping.state,'blocked');await db.doc('products/'+pid).update({'inventory.quantity':3});
    await line.update({quantity:0});assert.equal((await review()).data.shipping.totalPaise,null);await line.update({quantity:1});
    await db.doc('siteSettings/shipping').update({flatFeePaise:'invalid'});assert.equal((await review()).data.shipping.state,'invalid');assert.equal((await call({action:'shipping:get'})).data.state,'invalid');await save(3);
    assert.equal((await call({action:'checkout:review',addressId:null},'customer')).data.shipping.state,'blocked');
    assert.equal((await call({action:'checkout:review',addressId:aid,shippingPaise:0,totalPaise:1},'customer')).status,400);
    assert.equal((await call({action:'checkout:review',addressId:aid},'owner')).status,403);
    await line.delete();assert.equal((await review()).data.shipping.state,'blocked');
    await db.doc('adminAccess/shipping-owner').update({enabled:false});assert.equal((await save(4)).status,403);
    await db.doc('siteSettings/shipping').delete();await db.doc('siteSettings/shippingRevision').delete();
    const seed=()=>JSON.parse(execFileSync(process.execPath,['--import','tsx','scripts/seed-shipping-local.ts'],{env:process.env,encoding:'utf8',stdio:['ignore','pipe','pipe']}));
    assert.equal(seed().created,true);assert.equal(seed().created,false);assert.equal((await db.doc('siteSettings/shipping').get()).data()!.flatFeePaise,9900);
    const forbidden=spawnSync(process.execPath,['--import','tsx','scripts/seed-shipping-local.ts'],{env:{...process.env,FIRESTORE_EMULATOR_HOST:'',FIREBASE_AUTH_EMULATOR_HOST:''},encoding:'utf8'});assert.notEqual(forbidden.status,0);assert.match(forbidden.stderr,/Loopback emulators only/);
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));for(const uid of users)await auth.deleteUser(uid);await env.clearFirestore();await env.cleanup();}
});
