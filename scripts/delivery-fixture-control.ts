import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw new Error('Loopback emulators required.');
const app=initializeApp({projectId:'parinaya-silks'},'delivery-browser-fixtures'),db=getFirestore(app),product=db.doc('products/'+'s'.repeat(20));
try{
  switch(process.argv[2]){
    case 'profile':await db.doc('customerProfiles/test-customer').set({uid:'test-customer',displayName:'Delivery Customer',mobileNumber:'+919876543210',createdAt:new Date(),updatedAt:new Date()});break;
    case 'price':await product.update({pricePaise:200005});break;
    case 'stock':await product.update({'inventory.quantity':1});break;
    case 'hide':await product.update({status:'Draft'});break;
    case 'touch-book':await db.doc('customerShopping/test-customer/preferences/delivery').update({revision:FieldValue.increment(1),updatedAt:new Date()});break;
    default:throw new Error('Unknown emulator fixture command.');
  }
  console.log('Delivery emulator fixture updated.');
}finally{await db.terminate();await deleteApp(app);}
