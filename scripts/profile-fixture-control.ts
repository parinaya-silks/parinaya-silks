import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {blankAddress} from '../src/delivery/model.ts';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||process.env.VERCEL||process.env.NODE_ENV==='production')throw Error('Local emulators only');
const app=initializeApp({projectId:'parinaya-silks'},'profile-fixtures'),db=getFirestore(app),uid='test-customer',root='customerShopping/'+uid;
const address={...blankAddress(),recipientName:'Local Customer',mobileNumber:'+919876543210',pinCode:'500034',line1:'12 Example Street',locality:'Example Locality',city:'Hyderabad',state:'Telangana',revision:1,createdAt:new Date(),updatedAt:new Date()};
try{switch(process.argv[2]){
 case 'seed':
  await db.recursiveDelete(db.doc(root));await db.recursiveDelete(db.doc('loyaltyAccounts/'+uid));
  await db.doc('customerProfiles/'+uid).set({uid,displayName:'Ananya Rao',mobileNumber:'+919876543210',unrelated:'preserved',createdAt:new Date(),updatedAt:new Date()});
  for(let i=1;i<=2;i++)await db.doc(root+'/addresses/'+String(i).repeat(32)).set({...address,label:i===1?'Home':'Work'});
  await db.doc(root+'/preferences/delivery').set({defaultAddressId:'1'.repeat(32),revision:1});await db.doc('orders/profile-history-fixture').set({address:{...address,recipientName:'Historical Recipient'}});
  await db.doc('siteSettings/loyalty').set({schemaVersion:1,revision:1,config:{enabled:true,earnSpendPaise:10000,earnPoints:1,pointValuePaise:100,minRedeemPoints:10,maxPercent:20,allowCoupons:true}});
  await db.doc('loyaltyAccounts/'+uid).set({schemaVersion:1,revision:1,net:4000,reserved:20,pending:950});
  for(let i=0;i<22;i++)await db.doc('loyaltyAccounts/'+uid+'/ledger/fixture_'+i).set({kind:'Earned',points:100,reservedDelta:0,pendingDelta:0,reason:'Local fixture earning',orderId:'a'.repeat(32),reference:'PS-LOCAL-'+i,createdAt:new Date(Date.now()-i*1000)});break;
 case 'remote-profile':await db.doc('customerProfiles/'+uid).update({displayName:'Remote Name'});break;
 case 'legacy':for(const i of [4,5])await db.doc(root+'/addresses/'+String(i).repeat(32)).set({...address,label:'Legacy '+i});break;
 case 'disable':await db.doc('siteSettings/loyalty').update({'config.enabled':false});break;
 case 'empty-disabled':await db.recursiveDelete(db.doc('loyaltyAccounts/'+uid));break;
 case 'zero-enabled':await db.doc('siteSettings/loyalty').update({'config.enabled':true});await db.doc('loyaltyAccounts/'+uid).set({schemaVersion:1,revision:1,net:0,pending:0,reserved:0});break;
 case 'missing-phone':await db.doc('customerProfiles/'+uid).set({uid,displayName:'Legacy Customer',createdAt:new Date(),updatedAt:new Date()});break;
 case 'assert':if((await db.doc('customerProfiles/'+uid).get()).data()?.unrelated!=='preserved'||(await db.doc('orders/profile-history-fixture').get()).data()?.address.recipientName!=='Historical Recipient'||(await db.doc('loyaltyAccounts/'+uid).get()).data()?.net!==4000)throw Error('Unrelated source snapshot/balance changed');break;
 case 'cleanup':for(const path of [root,'loyaltyAccounts/'+uid,'siteSettings/loyalty','orders/profile-history-fixture'])await db.recursiveDelete(db.doc(path));break;
 default:throw Error('Unknown fixture command');
}console.log('Local profile fixture '+process.argv[2]+' passed.');}finally{await db.terminate();await deleteApp(app);}
