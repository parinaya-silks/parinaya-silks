import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {serverFirebase} from '../server/firebase.ts';
import {catalogService} from '../server/catalog.ts';
import {catalogHandler} from '../server/handler.ts';
import {emptyProduct} from '../src/products/model.ts';
import {initialShipping} from '../src/shipping/model.ts';
import type {DecodedIdToken} from 'firebase-admin/auth';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('Loopback emulators required');
process.env.PARINAYA_SERVER_EMULATORS='true';
test('persistent storefront themes and public, token-owned coupon discovery use real exported API and checkout',async()=>{
 const db=serverFirebase().database,op=()=>randomUUID().replaceAll('-',''),prefix='theme-offers-',pid='t'.repeat(20),cid='s'.repeat(20);
 const service=catalogService({database:db,auth:{verifyIdToken:async token=>{if(token==='bad')throw Object.assign(Error(),{code:'auth/invalid-id-token'});return {uid:prefix+token,email:'synthetic@example.test',aud:'parinaya-silks',admin:['owner','claim'].includes(token)} as unknown as DecodedIdToken;}},media:{} as any});
 const server=createServer(catalogHandler(()=>service,()=>{})).listen(0,'127.0.0.1');await once(server,'listening');const url=`http://127.0.0.1:${(server.address() as {port:number}).port}/api/catalog`;
 const post=async(body:unknown,token:string|null='owner')=>{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});return {status:r.status,value:await r.json()};};
 const theme=(name='light-maroon',rev=0,id=op())=>({action:'settings:save',shipping:null,appearance:null,expectedShippingRevision:0,expectedAppearanceRevision:0,storefrontAppearance:{theme:name},expectedStorefrontAppearanceRevision:rev,operationId:id});
 try{
  // This file runs between isolated service tests, before any browser fixture exists.
  for(const name of ['siteSettings','coupons','orders','categories','products','customerShopping','adminAccess'])for(const d of (await db.collection(name).get()).docs)await db.recursiveDelete(d.ref);
  for(const role of ['owner','record'])await db.doc('adminAccess/'+prefix+role).set({enabled:true});
  assert.equal((await (await fetch(url+'?content=store')).json()).storefrontAppearance.theme,'classic-cream');
  for(const role of ['customer','record','claim'])assert.equal((await post(theme(),role)).status,403);
  assert.equal((await post(theme(),null)).status,401);const save=theme();assert.equal((await post(save)).status,200);assert.equal((await post(save)).status,200);
  const ref=db.doc('siteSettings/storefrontAppearance');assert.equal((await ref.get()).get('revision'),1);await ref.update({unrelated:'keep'});
  assert.equal((await post(theme('classic-cream',0))).status,409);assert.equal((await post(theme('classic-cream',1))).status,200);assert.equal((await ref.get()).get('unrelated'),'keep');
  const publicTheme=(await (await fetch(url+'?content=store')).json()).storefrontAppearance;assert.deepEqual(publicTheme,{theme:'classic-cream',revision:2});assert.equal((await post({action:'settings:get'})).value.storefrontAppearance.revision,2);
  assert.equal((await db.doc('siteSettings/shipping').get()).exists,false);assert.equal((await db.doc('siteSettings/loginAppearance').get()).exists,false);
  const c={kind:'fixed',value:10000,enabled:true,discoverable:true,minimumPaise:0,capPaise:null,globalLimit:null,perCustomerLimit:null,startsAt:null,endsAt:null,revision:1,uses:0};
  for(const [code,extra] of Object.entries({PUBLIC:{},THIRD:{eligibleOrderNumber:3},PRIVATE:{discoverable:false},DISABLED:{enabled:false},EXPIRED:{endsAt:1},FUTURE:{startsAt:Date.now()+86400000},EXHAUSTED:{globalLimit:1,uses:1},LEGACY:{discoverable:false},MINIMUM:{minimumPaise:99999999}}))await db.doc('coupons/'+code).set({...c,code,...extra});
  const guest=await (await fetch(url+'?coupons=available')).json();assert.deepEqual(guest.items.map((v:any)=>v.code),['MINIMUM','PUBLIC','THIRD']);assert.ok(guest.items.every((v:any)=>v.state==='login'));assert.equal(JSON.stringify(guest).includes('operationHash'),false);
  assert.equal((await fetch(url+'?coupons=available&uid=other')).status,400);assert.equal((await post({action:'coupons:available'},null)).status,401);assert.equal((await post({action:'coupons:available'},'bad')).status,401);assert.equal((await post({action:'coupons:available',uid:prefix+'other'},'customer')).status,400);assert.equal((await post({action:'coupons:available',eligibleOnly:true},null)).status,401);assert.equal((await post({action:'coupons:available',eligibleOnly:'true'},'customer')).status,400);
  await db.doc('categories/'+cid).set({enabled:true,name:'Local'});await db.doc('products/'+pid).set({...emptyProduct(),name:'Synthetic offer product',description:'Local fixture description.',slug:'theme-offers-product',sku:'THEME',categoryId:cid,status:'Published',schemaVersion:1,revision:1,pricePaise:100000,inventory:{mode:'simple',quantity:10},coverMediaId:'f'.repeat(32),images:[{mediaId:'f'.repeat(32),alt:'Fixture',url:'https://res.cloudinary.com/parinaya-emulator/image/upload/v1/fixture.jpg',width:300,height:400}],createdAt:new Date(),updatedAt:new Date()});await db.doc('siteSettings/shipping').set({...initialShipping(),schemaVersion:1,revision:1});
  for(const role of ['customer','other'])await db.doc('customerShopping/'+prefix+role+'/bag/'+pid+'--simple').set({productId:pid,variantId:null,quantity:1});
  const list=async(role='customer',eligibleOnly=false)=>{const r=await post({action:'coupons:available',eligibleOnly},role);assert.equal(r.status,200,JSON.stringify(r.value));return r.value.items as any[];};
  for(const status of ['Cancelled','Rejected','Placed','Confirmed','Processing','Shipped'])await db.doc('orders/'+prefix+status).set({uid:prefix+'customer',status});
  for(let n=0;n<=3;n++){
   const offers=await list();const third=offers.find(v=>v.code==='THIRD');if(n<2){assert.equal(third.state,'upcoming');assert.match(third.message,new RegExp('Complete '+(2-n)+' more Delivered'));}else if(n===2)assert.equal(third.state,'eligible');else assert.equal(third,undefined);
   const eligible=await list('customer',true);assert.deepEqual(eligible.map(v=>v.code),n===2?['PUBLIC','THIRD']:['PUBLIC']);assert.ok(eligible.every(v=>v.state==='eligible'));assert.equal(offers.find(v=>v.code==='PUBLIC').state,'eligible');assert.equal(offers.find(v=>v.code==='MINIMUM').state,'minimum');
   await db.doc('orders/'+prefix+n).set({uid:prefix+'customer',status:'Delivered',paymentStatus:'due'});
  }
  assert.equal((await list('other')).find(v=>v.code==='THIRD').state,'upcoming');assert.deepEqual((await list('other',true)).map(v=>v.code),['PUBLIC']);
  const line=db.doc('customerShopping/'+prefix+'other/bag/'+pid+'--simple');await line.update({quantity:2});await db.doc('coupons/MINIMUM').update({minimumPaise:200000});assert.deepEqual((await list('other',true)).map(v=>v.code),['MINIMUM','PUBLIC']);await line.update({quantity:1});assert.deepEqual((await list('other',true)).map(v=>v.code),['PUBLIC']);await line.delete();assert.deepEqual(await list('other',true),[]);await line.set({productId:pid,variantId:null,quantity:1});
  await db.doc('coupons/PUBLIC/customers/'+prefix+'customer').set({uses:1});await db.doc('coupons/PUBLIC').update({perCustomerLimit:1});assert.deepEqual(await list('customer',true),[]);assert.equal((await list()).some(v=>v.code==='PUBLIC'),false);assert.equal((await list('other')).some(v=>v.code==='PUBLIC'),true);
  const reviewed=await post({action:'orders:review',addressId:null,couponCode:'PUBLIC'},'other');assert.equal(reviewed.status,200);assert.equal(reviewed.value.discountPaise,'10000');assert.equal((await db.doc('coupons/PUBLIC').get()).get('uses'),0);
  await db.doc('coupons/PUBLIC').update({enabled:false});assert.equal((await post({action:'orders:review',addressId:null,couponCode:'PUBLIC'},'other')).status,409);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));for(const name of ['siteSettings','coupons','orders','categories','products','customerShopping','adminAccess'])for(const d of(await db.collection(name).get()).docs)await db.recursiveDelete(d.ref);}
});
