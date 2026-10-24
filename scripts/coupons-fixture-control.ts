import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore,Timestamp,FieldValue} from 'firebase-admin/firestore';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('Loopback emulators required');
const app=initializeApp({projectId:'parinaya-silks'},'coupons-browser-fixtures'),db=getFirestore(app,'(default)');
try{switch(process.argv[2]){
 case 'seed':{await db.recursiveDelete(db.collection('coupons'));const now=Date.now(),batch=db.batch();for(let i=0;i<31;i++){const code='STITCH'+String(i).padStart(2,'0');batch.set(db.doc('coupons/'+code),{code,kind:i%2?'fixed':'percent',value:i%2?50000:10,minimumPaise:350000,capPaise:i%2?null:50000,startsAt:i%5===1?now+86400000:null,endsAt:i%5===2?now-1000:null,enabled:i%5!==3,globalLimit:i%5===4?50:null,perCustomerLimit:i===7?2:null,uses:i%5===4?50:12,revision:1,createdAt:Timestamp.fromMillis(now-i*1000),updatedAt:Timestamp.now(),legacyPrivate:'preserved'});}await batch.commit();break;}
 case 'conflict':await db.doc('coupons/BROWSER10').update({revision:FieldValue.increment(1),value:20,updatedAt:Timestamp.now()});break;
 case 'usage':await db.doc('coupons/BROWSER10').update({uses:44});break;
 case 'assert':{const c=(await db.doc('coupons/BROWSER10').get()).data();if(c?.uses!==44||c?.value!==15)throw Error('Settings overwrote uses or changed input');break;}
 default:throw Error('Unknown fixture action');
}console.log('Loopback coupon fixture action completed');}finally{await deleteApp(app);}
