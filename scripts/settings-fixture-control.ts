import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore,FieldValue,Timestamp} from 'firebase-admin/firestore';
import {initialShipping} from '../src/shipping/model.ts';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('Loopback emulators required');
const app=initializeApp({projectId:'parinaya-silks'},'settings-browser-fixture'),db=getFirestore(app,'(default)');
try{switch(process.argv[2]){
 case 'seed':await db.doc('siteSettings/shipping').set({...initialShipping(),flatFeePaise:25000,freeThresholdPaise:500000,schemaVersion:1,revision:1,privateFixture:'KEEP',updatedAt:Timestamp.now()});await db.doc('siteSettings/shippingRevision').set({revision:1});await db.doc('siteSettings/loginAppearance').set({schemaVersion:1,revision:1,desktop:null,mobile:null,privateFixture:'KEEP',updatedAt:Timestamp.now()});await db.doc('siteSettings/storeContent').set({contact:{email:'unchanged@example.test'},about:{founderName:'KEEP'},banners:[],policies:{keep:true},privateFixture:'KEEP'});break;
 case 'conflict':await db.doc('siteSettings/shipping').update({revision:FieldValue.increment(1),flatFeePaise:32100});break;
 case 'assert':{for(const id of ['shipping','loginAppearance','storeContent'])if((await db.doc('siteSettings/'+id).get()).data()?.privateFixture!=='KEEP')throw Error('Unrelated field changed');break;}
 case 'cleanup':await db.doc('siteSettings/loginAppearance').set({schemaVersion:1,revision:1,desktop:null,mobile:null});break;
 default:throw Error('Unknown fixture action');
}console.log('Loopback settings fixture completed');}finally{await deleteApp(app);}
