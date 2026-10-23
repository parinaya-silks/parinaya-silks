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
 }else if(process.argv[2]==='seed-buy-now'){
  await db.doc(`customerShopping/${uid}/bag/${'v'.repeat(20)}--wine`).set({productId:'v'.repeat(20),variantId:'wine',quantity:1,createdAt:new Date(),updatedAt:new Date()});
 }else if(process.argv[2]==='assert-buy-now'){
  const orders=await db.collection('orders').where('uid','==',uid).get();if(orders.size!==1)throw new Error('Expected one Buy Now order.');
  const order=orders.docs[0].data();if(order.items.length!==1||order.items[0].productId!=='v'.repeat(20)||order.items[0].quantity!==2||order.items[0].variantId!=='wine')throw new Error('Buy Now source was not preserved.');
  if(order.totalPaise!=='256710'||order.paymentStatus!=='due')throw new Error('Buy Now COD total or payment state is incorrect.');
  const stock=(await db.doc('products/'+'v'.repeat(20)).get()).data()?.inventory.variants;if(stock?.find((item:{id:string})=>item.id==='wine')?.quantity!==1)throw new Error('Buy Now variant stock was not deducted exactly once.');
  const bag=await db.collection(`customerShopping/${uid}/bag`).get();if(bag.size!==2||bag.docs.some(doc=>doc.data().quantity!==1))throw new Error('Buy Now changed the saved Bag.');
  if((await db.doc('products/'+pid).get()).data()?.inventory.quantity!==5)throw new Error('Buy Now deducted unrelated stock.');
 }else if(process.argv[2]==='assert-single'){
  const orders=await db.collection('orders').where('uid','==',uid).get();if(orders.size!==1)throw new Error('Expected one COD order after retry.');if((await db.doc('products/'+pid).get()).data()?.inventory.quantity!==4)throw new Error('Stock was not deducted exactly once.');console.log('COD browser assertion passed: one order, one stock deduction.');
 }else if(process.argv[2]==='cleanup'){
  for(const doc of (await db.collection('orders').where('uid','==',uid).get()).docs)await db.recursiveDelete(doc.ref);for(const path of ['siteSettings/shipping','siteSettings/shippingRevision'])await db.doc(path).delete();
 }else throw new Error('Unknown fixture command.');
}finally{await db.terminate();await deleteApp(app);}
