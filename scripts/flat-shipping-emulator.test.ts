import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {setLogLevel} from 'firebase/firestore';
import type {DecodedIdToken} from 'firebase-admin/auth';
import {serverFirebase} from '../server/firebase.ts';
import {catalogService} from '../server/catalog.ts';
import {emptyProduct} from '../src/products/model.ts';
import {blankAddress} from '../src/delivery/model.ts';
import {initialShipping,initialDistanceShipping} from '../src/shipping/model.ts';
import {disabledLoyalty} from '../src/loyalty/model.ts';

if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||process.env.VERCEL)throw Error('Loopback emulators only.');
process.env.PARINAYA_SERVER_EMULATORS='true';process.env.DISTANCE_DELIVERY_ENABLED='false';setLogLevel('silent');
test('disabled distance: no provider/quote dependency; flat COD, coupon, points, settings and historical safety',async()=>{
 const rules=await initializeTestEnvironment({projectId:'parinaya-silks',firestore:{host:'127.0.0.1',port:8080,rules:await readFile('firestore.rules','utf8')}}),db=serverFirebase().database,op=()=>randomUUID().replaceAll('-','');
 let routeCalls=0;
 const service=catalogService({database:db,routeCalculator:async()=>{routeCalls++;throw Error('Inactive route calculator was called');},auth:{verifyIdToken:async uid=>({uid,email:uid+'@example.test',aud:'parinaya-silks',admin:uid==='owner'}) as unknown as DecodedIdToken},media:{} as any});
 const call=(body:Record<string,unknown>,uid='customer')=>service.privileged(uid,body) as Promise<any>,pid='q'.repeat(20),cid='c'.repeat(20),aid='a'.repeat(32);
 const review=(extra:Record<string,unknown>={})=>call({action:'orders:review',addressId:aid,couponCode:'TEN',points:10,...extra});
 try{
  await rules.clearFirestore();await db.doc('adminAccess/owner').set({enabled:true});
  await db.doc('siteSettings/shipping').set({...initialShipping(),schemaVersion:1,revision:1});
  // Deliberately invalid dormant origin/slabs cannot affect flat checkout.
  await db.doc('siteSettings/dispatchLocation').set({active:false,latitude:'invalid',longitude:null});
  await db.doc('categories/'+cid).set({enabled:true,name:'Fixture'});
  await db.doc('products/'+pid).set({...emptyProduct(),schemaVersion:1,revision:1,status:'Published',name:'Flat fixture',description:'Local only',slug:'flat-fixture',sku:'FLAT',categoryId:cid,pricePaise:1000000,inventory:{mode:'simple',quantity:20},coverMediaId:'f'.repeat(32),images:[{mediaId:'f'.repeat(32),alt:'Fixture',url:'https://res.cloudinary.com/parinaya-emulator/image/upload/v1/fixture.jpg',width:300,height:400}],createdAt:new Date(),updatedAt:new Date()});
  await db.doc(`customerShopping/customer/addresses/${aid}`).set({...blankAddress(),recipientName:'Local Customer',mobileNumber:'+919876543210',pinCode:'500072',line1:'Flat 1',locality:'KPHB',city:'Hyderabad',state:'Telangana',revision:1,createdAt:new Date(),updatedAt:new Date()});
  await db.doc(`customerShopping/customer/bag/${pid}--simple`).set({productId:pid,variantId:null,quantity:1,createdAt:new Date(),updatedAt:new Date()});
  await db.doc('coupons/TEN').set({code:'TEN',kind:'percent',value:10,enabled:true,minimumPaise:0,startsAt:null,endsAt:null,capPaise:null,globalLimit:null,perCustomerLimit:null,uses:0,revision:1});
  await db.doc('siteSettings/loyalty').set({schemaVersion:1,revision:1,config:{...disabledLoyalty(),enabled:true,earnSpendPaise:10000,earnPoints:1,pointValuePaise:100,minRedeemPoints:1,maxPercent:50,allowCoupons:true}});
  await db.doc('loyaltyAccounts/customer').set({schemaVersion:1,revision:1,net:1000,reserved:0,pending:0});
  await db.doc('orders/historical').set({shippingPaise:'12000',calculationPolicy:'road-distance-post-coupon-before-points-v2',payment:{state:'CAPTURED'},history:[{action:'Delivered'}]});
  const history=(await db.doc('orders/historical').get()).data();
  let r=await review({deliveryQuoteId:'invalid-and-irrelevant'});
  assert.equal(r.shipping.state,'ready');assert.equal(r.shipping.method,'flat');assert.equal(r.shipping.shippingPaise,'9900');assert.equal(r.shipping.quoteId,undefined);assert.equal(r.address.coordinates,undefined);assert.equal(r.totalPaise,'908900');
  assert.equal((await review()).fingerprint,r.fingerprint,'Stale quote IDs cannot affect flat confirmation');
  await db.doc('products/'+pid).update({pricePaise:1000001});assert.equal((await review()).shipping.shippingPaise,'0','Strict pre-coupon subtotal enables free shipping even when coupon/points lower payable value');
  await db.doc('products/'+pid).update({pricePaise:1000000});r=await review();
  const body={action:'orders:place',addressId:aid,couponCode:'TEN',points:10,fingerprint:r.fingerprint,operationId:op(),deliveryQuoteId:{untrusted:'ignored'}};
  await assert.rejects(call({...body,shippingPaise:0}),{code:'invalid'});
  const order=(await call(body)).order;assert.equal(order.shippingPaise,'9900');assert.equal(order.totalPaise,'908900');assert.equal(order.calculationPolicy,'pre-coupon-strict-shipping-v1');assert.equal(order.deliverySnapshot,undefined);
  assert.equal((await call(body)).order.id,order.id);assert.equal((await db.doc('products/'+pid).get()).get('inventory.quantity'),19);assert.equal((await db.doc('coupons/TEN').get()).get('uses'),1);assert.equal((await db.doc('loyaltyAccounts/customer').get()).get('reserved'),10);
  const settings=await call({action:'settings:get'},'owner');assert.equal(settings.distanceDeliveryEnabled,false);
  await assert.rejects(call({action:'settings:save',shipping:initialDistanceShipping(),appearance:null,expectedShippingRevision:1,expectedAppearanceRevision:0,operationId:op()},'owner'),{code:'invalid'});
  assert.equal(routeCalls,0);assert.equal((await db.collection('deliveryQuotes').get()).size,0);assert.equal((await db.collection('deliveryQuoteLimits').get()).size,0);
  assert.deepEqual((await db.doc('orders/historical').get()).data(),history);
 }finally{await rules.cleanup();}
});
