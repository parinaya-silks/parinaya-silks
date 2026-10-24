import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore,Timestamp} from 'firebase-admin/firestore';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('Loopback emulators required');
const app=initializeApp({projectId:'parinaya-silks'},'inventory-browser-fixtures'),db=getFirestore(app,'(default)');
try{const productId=process.argv[2];if(!/^[A-Za-z0-9]{20}$/.test(productId||''))throw Error('Fixture ID required');const batch=db.batch();for(let i=0;i<26;i++)batch.set(db.doc('inventoryAudit/inventory_fixture_'+i),{productId,...(i%2===0?{orderId:'f'.repeat(32)}:{}),actor:'synthetic-fixture',reason:'Synthetic historical stock event',before:{mode:'simple',quantity:5},after:{mode:'simple',quantity:4},createdAt:Timestamp.fromMillis(1000+i)});await batch.commit();console.log('Loopback history fixtures prepared');}finally{await deleteApp(app);}
