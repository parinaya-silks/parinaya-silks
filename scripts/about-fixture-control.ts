import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore,FieldValue,Timestamp} from 'firebase-admin/firestore';
import {fallbackAbout} from '../src/about/model.ts';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('Loopback emulators required');
const app=initializeApp({projectId:'parinaya-silks'},'about-browser-fixture'),db=getFirestore(app,'(default)'),ref=db.doc('siteSettings/storeContent');
try{switch(process.argv[2]){
 case 'seed':await ref.update({revision:60,about:{...fallbackAbout(),heading:'Saved About Fixture',story:'Saved source story',privateNote:'PRIVATE'},aboutMeta:{updatedAt:Timestamp.now()}});break;
 case 'conflict':await ref.update({revision:FieldValue.increment(1),'about.heading':'Concurrent saved heading'});break;
 case 'assert':{const raw=(await ref.get()).data()!;if(raw.banners.length!==4||raw.textSections['footer-brand'].text!=='Saved brand copy'||raw.policies.shipping.text!=='Approved saved shipping fixture'||raw.featuredCategoryIds[0]!=='c'.repeat(20)||(await db.doc('siteSettings/returns').get()).data()?.revision!==1||raw.about.privateNote!=='PRIVATE')throw Error('Unrelated fields changed');break;}
 default:throw Error('Unknown fixture action');
}console.log('Loopback About fixture completed');}finally{await deleteApp(app);}
