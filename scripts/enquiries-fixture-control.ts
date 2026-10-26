import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore,Timestamp,FieldValue} from 'firebase-admin/firestore';
import {blankContent} from '../src/content/model.ts';
import {enquiryPrefixes} from '../server/enquiries.ts';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('Loopback emulators required');
const app=initializeApp({projectId:'parinaya-silks'},'enquiry-browser-fixture'),db=getFirestore(app,'(default)');
try{switch(process.argv[2]){
 case 'seed':{await db.doc('siteSettings/storeContent').set({...blankContent(),schemaVersion:1,privateFixture:'KEEP',contact:{mobile:'+919876543210',email:'support@example.test',address:'Saved business address',instagram:'',showAddress:true,showHours:true,hours:'Saved support hours',whatsappEnabled:false}});for(let i=0;i<25;i++){const name=i===24?'Oldest Searchmatch':'Directory Fixture '+i,email='directory'+i+'@example.test',id=(i+1).toString(16).padStart(32,'0');await db.doc('enquiries/'+id).set({schemaVersion:1,name,email,phone:'',message:'Fixture message '+i,searchPrefixes:enquiryPrefixes(name,email,''),status:i%2?'Read':'New',createdAt:Timestamp.fromMillis(Date.now()-100000-i*1000),revision:1});}break;}
 case 'assert-new':case 'conflict':case 'assert-submitted':{const docs=await db.collection('enquiries').where('email','==','visitor+fixture@example.test').get();if(docs.size!==1)throw Error('Submission count mismatch');const d=docs.docs[0];if(process.argv[2]==='assert-new'&&d.get('status')!=='New')throw Error('Details changed status');if(process.argv[2]==='conflict')await d.ref.update({status:'Read',revision:FieldValue.increment(1)});if(d.get('phone')!=='+442079460018'||!d.get('message').includes('\n\n'))throw Error('Submitted values changed');break;}
 case 'assert-deleted':{if(!(await db.collection('enquiries').where('email','==','visitor+fixture@example.test').get()).empty)throw Error('Selected enquiry not deleted');if(!(await db.doc('enquiries/'+(1).toString(16).padStart(32,'0')).get()).exists)throw Error('Unrelated enquiry deleted');if((await db.doc('siteSettings/storeContent').get()).get('privateFixture')!=='KEEP')throw Error('Business settings changed');break;}
 default:throw Error('Unknown fixture command');
}console.log('Loopback enquiry fixture completed');}finally{await deleteApp(app);}
