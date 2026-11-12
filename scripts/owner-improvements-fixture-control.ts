import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {blankContent} from '../src/content/model.ts';
import {productId} from './discovery-fixtures.ts';
import {storedContact} from '../src/contact/model.ts';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||process.env.VERCEL)throw Error('Loopback emulators required.');
const app=initializeApp({projectId:'parinaya-silks'},'owner-browser-control'),db=getFirestore(app);
try{const action=process.argv[2];if(action==='seed'){
 await db.doc('siteSettings/maintenance').set({schemaVersion:1,enabled:false,revision:1});await db.doc('siteSettings/storefrontAppearance').set({schemaVersion:1,revision:1,theme:'classic-cream'});
 const image={url:'https://res.cloudinary.com/parinaya-emulator/image/upload/banner.jpg',alt:'Synthetic banner',focalX:50,focalY:50,width:1600,height:600,mediaId:'a'.repeat(32)};
 await db.doc('siteSettings/storeContent').set({...blankContent(),schemaVersion:1,revision:1,contact:storedContact({email:'support@example.test',instagram:'https://instagram.com/store'}),banners:[{id:'a'.repeat(32),title:'First local banner',link:'/shop',enabled:true,images:{desktop:image,mobile:image,revision:1},showButton:true,buttonLabel:'Explore'},{id:'b'.repeat(32),title:'Second local banner',link:'/collections/cotton-sarees',enabled:true,images:{desktop:image,mobile:image,revision:1},showButton:true,buttonLabel:'Explore'}]});
 await db.doc('siteSettings/loginAppearance').set({schemaVersion:1,revision:1,desktop:null,mobile:null});
 await db.doc('inventoryAudit/browser-local').set({productId:productId(2),source:'manual',actor:'test-approved-admin',reason:'Browser stock evidence',variantId:null,before:{mode:'simple',quantity:3},after:{mode:'simple',quantity:4},createdAt:new Date()});
 }else if(action==='on'||action==='off')await db.doc('siteSettings/maintenance').set({schemaVersion:1,revision:2,enabled:action==='on'});else throw Error('Unknown command');}finally{await deleteApp(app);}
