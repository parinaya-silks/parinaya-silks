import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore,Timestamp,FieldValue} from 'firebase-admin/firestore';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('Loopback emulators required');
const app=initializeApp({projectId:'parinaya-silks'},'website-text-fixtures'),db=getFirestore(app,'(default)'),ref=db.doc('siteSettings/storeContent');
try{switch(process.argv[2]){
 case 'seed':await ref.update({revision:20,updatedAt:Timestamp.now(),featuredCategoryIds:['c'.repeat(20)],privateSetting:{retained:true},textSections:{'home-featured':{heading:'Saved collection heading',supportingText:'Saved collection intro',description:'Saved collection description'},'footer-brand':{text:'Saved brand copy'}},policies:{shipping:{heading:'Saved Shipping Heading',text:'Approved saved shipping fixture',approved:true},returns:{text:'',approved:false},privacy:{text:'PRIVATE LEGACY POLICY',approved:false},terms:{text:'',approved:false}},textSectionMeta:{'home-featured':{updatedAt:Timestamp.now(),actor:'private-fixture-admin'}}});await db.doc('siteSettings/returns').set({enabled:false,approved:false,approvedText:'',allowedKinds:[],revision:1});break;
 case 'conflict':await ref.update({revision:FieldValue.increment(1),'contact.address':'Concurrent contact change','policies.shipping.text':'Concurrent saved policy text'});break;
 case 'assert':{const raw=(await ref.get()).data()!;if(raw.banners.length!==4||!raw.privateSetting.retained||raw.featuredCategoryIds[0]!=='c'.repeat(20)||(await db.doc('siteSettings/returns').get()).data()?.enabled!==false)throw Error('Shared content or operations changed');break;}
 default:throw Error('Unsupported fixture command');
}console.log('Loopback website-text fixture completed');}finally{await deleteApp(app);}
