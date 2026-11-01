import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {serverFirebase} from '../server/firebase.ts';
import {catalogService} from '../server/catalog.ts';
import {catalogHandler} from '../server/handler.ts';
import {seedDiscovery,categoryId,productId} from './discovery-fixtures.ts';
import {discoveryFilters,matchesFilters} from '../src/products/discovery.ts';
import type {DecodedIdToken} from 'firebase-admin/auth';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('Loopback emulators required');process.env.PARINAYA_SERVER_EMULATORS='true';
test('HTTP catalog discovery covers all enabled categories, whole-scope filters/counts, stable pages and secured banner settings',async()=>{
 const db=serverFirebase().database;await seedDiscovery(db);
 const service=catalogService({database:db,auth:{verifyIdToken:async uid=>({uid,admin:['owner','claim'].includes(uid),aud:'parinaya-silks'}) as unknown as DecodedIdToken},media:{sign:()=>({}),verify:async()=>{throw Error('No uploads');}}});
 const diagnostics:unknown[]=[],server=createServer(catalogHandler(()=>service,d=>diagnostics.push(d))).listen(0,'127.0.0.1');await once(server,'listening');const origin='http://127.0.0.1:'+(server.address() as {port:number}).port;
 const get=async(p:Record<string,string>)=>{const r=await fetch(origin+'/api/catalog?'+new URLSearchParams({browse:'1',...p}));return {status:r.status,body:await r.json()};};
 const post=async(body:Record<string,unknown>,token?:string)=>{const r=await fetch(origin+'/api/catalog',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
 try{
  for(const slug of ['cotton-sarees','silk-sarees','empty-collection',...Array.from({length:18},(_,i)=>'collection-'+(i+3))]){const v=await get({category:slug});assert.equal(v.status,200);assert.equal(v.body.total,slug==='cotton-sarees'?118:slug==='silk-sarees'?117:0);assert.ok(v.body.items.every((p:any)=>p.categoryId===(slug==='cotton-sarees'?categoryId(0):categoryId(1))));}
  for(const slug of ['collection-21','unknown'])assert.equal((await get({category:slug})).status,404);
  const raw=await service.publicBrowse({browse:'1',sort:'newest'});const all:any[]=[];let cursor: string|null=null;
  do{const page=await get({sort:'newest',...(cursor?{cursor}:{})});assert.equal(page.status,200);assert.equal(page.body.total,235);all.push(...page.body.items);cursor=page.body.nextCursor;}while(cursor);
  assert.equal(all.length,235);assert.equal(new Set(all.map(p=>p.id)).size,235);assert.ok(all.every((p,i)=>!i||all[i-1].createdAt>p.createdAt||all[i-1].createdAt===p.createdAt&&all[i-1].id>p.id));assert.ok(all.every(p=>p.name!=='Private fixture'));
  for(const sort of ['featured','newest','price-asc','price-desc']){const v=await get({category:'cotton-sarees',sort,q:'blue',minPrice:'100001',maxPrice:'1000000',colors:'red|blue',inStock:'true'});assert.equal(v.status,200);const expected=all.filter(p=>p.categoryId===categoryId(0)&&matchesFilters(p,discoveryFilters({q:'blue',minPrice:'100001',maxPrice:'1000000',colors:'red|blue',inStock:'true'})));assert.equal(v.body.total,expected.length);assert.deepEqual(new Set(v.body.items.map((p:any)=>p.id)),new Set(expected.map(p=>p.id)));if(sort.startsWith('price'))assert.ok(v.body.items.every((p:any,i:number)=>!i||(sort==='price-asc'?v.body.items[i-1].pricePaise<=p.pricePaise:v.body.items[i-1].pricePaise>=p.pricePaise)));}
  const blue=await get({q:'blue'});assert.equal(blue.body.total,25);assert.equal(blue.body.items.length,25);assert.equal((await get({q:'no-match'})).body.total,0);
  assert.equal((await get({minPrice:'10',maxPrice:'9'})).status,400);assert.equal((await get({cursor:raw.nextCursor!,q:'blue'})).status,409);
  const campaign=await get({campaign:'local-campaign',q:'local',category:'cotton-sarees',sort:'price-desc'});assert.equal(campaign.status,200,JSON.stringify(campaign.body));assert.equal(campaign.body.total,40);assert.ok(campaign.body.items.every((p:any)=>p.categoryId===categoryId(0)&&Number(p.sku.slice(6))<80));
  const campaignBlue=await get({campaign:'local-campaign',q:'blue'});assert.equal(campaignBlue.body.total,0);
  const source=JSON.stringify((await db.doc('products/'+productId(0)).get()).data());
  for(const uid of ['owner','record'])await db.doc('adminAccess/'+uid).set({enabled:true});
  const saved=(await post({action:'settings:get'},'owner')).body;assert.deepEqual(saved.homepageBanners,{seconds:3,revision:0});
  await db.doc('siteSettings/homepageBanners').set({seconds:100,revision:0,privateMarker:'keep'});assert.equal((await service.publicContent()).bannerSeconds,3);
  const body={action:'settings:save',shipping:null,appearance:null,expectedShippingRevision:saved.shipping.revision,expectedAppearanceRevision:saved.appearance.revision,homepageBanners:{seconds:6},expectedBannerRevision:0,operationId:randomUUID().replaceAll('-','')};
  assert.equal((await post(body)).status,401);for(const role of ['customer','record','claim'])assert.equal((await post(body,role)).status,403);
  for(const seconds of [1,16,3.5,'3',null])assert.equal((await post({...body,homepageBanners:{seconds}},'owner')).status,400);
  const contentBefore=JSON.stringify((await db.doc('siteSettings/storeContent').get()).data()),otherBefore=await Promise.all(['shipping','loginAppearance','loyalty'].map(async name=>(await db.doc('siteSettings/'+name).get()).data()));
  assert.equal((await post(body,'owner')).status,200);assert.equal((await post(body,'owner')).status,200);assert.equal((await service.publicContent()).bannerSeconds,6);assert.equal((await db.doc('siteSettings/homepageBanners').get()).data()!.revision,1);assert.equal((await db.doc('siteSettings/homepageBanners').get()).data()!.privateMarker,'keep');
  assert.equal((await post({...body,homepageBanners:{seconds:7},operationId:randomUUID().replaceAll('-','')},'owner')).status,409);
  assert.equal(JSON.stringify((await db.doc('siteSettings/storeContent').get()).data()),contentBefore);assert.equal(JSON.stringify((await db.doc('products/'+productId(0)).get()).data()),source);assert.deepEqual(await Promise.all(['shipping','loginAppearance','loyalty'].map(async name=>(await db.doc('siteSettings/'+name).get()).data())),otherBefore);
  assert.equal(diagnostics.length,0);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
