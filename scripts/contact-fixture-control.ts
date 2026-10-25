import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore,FieldValue,Timestamp} from 'firebase-admin/firestore';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('Loopback emulators required');
const app=initializeApp({projectId:'parinaya-silks'},'contact-browser-fixture'),db=getFirestore(app,'(default)'),ref=db.doc('siteSettings/storeContent');
try{switch(process.argv[2]){
 case 'seed':await ref.update({revision:50,updatedAt:Timestamp.now(),contact:{mobile:'+442079460018',email:'legacy@example.test',address:'Legacy saved address',instagram:'https://instagram.com/legacy',privateNote:'PRIVATE CONTACT NOTE'}});break;
 case 'conflict':await ref.update({revision:FieldValue.increment(1),'contact.email':'concurrent@example.test'});break;
 case 'assert':{const raw=(await ref.get()).data()!;if(raw.banners.length!==4||raw.textSections['footer-brand'].text!=='Saved brand copy'||raw.policies.shipping.text!=='Approved saved shipping fixture'||raw.contact.privateNote!=='PRIVATE CONTACT NOTE'||raw.featuredCategoryIds[0]!=='c'.repeat(20)||(await db.doc('siteSettings/returns').get()).data()?.revision!==1)throw Error('Shared content or operations changed');break;}
 default:throw Error('Unknown fixture command');
}console.log('Loopback contact fixture completed');}finally{await deleteApp(app);}
