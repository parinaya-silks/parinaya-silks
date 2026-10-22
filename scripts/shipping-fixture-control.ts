import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw new Error('Loopback emulators required.');
const app=initializeApp({projectId:'parinaya-silks'},'shipping-browser-fixtures'),db=getFirestore(app),product=db.doc('products/'+'s'.repeat(20));
try{switch(process.argv[2]){
  case 'reset':await db.doc('siteSettings/shipping').delete();await db.doc('siteSettings/shippingRevision').delete();break;
  case 'below':await product.update({pricePaise:999900});break;
  case 'at':await product.update({pricePaise:1000000});break;
  case 'above':await product.update({pricePaise:1000001});break;
  case 'blocked':await product.update({'inventory.quantity':0});break;
  case 'restore':await product.update({'inventory.quantity':5});break;
  case 'invalid':await db.runTransaction(async tx=>{const ref=db.doc('siteSettings/shipping'),old=await tx.get(ref),revision=old.data()!.revision+1;tx.update(ref,{flatFeePaise:'invalid',revision});tx.set(db.doc('siteSettings/shippingRevision'),{revision});});break;
  default:throw new Error('Unknown fixture operation.');
}console.log('Shipping emulator fixture updated.');}finally{await db.terminate();await deleteApp(app);}
