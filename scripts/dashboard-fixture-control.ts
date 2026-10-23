import {initializeApp,deleteApp} from 'firebase-admin/app';import {getFirestore,FieldValue} from 'firebase-admin/firestore';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||process.env.VERCEL||process.env.NODE_ENV==='production')throw new Error('Loopback emulators only.');
const app=initializeApp({projectId:'parinaya-silks'},'dashboard-browser-fixtures'),db=getFirestore(app),uid='dashboard-browser-customer',id=(n:number)=>n.toString(16).padStart(32,'0');
try{switch(process.argv[2]){
 case 'seed':{
  const statuses=['Placed','Placed','Confirmed','Processing','Shipped','Delivered','Delivered','Cancelled'];
  for(let i=0;i<statuses.length;i++)await db.doc('orders/'+id(2001+i)).set({schemaVersion:1,uid,email:'fixture-private@example.test',reference:'PS-'+id(2001+i).toUpperCase(),currency:'INR',status:statuses[i],paymentMethod:'COD',paymentStatus:i===6?'collected':'due',revision:1,address:{recipientName:'Dashboard Fixture '+(i+1),mobileNumber:i===1?null:'+919876543210',line1:'Local Fixture Street',locality:'Fixture Area',city:'Hyderabad',state:'Telangana',pinCode:'500034'},items:[{productId:'s'.repeat(20),variantId:null,quantity:1,name:'Shopping Simple',slug:'shopping-simple',variantName:'',sku:'SHOP-SIMPLE',unitPaise:123405,linePaise:'123405',imageUrl:''}],subtotalPaise:'123405',shippingPaise:'9900',discountPaise:'0',totalPaise:'133305',reportingPaise:133305,collectedPaise:i===6?133305:0,refundPaise:0,history:[],refunds:[],request:null,collection:null,internalNotes:'Private emulator note',stockRestored:false,courier:'',trackingNumber:'',trackingUrl:'',createdAt:new Date(Date.now()-i*1000),updatedAt:new Date()});
  await db.doc('products/'+'s'.repeat(20)).update({'inventory.quantity':1});await db.doc('products/'+'v'.repeat(20)).update({inventory:{mode:'variants',variants:[{id:'wine',name:'Wine',hex:'#780D24',sku:'SHOP-WINE',quantity:1},{id:'gold',name:'Gold',hex:'#B88A44',sku:'SHOP-GOLD',quantity:0}]}});
  await db.doc('adminNotifications/dashboard_browser_seed').set({kind:'order',target:'/admin/orders/'+id(2001),label:'Dashboard fixture order received',createdAt:new Date()});break;
 }
 case 'conflict':await db.doc('orders/'+id(2002)).update({revision:FieldValue.increment(1),updatedAt:new Date()});break;
 case 'add-new':{const base=(await db.doc('orders/'+id(2002)).get()).data()!;await db.doc('orders/'+id(2009)).set({...base,reference:'PS-'+id(2009).toUpperCase(),status:'Placed',revision:1,history:[],createdAt:new Date(),updatedAt:new Date()});break;}
 case 'assert-once':{const order=(await db.doc('orders/'+id(2001)).get()).data()!;if(order.history.filter((entry:{action:string})=>entry.action==='Processing').length!==1)throw new Error('Expected one processing audit after uncertain retry.');break;}
 case 'empty':case 'cleanup':for(const doc of (await db.collection('orders').where('uid','==',uid).get()).docs)await db.recursiveDelete(doc.ref);await db.doc('adminNotifications/dashboard_browser_seed').delete();break;
 default:throw new Error('Unknown local fixture operation.');
}}finally{await db.terminate();await deleteApp(app);}
