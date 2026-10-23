import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing';
import {getDoc,setDoc,doc,setLogLevel} from 'firebase/firestore';
import {catalogService} from '../server/catalog.ts';
import {serverFirebase} from '../server/firebase.ts';
import {blankContent} from '../src/content/model.ts';
import {emptyProduct} from '../src/products/model.ts';
import type {DecodedIdToken} from 'firebase-admin/auth';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw new Error('Loopback emulators required.');
process.env.PARINAYA_SERVER_EMULATORS='true';setLogLevel('silent');
test('business APIs enforce dual admin checks, verified purpose-bound CMS media, private drafts, profiles, coupon limits and per-admin notification reads',async()=>{
 const env=await initializeTestEnvironment({projectId:'parinaya-silks',firestore:{host:'127.0.0.1',port:8080,rules:await readFile('firestore.rules','utf8')}}),db=serverFirebase().database,op=()=>randomUUID().replaceAll('-','');
 const media={sign:()=>({uploadUrl:'https://example.test/emulator-upload'}),verify:async(ticket:{publicId:string})=>({assetId:'emulator',publicId:ticket.publicId,url:'https://res.cloudinary.com/parinaya-emulator/image/upload/v1/image.jpg',width:1200,height:800,bytes:3000,format:'jpg',version:1})};
 const service=catalogService({database:db,auth:{verifyIdToken:async token=>({uid:token,aud:'parinaya-silks',email:token+'@example.test',admin:['owner','second','claim'].includes(token)}) as unknown as DecodedIdToken},media}),call=(body:Record<string,unknown>,role='owner')=>service.privileged(role,body);
 try{
  await env.clearFirestore();for(const uid of ['owner','second','record'])await db.doc('adminAccess/'+uid).set({enabled:true});
  for(const action of ['coupons:list','coupons:save','notifications:list','notifications:read','notifications:readAll','customers:list','inventory:adjust','reports:get','content:get','content:save','content:sign','content:verify'])for(const role of ['customer','claim','record'])await assert.rejects(call({action},role),{code:'permission'});
  const uid='customer';await db.doc('customerProfiles/'+uid).set({uid,displayName:'Legacy Name',createdAt:new Date(),updatedAt:new Date()});assert.equal((await call({action:'profile:update',displayName:'Edited Name',mobileNumber:null},uid)).displayName,'Edited Name');await assert.rejects(call({action:'profile:update',displayName:'Edited Name',mobileNumber:null,admin:true},uid),{code:'invalid'});await assert.rejects(call({action:'profile:update',displayName:'Edited Name',mobileNumber:null},'other'),{code:'conflict'});
  let content=blankContent();content.policies.privacy={text:'PRIVATE DRAFT',approved:false};content.contact.email='owner@example.test';const save=(value=content,expectedRevision=content.revision,operationId=op())=>{const {revision,...input}=value;return call({action:'content:save',content:input,expectedRevision,operationId});};
  content=await save() as typeof content;let publicContent=await service.publicContent();assert.equal(publicContent.policies.privacy.text,'');assert.equal(JSON.stringify(publicContent).includes('updatedBy'),false);assert.equal(publicContent.contact.email,'owner@example.test');
  await assert.rejects(save({...content,returnsEnabled:true,returnKinds:['return']}),{code:'invalid'});
  const imageId=op();await call({action:'content:sign',device:'desktop',mediaId:imageId,type:'image/jpeg',size:3000});const image=await call({action:'content:verify',device:'desktop',mediaId:imageId}) as any;assert.equal((await db.doc('homeBannerMedia/'+imageId).get()).data()!.purpose,'home-banner');await assert.rejects(call({action:'appearance:verify',device:'desktop',mediaId:imageId}),{code:'permission'});
  content.banners=[{id:op(),title:'Approved fixture banner',link:'/shop',enabled:true,images:{desktop:image,mobile:null,revision:0}}];const rawSave=()=>{const {revision,...input}=content;return call({action:'content:save',content:{...input,banners:input.banners.map(item=>({...item,images:{desktop:item.images.desktop?{mediaId:item.images.desktop.mediaId,alt:item.images.desktop.alt,focalX:50,focalY:50}:null,mobile:null}}))},expectedRevision:revision,operationId:op()});};
  content=await rawSave() as typeof content;publicContent=await service.publicContent();assert.equal(publicContent.banners.length,1);assert.equal(JSON.stringify(publicContent.banners).includes('mediaId'),false);
  const coupon={code:'TRUSTED',kind:'fixed',value:1000,enabled:true,startsAt:null,endsAt:null,minimumPaise:0,capPaise:null,globalLimit:1,perCustomerLimit:1};const couponOp=op();await call({action:'coupons:save',coupon,expectedRevision:0,operationId:couponOp});await call({action:'coupons:save',coupon,expectedRevision:0,operationId:couponOp});assert.equal((await db.doc('coupons/TRUSTED').get()).data()!.revision,1);await assert.rejects(call({action:'coupons:save',coupon,expectedRevision:0,operationId:op()}),{code:'conflict'});
  const pid='b'.repeat(20),product=db.doc('products/'+pid);await product.set({...emptyProduct(),schemaVersion:1,revision:1,inventory:{mode:'simple',quantity:3},lowStockThreshold:2,createdAt:new Date(),updatedAt:new Date()});const adjust={action:'inventory:adjust',productId:pid,variantId:null,delta:-1,reason:'Emulator stock count',expectedRevision:1,operationId:op()};await call(adjust);await call(adjust);assert.equal((await product.get()).data()!.inventory.quantity,2);assert.equal((await db.collection('adminNotifications').get()).size,1);assert.equal((await call({action:'inventory:history',productId:pid}) as any).items.length,1);
  let list=await call({action:'notifications:list'}) as any;assert.equal(list.unreadCount,1);assert.equal((await call({action:'notifications:list'},'second') as any).items[0].read,false);await call({action:'notifications:read',id:list.items[0].id});assert.equal((await call({action:'notifications:list'}) as any).unreadCount,0);assert.equal((await call({action:'notifications:list'},'second') as any).unreadCount,1);await call({action:'notifications:readAll'},'second');assert.equal((await call({action:'notifications:list'},'second') as any).unreadCount,0);
  for(const client of [env.authenticatedContext('customer').firestore(),env.unauthenticatedContext().firestore()])for(const path of ['siteSettings/storeContent','siteSettings/returns','homeBannerMedia/'+imageId,'adminNotifications/'+list.items[0].id,'coupons/TRUSTED']){await assertFails(getDoc(doc(client,path)));await assertFails(setDoc(doc(client,path),{enabled:true}));}
  const cid='c'.repeat(20),imageId2='e'.repeat(32);await db.doc('categories/'+cid).set({name:'Search category',slug:'search-category',enabled:true});const batch=db.batch();for(let i=0;i<60;i++){const id='z'.repeat(18)+String(i).padStart(2,'0');batch.set(db.doc('products/'+id),{...emptyProduct(),schemaVersion:1,revision:1,status:'Published',name:i===59?'Needle beyond first page':'Browse fixture '+i,description:'Emulator fixture',slug:'browse-fixture-'+i,sku:'BROWSE-'+i,categoryId:cid,pricePaise:1000+i,images:[{mediaId:imageId2,alt:'Fixture',url:'https://res.cloudinary.com/parinaya-emulator/image/upload/v1/fixture.jpg',width:100,height:200}],coverMediaId:imageId2,inventory:{mode:'simple',quantity:2},createdAt:new Date(100000+i),updatedAt:new Date()});}await batch.commit();
  for(const sort of ['featured','newest','price-asc','price-desc'])for(const category of [undefined,'search-category']){
   const options={browse:'1',sort,...(category?{category}:{})};let cursor:string|null=null;const ids:string[]=[];
   do {const result=await service.publicBrowse({...options,...(cursor?{cursor}:{})});ids.push(...result.items.map(item=>item.id));cursor=result.nextCursor;}while(cursor);
   assert.equal(ids.length,60,sort);assert.equal(new Set(ids).size,60,sort+' pagination must not skip or duplicate');
   const expected=Array.from({length:60},(_,i)=>'z'.repeat(18)+String(i).padStart(2,'0'));if(sort!=='price-asc')expected.reverse();assert.deepEqual(ids,expected);
   const combined=await service.publicBrowse({...options,q:'needle',maxPrice:'1059',inStock:'true'});assert.equal(combined.items.length,1);
   assert.equal((await service.publicBrowse({...options,maxPrice:'1000',q:'needle'})).items.length,0);
  }
  await assert.rejects(call({action:'reports:get',from:200,to:100}),{code:'invalid'});
  await assert.rejects(call({action:'reports:get',from:253402300800000}),{code:'invalid'});
  const report=await call({action:'reports:get'});assert.equal(report.orderValuePaise,0);assert.equal(report.byStatus.Placed.count,0);
  // Equal sort values and timestamps must still page deterministically by ID.
  const tieBatch=db.batch();for(let i=0;i<60;i++)tieBatch.update(db.doc('products/'+'z'.repeat(18)+String(i).padStart(2,'0')),{pricePaise:1000,createdAt:new Date(100000)});await tieBatch.commit();
  for(const sort of ['featured','newest','price-asc','price-desc']){
   const first=await service.publicBrowse({browse:'1',sort}),last=await service.publicBrowse({browse:'1',sort,cursor:first.nextCursor!});
   assert.deepEqual([...first.items,...last.items].map(item=>item.id),Array.from({length:60},(_,i)=>'z'.repeat(18)+String(59-i).padStart(2,'0')));
  }
  const restoreBatch=db.batch();for(let i=0;i<60;i++)restoreBatch.update(db.doc('products/'+'z'.repeat(18)+String(i).padStart(2,'0')),{pricePaise:1000+i,createdAt:new Date(100000+i)});await restoreBatch.commit();
  await db.doc('orders/emulatorIncompleteReport').set({status:'Placed',paymentStatus:'due',createdAt:new Date(500)});
  await assert.rejects(call({action:'reports:get'}),{code:'schema'});
  await db.doc('orders/emulatorIncompleteReport').delete();
  const browse=await service.publicBrowse({browse:'1',q:'needle'});assert.equal(browse.items.length,1);assert.equal(browse.items[0].name,'Needle beyond first page');const sorted=await service.publicBrowse({browse:'1',sort:'price-desc',category:'search-category'});assert.equal(sorted.items[0].pricePaise,1059);assert.equal(sorted.items.length,50);const next=await service.publicBrowse({browse:'1',sort:'price-desc',category:'search-category',cursor:sorted.nextCursor!});assert.equal(next.items.length,10);assert.equal(next.nextCursor,null);assert.equal((await service.publicBrowse({browse:'1',q:'needle',sale:'true'})).items.length,0);await db.doc('categories/'+cid).update({enabled:false});assert.equal((await service.publicBrowse({browse:'1',q:'needle'})).items.length,0);
  const xml=await service.sitemap();assert.equal(xml.includes('/account'),false);assert.equal(xml.includes('browse-fixture'),false,'Disabled category products must leave sitemap');
  await db.doc('adminAccess/owner').update({enabled:false});await assert.rejects(call(adjust),{code:'permission'});
 }finally{await env.clearFirestore();await env.cleanup();}
});
