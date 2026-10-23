import {initializeApp,deleteApp} from 'firebase-admin/app';import {getFirestore,FieldValue} from 'firebase-admin/firestore';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||process.env.VERCEL||process.env.NODE_ENV==='production')throw new Error('Loopback emulators only.');
const app=initializeApp({projectId:'parinaya-silks'},'orders-list-browser-fixtures'),db=getFirestore(app),uid='orders-list-browser-customer',id=(n:number)=>n.toString(16).padStart(32,'0');
try{switch(process.argv[2]){
 case 'seed':{
  const statuses=['Placed','Confirmed','Processing','Shipped','Delivered'];
  for(let i=0;i<25;i++)await db.doc('orders/'+id(5000+i)).set({schemaVersion:1,uid,email:'private-list@example.test',reference:'PS-'+id(5000+i).toUpperCase(),currency:'INR',status:statuses[i%5],paymentMethod:'COD',paymentStatus:i===19?'collected':'due',revision:1,address:{recipientName:i===24?'=List Customer':'Orders Customer '+i,mobileNumber:i===22?null:'+919876543210',line1:'Private fixture street',locality:'Fixture',city:'Hyderabad',state:'Telangana',pinCode:'500034'},items:[],subtotalPaise:'133305',shippingPaise:'0',discountPaise:'0',totalPaise:'133305',reportingPaise:133305,collectedPaise:i===19?133305:i===23?10000:0,refundPaise:0,history:[],refunds:[],request:null,collection:null,internalNotes:'Private list note',stockRestored:false,courier:'',trackingNumber:'',trackingUrl:'',createdAt:new Date(Date.parse('2026-09-11T00:00:00Z')+i*1000),updatedAt:new Date()});
  break;
 }
 case 'conflict':await db.doc('orders/'+id(5020)).update({revision:FieldValue.increment(1),updatedAt:new Date()});break;
 case 'assert-once':{const order=(await db.doc('orders/'+id(5020)).get()).data()!;if(order.history.filter((entry:{action:string})=>entry.action==='Processing').length!==1)throw new Error('Expected one processing audit after uncertain retry.');break;}
 case 'empty':case 'cleanup':for(const doc of (await db.collection('orders').where('uid','==',uid).get()).docs)await db.recursiveDelete(doc.ref);break;
 default:throw new Error('Unknown local fixture operation.');
}}finally{await db.terminate();await deleteApp(app);}
