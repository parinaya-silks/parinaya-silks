import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {blankAddress} from '../src/delivery/model.ts';
import {initialShipping} from '../src/shipping/model.ts';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||process.env.VERCEL)throw Error('Loopback fixtures only');
const app=initializeApp({projectId:'parinaya-silks'},'theme-offers-browser'),db=getFirestore(app),uid='test-customer',pid='h'.repeat(18)+'00';
try{
 if(process.argv[2]==='seed'){
  await db.doc('siteSettings/storefrontAppearance').delete();
  await db.doc('siteSettings/shipping').set({...initialShipping(),revision:1,schemaVersion:1});
  await db.doc('customerProfiles/'+uid).set({uid,displayName:'Local Customer',mobileNumber:'+919876543210',createdAt:new Date(),updatedAt:new Date()});
  for(const d of(await db.collection('customerShopping/'+uid+'/bag').get()).docs)await d.ref.delete();
  await db.doc('customerShopping/'+uid+'/bag/'+pid+'--simple').set({productId:pid,variantId:null,quantity:1});
  await db.doc('customerShopping/'+uid+'/addresses/'+'a'.repeat(32)).set({...blankAddress(),recipientName:'Local Customer',mobileNumber:'+919876543210',pinCode:'500034',line1:'Example road',locality:'Example',city:'Hyderabad',state:'Telangana',revision:1,createdAt:new Date(),updatedAt:new Date()});
  await db.doc('customerShopping/'+uid).set({defaultAddressId:'a'.repeat(32)},{merge:true});
  const c={kind:'percent',value:10,enabled:true,discoverable:true,minimumPaise:0,capPaise:10000,globalLimit:null,perCustomerLimit:null,startsAt:null,endsAt:null,revision:1,uses:0};
  for(const [code,extra]of Object.entries({PUBLIC10:{title:'Public savings',description:'A complete public offer description.\nValid on the current product subtotal.'},THIRD:{eligibleOrderNumber:3},PRIVATE10:{discoverable:false},DISABLED10:{enabled:false},EXPIRED10:{endsAt:1}}))await db.doc('coupons/'+code).set({...c,code,...extra});
  await db.doc('orders/theme-offers-first').set({uid,status:'Delivered',paymentStatus:'due'});
 }else if(process.argv[2]==='maroon'){await db.doc('siteSettings/storefrontAppearance').set({theme:'light-maroon',schemaVersion:1,revision:1});
 }else if(process.argv[2]==='second-delivered'){await db.doc('orders/theme-offers-second').set({uid,status:'Delivered',paymentStatus:'due'});
 }else if(process.argv[2]==='third-delivered'){await db.doc('orders/theme-offers-third').set({uid,status:'Delivered',paymentStatus:'due'});
 }else if(process.argv[2]==='cart-two'){await db.doc('customerShopping/'+uid+'/bag/'+pid+'--simple').update({quantity:2});
 }else if(process.argv[2]==='cart-one'){await db.doc('customerShopping/'+uid+'/bag/'+pid+'--simple').update({quantity:1});
 }else if(process.argv[2]==='minimum'){const c=(await db.doc('coupons/PUBLIC10').get()).data()!;await db.doc('coupons/CARTMIN').set({...c,code:'CARTMIN',minimumPaise:3000000});
 }else if(process.argv[2]==='disable'){await db.doc('coupons/PUBLIC10').update({enabled:false});
 }else if(process.argv[2]==='hide-all'){for(const doc of(await db.collection('coupons').get()).docs)await doc.ref.update({discoverable:false});
 }else if(process.argv[2]==='assert'){
  if((await db.doc('coupons/PUBLIC10').get()).get('uses')!==0)throw Error('Discovery/review must not redeem');
  if((await db.doc('siteSettings/shipping').get()).get('revision')!==1)throw Error('Theme must preserve shipping');
 }else if(process.argv[2]==='cleanup'){
  for(const name of ['coupons'])for(const d of(await db.collection(name).get()).docs)await db.recursiveDelete(d.ref);
  for(const id of ['first','second','third'])await db.doc('orders/theme-offers-'+id).delete();
 }else throw Error('Unknown command');
 console.log('Loopback theme/offer fixtures completed');
}finally{await db.terminate();await deleteApp(app);}
