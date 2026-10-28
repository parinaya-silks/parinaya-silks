import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {disabledLoyalty} from '../src/loyalty/model.ts';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||process.env.VERCEL||process.env.NODE_ENV==='production')throw new Error('Loopback emulators only.');
const app=initializeApp({projectId:'parinaya-silks'},'customer-order-design'),db=getFirestore(app);
try {
 const docs=await db.collection('orders').where('uid','==','test-customer').get();if(docs.size!==1)throw Error('One isolated order required');const ref=docs.docs[0].ref,old=docs.docs[0].data(),command=process.argv[2];
 if(command==='decorate'){
  const item=old.items[0];await ref.update({reference:'PS-'+ref.id.toUpperCase()+'-LONG-SAVED-REFERENCE',items:[{...item,name:'Historical Crimson Silk Saree',variantName:'Crimson / Gold Border',imageUrl:'/assets/customer-auth-portrait.jpg'},{...item,productId:'v'.repeat(20),name:'Historical Teal Handwoven Saree',variantName:'Peacock Teal',imageUrl:'/assets/customer-auth-portrait.jpg'}],subtotalPaise:'246810',discountPaise:'1000',couponCode:'SAVED10',shippingPaise:'9900',totalPaise:'253710',loyalty:{version:1,config:disabledLoyalty(),configRevision:1,redeemed:20,discountPaise:'2000',basisPaise:'243810',expected:24,stage:'pending',earned:0,reversed:0,restored:0,refundedShippingPaise:'0',lines:[]}});
 } else if(command==='shipped')await ref.update({status:'Shipped',revision:old.revision+1,courier:'Local Fixture Courier',trackingNumber:'LOCAL-AWB-1',trackingUrl:'https://courier.example.test/track/LOCAL-AWB-1',estimatedDeliveryDate:'2026-11-10',history:[...old.history,{action:'Confirmed',at:Date.now()-30000,actor:'fixture',note:''},{action:'Processing',at:Date.now()-20000,actor:'fixture',note:''},{action:'Shipped',at:Date.now(),actor:'fixture',note:''}]});
 else if(command==='cancelled')await ref.update({status:'Cancelled',revision:old.revision+1,history:[...old.history,{action:'Cancelled',at:Date.now(),actor:'fixture',note:''}]});
 else if(command==='assert-reads'){
  if(old.status!=='Placed'||old.paymentStatus!=='due'||(await db.doc('products/'+'s'.repeat(20)).get()).data()?.inventory.quantity!==4||old.loyalty.stage!=='pending')throw Error('Read-only order view changed commerce state');
 }else if(command==='assert-request'){if(old.status!=='Placed'||old.request?.status!=='pending'||old.history.filter((event:{action:string})=>event.action==='request-cancellation').length!==1)throw Error('Request duplicated or cancelled order');}
 else if(command==='other-owned')await db.doc('orders/'+'b'.repeat(32)).set({...old,uid:'test-record-only',reference:'OTHER-PRIVATE-ORDER'});
 else if(command==='cleanup')await db.doc('orders/'+'b'.repeat(32)).delete();
 else throw Error('Unknown local fixture command');
 console.log('Local customer-order fixture: '+command+' passed.');
}finally{await db.terminate();await deleteApp(app);}
