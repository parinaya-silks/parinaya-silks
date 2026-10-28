// Synthetic checkout fixtures only. Never reads external credentials.
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {blankAddress} from '../src/delivery/model.ts';
import {disabledLoyalty,validateLoyalty} from '../src/loyalty/model.ts';
import {couponInput} from '../src/orders/model.ts';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||process.env.VERCEL||process.env.NODE_ENV==='production')throw Error('Loopback emulators required');
const app=initializeApp({projectId:'parinaya-silks'},'checkout-design-fixture'),db=getFirestore(app),uid='test-customer',id='e'.repeat(32);
try{
 switch(process.argv[2]){
  case 'seed':
   await db.doc(`customerShopping/${uid}/addresses/${id}`).set({...blankAddress(),label:'Work',recipientName:'Checkout Fixture Customer',mobileNumber:'+919876543210',pinCode:'500032',line1:'28 Local Test Road',locality:'Fixture Area',city:'Hyderabad',state:'Telangana',revision:1,createdAt:new Date(),updatedAt:new Date()});
   await db.doc(`customerShopping/${uid}/bag/${'v'.repeat(20)}--wine`).set({productId:'v'.repeat(20),variantId:'wine',quantity:2,createdAt:new Date(),updatedAt:new Date()});
   await db.doc('siteSettings/loyalty').set({schemaVersion:1,revision:1,config:validateLoyalty({enabled:true,earnSpendPaise:100000,earnPoints:10,pointValuePaise:100,minRedeemPoints:10,maxPercent:20,allowCoupons:true})});
   await db.doc('loyaltyAccounts/'+uid).set({schemaVersion:1,revision:1,net:200,pending:25,reserved:0});
   await db.doc('coupons/DESIGN10').set({...couponInput({code:'DESIGN10',kind:'percent',value:10,minimumPaise:0,capPaise:50000,globalLimit:null,perCustomerLimit:null,enabled:true,startsAt:null,endsAt:null}),revision:1,uses:0,createdAt:new Date(),updatedAt:new Date()});break;
  case 'disable-loyalty':await db.doc('siteSettings/loyalty').set({schemaVersion:1,revision:2,config:disabledLoyalty()});break;
  case 'price-change':await db.doc('products/'+'s'.repeat(20)).update({pricePaise:150005,revision:2});break;
  case 'stock-change':await db.doc('products/'+'s'.repeat(20)).update({'inventory.quantity':0,revision:3});break;
  case 'cleanup':for(const path of ['siteSettings/loyalty','loyaltyAccounts/'+uid,'coupons/DESIGN10',`customerShopping/${uid}/addresses/${id}`,`customerShopping/${uid}/bag/${'v'.repeat(20)}--wine`])await db.recursiveDelete(db.doc(path));break;
  default:throw Error('Unknown fixture action');
 }
 console.log('Checkout loopback fixture updated.');
}finally{await db.terminate();await deleteApp(app);}
