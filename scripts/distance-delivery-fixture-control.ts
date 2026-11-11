import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {emptyProduct} from '../src/products/model.ts';
import {blankAddress} from '../src/delivery/model.ts';
import {initialDistanceShipping} from '../src/shipping/model.ts';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||process.env.VERCEL)throw Error('Loopback emulators required.');
const app=initializeApp({projectId:'parinaya-silks'},'distance-browser'),db=getFirestore(app),pid='z'.repeat(20),cid='y'.repeat(20),aid='b'.repeat(32),uid='test-customer';
try{
 if(process.argv[2]==='seed'){
  await db.doc('siteSettings/shipping').set({...initialDistanceShipping(),schemaVersion:2,revision:1});
  await db.doc('siteSettings/dispatchLocation').set({schemaVersion:1,revision:1,name:'Local dispatch',fullAddress:'Synthetic KPHB origin',latitude:17.4,longitude:78.4,mapsUrl:'',active:true});
  await db.doc('siteSettings/codAvailability').set({schemaVersion:1,revision:1,enabled:true});
  await db.doc('siteSettings/shippingRevision').set({revision:1});
  await db.doc('categories/'+cid).set({enabled:true,name:'Fixture'});
  await db.doc('products/'+pid).set({...emptyProduct(),schemaVersion:1,revision:1,status:'Published',name:'Local delivery fixture',description:'Browser fixture',slug:'local-delivery-fixture',sku:'LOCAL',categoryId:cid,pricePaise:500000,inventory:{mode:'simple',quantity:5},lowStockThreshold:0,coverMediaId:'f'.repeat(32),images:[{mediaId:'f'.repeat(32),alt:'Fixture',url:'https://res.cloudinary.com/parinaya-emulator/image/upload/v1/fixture.jpg',width:300,height:400}],createdAt:new Date(),updatedAt:new Date()});
  const bag=await db.collection(`customerShopping/${uid}/bag`).get();for(const item of bag.docs)await item.ref.delete();
  await db.doc(`customerShopping/${uid}/bag/${pid}--simple`).set({productId:pid,variantId:null,quantity:1,createdAt:new Date(),updatedAt:new Date()});
  const addresses=await db.collection(`customerShopping/${uid}/addresses`).get();for(const item of addresses.docs)await item.ref.delete();
  await db.doc(`customerShopping/${uid}/addresses/${aid}`).set({...blankAddress(),recipientName:'Local Customer',mobileNumber:'+919876543210',pinCode:'500072',line1:'Flat 1',locality:'KPHB',city:'Hyderabad',state:'Telangana',revision:1,createdAt:new Date(),updatedAt:new Date()});
  await db.doc(`customerShopping/${uid}/preferences/delivery`).set({defaultAddressId:aid,revision:1,updatedAt:new Date()});
 }else if(process.argv[2]==='cod-off'){
  await db.doc('siteSettings/codAvailability').update({enabled:false,revision:3});await db.doc('siteSettings/shippingRevision').update({revision:5});
 }else if(process.argv[2]==='assert-address'){
  const address=(await db.doc(`customerShopping/${uid}/addresses/${aid}`).get()).data();if(!address?.coordinates||address.coordinates.latitude!==17.5)throw Error('Selected coordinates not saved');
 }else throw Error('Unknown local fixture command.');
}finally{await deleteApp(app);}
