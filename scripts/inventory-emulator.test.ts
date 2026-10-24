import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,setLogLevel} from 'firebase/firestore';
import {catalogService} from '../server/catalog.ts';
import {serverFirebase} from '../server/firebase.ts';
import {emptyProduct} from '../src/products/model.ts';
import type {DecodedIdToken} from 'firebase-admin/auth';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('Loopback emulators required');
process.env.PARINAYA_SERVER_EMULATORS='true';setLogLevel('silent');
test('inventory adjustments are atomic, narrow, revision checked, exactly retryable and dual-admin protected',async()=>{
 const env=await initializeTestEnvironment({projectId:'parinaya-silks',firestore:{host:'127.0.0.1',port:8080,rules:await readFile('firestore.rules','utf8')}}),db=serverFirebase().database,op=()=>randomUUID().replaceAll('-',''),id='i'.repeat(20),ref=db.doc('products/'+id);
 const service=catalogService({database:db,auth:{verifyIdToken:async token=>({uid:token,aud:'parinaya-silks',admin:['owner','claim'].includes(token)}) as unknown as DecodedIdToken},media:{} as any}),call=(body:Record<string,unknown>,role='owner')=>service.privileged(role,body);
 try{await env.clearFirestore();for(const uid of ['owner','record'])await db.doc('adminAccess/'+uid).set({enabled:true});
  const base={...emptyProduct(),slug:'inventory-test',schemaVersion:1,revision:1,inventory:{mode:'simple',quantity:3},lowStockThreshold:2,pricePaise:1234,privateLegacy:'preserve',createdAt:new Date(),updatedAt:new Date()};await ref.set(base);
  const body={action:'inventory:adjust',productId:id,variantId:null,delta:-1,reason:'Physical count correction',note:'Fixture',expectedRevision:1,operationId:op()};
  for(const role of ['customer','claim','record'])for(const request of [body,{action:'inventory:history',productId:id},{action:'list'}])await assert.rejects(call(request,role),{code:'permission'});
  await Promise.all([call(body),call(body)]);assert.equal((await ref.get()).get('inventory.quantity'),2);assert.equal((await db.collection('inventoryAudit').get()).size,1);assert.equal((await ref.get()).get('privateLegacy'),'preserve');assert.equal((await ref.get()).get('pricePaise'),1234);
  await assert.rejects(call({...body,delta:1}),{code:'conflict'});await assert.rejects(call({...body,operationId:op()}),{code:'conflict'});
  let revision=2;const adjust=(change:Record<string,unknown>)=>call({...body,delta:1,expectedRevision:revision,operationId:op(),...change});
  for(const change of [{delta:1.5},{delta:-3},{delta:1000001},{reason:''},{variantId:'wrong'},{delta:0},{threshold:-1},{threshold:1.5},{expectedRevision:0}])await assert.rejects(adjust(change));
  const before=(await ref.get()).data()!;await adjust({delta:0,threshold:5});revision++;const after=(await ref.get()).data()!;assert.deepEqual(after.inventory,before.inventory);assert.equal(after.lowStockThreshold,5);const threshold=(await db.collection('inventoryAudit').where('source','==','threshold').get()).docs[0].data();assert.equal(threshold.delta,0);assert.equal(threshold.thresholdBefore,2);assert.equal(threshold.thresholdAfter,5);
  await ref.update({inventory:{mode:'variants',variants:[{id:'red',name:'Red',hex:'#FF0000',sku:'RED',quantity:1},{id:'blue',name:'Blue',hex:'#0000FF',sku:'BLUE',quantity:0}]},revision:4});revision=4;
  const race=await Promise.allSettled([adjust({variantId:'red',delta:-1}),adjust({variantId:'red',delta:2})]);assert.equal(race.filter(v=>v.status==='fulfilled').length,1);assert.equal((await ref.get()).get('inventory.variants')[1].quantity,0);
  revision=5;await assert.rejects(adjust({variantId:null}));await assert.rejects(adjust({variantId:'removed'}));
  const audits=await call({action:'inventory:history',productId:id}) as any;assert.equal(audits.items.length,3);assert.equal(audits.items[0].actor,'owner');
  for(let i=0;i<26;i++)await db.doc('inventoryAudit/history'+i).set({productId:id,before:base.inventory,after:base.inventory,reason:'Pagination fixture',createdAt:new Date(1000+i)});
  const first=await call({action:'inventory:history',productId:id}) as any,second=await call({action:'inventory:history',productId:id,cursor:first.nextCursor}) as any;assert.equal(first.items.length,25);assert.equal(second.items.length,4);assert.equal(new Set([...first.items,...second.items].map(v=>v.id)).size,29);
  await db.doc('inventoryAudit/other').set({productId:'x'.repeat(20),createdAt:new Date()});await assert.rejects(call({action:'inventory:history',productId:id,cursor:'other'}),{code:'invalid'});
  // Competing order-style transaction reads current stock, deducts and increments revision.
  // The manual request must either precede it or conflict; it cannot overwrite the deduction.
  await ref.update({inventory:{mode:'simple',quantity:3},revision:10});revision=10;
  const [manual]=await Promise.allSettled([adjust({delta:1}),db.runTransaction(async tx=>{const doc=await tx.get(ref),old=doc.data()!;tx.update(ref,{inventory:{mode:'simple',quantity:old.inventory.quantity-1},revision:old.revision+1});})]);
  assert.equal((await ref.get()).get('inventory.quantity'),manual.status==='fulfilled'?3:2);
  const customer=env.authenticatedContext('customer').firestore();await assertFails(getDoc(doc(customer,'inventoryAudit',body.operationId)));await assertFails(setDoc(doc(customer,'inventoryAudit',op()),{delta:1}));await db.doc('adminAccess/owner').update({enabled:false});await assert.rejects(adjust({variantId:'red'}),{code:'permission'});
 }finally{await env.clearFirestore();await env.cleanup();}
});
