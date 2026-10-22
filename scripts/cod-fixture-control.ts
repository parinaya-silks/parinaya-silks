import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {blankAddress} from '../src/delivery/model.ts';
import {initialShipping} from '../src/shipping/model.ts';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||process.env.VERCEL||process.env.NODE_ENV==='production')throw new Error('Loopback emulators only.');
const app=initializeApp({projectId:'parinaya-silks'},'cod-browser-fixtures'),db=getFirestore(app),pid='s'.repeat(20),uid='test-customer',aid='d'.repeat(32);
try{
 if(process.argv[2]==='seed'){
  await db.doc('customerProfiles/'+uid).set({uid,displayName:'COD Customer',mobileNumber:'+919876543210',createdAt:new Date(),updatedAt:new Date()});
  await db.doc(`customerShopping/${uid}/addresses/${aid}`).set({...blankAddress(),recipientName:'COD Browser Customer',mobileNumber:'+919876543210',pinCode:'500034',line1:'12 Example Street',locality:'Example Locality',city:'Hyderabad',state:'Telangana',revision:1,createdAt:new Date(),updatedAt:new Date()});await db.doc(`customerShopping/${uid}/preferences/delivery`).set({defaultAddressId:aid,revision:1,updatedAt:new Date()});await db.doc(`customerShopping/${uid}/bag/${pid}--simple`).set({productId:pid,variantId:null,quantity:1,createdAt:new Date(),updatedAt:new Date()});await db.doc('siteSettings/shipping').set({...initialShipping(),schemaVersion:1,revision:1});await db.doc('siteSettings/shippingRevision').set({revision:1});
 }else if(process.argv[2]==='assert-single'){
  const orders=await db.collection('orders').where('uid','==',uid).get();if(orders.size!==1)throw new Error('Expected one COD order after retry.');if((await db.doc('products/'+pid).get()).data()?.inventory.quantity!==4)throw new Error('Stock was not deducted exactly once.');console.log('COD browser assertion passed: one order, one stock deduction.');
 }else if(process.argv[2]==='cleanup'){
  for(const doc of (await db.collection('orders').where('uid','==',uid).get()).docs)await db.recursiveDelete(doc.ref);for(const path of ['siteSettings/shipping','siteSettings/shippingRevision'])await db.doc(path).delete();
 }else throw new Error('Unknown fixture command.');
}finally{await db.terminate();await deleteApp(app);}
