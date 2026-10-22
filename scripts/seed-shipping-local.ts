import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import {initialShipping} from '../src/shipping/model.ts';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||process.env.VERCEL||process.env.NODE_ENV==='production')throw new Error('Loopback emulators only. Production shipping is never seeded by this script.');
const app=initializeApp({projectId:'parinaya-silks'},'local-shipping-seed'),db=getFirestore(app);
try{const created=await db.runTransaction(async tx=>{const ref=db.doc('siteSettings/shipping');if((await tx.get(ref)).exists)return false;tx.create(ref,{...initialShipping(),schemaVersion:1,revision:1,updatedAt:FieldValue.serverTimestamp(),updatedBy:'local-emulator-seed'});tx.set(db.doc('siteSettings/shippingRevision'),{revision:1});return true;});console.log(JSON.stringify({project:'parinaya-silks',localEmulators:true,created}));}finally{await db.terminate();await deleteApp(app);}
