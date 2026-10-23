import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||process.env.VERCEL||process.env.NODE_ENV==='production')throw new Error('Loopback emulators only.');
const app=initializeApp({projectId:'parinaya-silks'},'delivery-panel-fixture'),db=getFirestore(app),id=(7001).toString(16).padStart(32,'0'),ref=db.doc('orders/'+id);
try{switch(process.argv[2]){
 case 'seed':await ref.set({uid:'test-customer',email:'customer@example.test',reference:'PS-'+id.toUpperCase(),status:'Processing',revision:1,paymentMethod:'COD',paymentStatus:'due',collectedPaise:0,refundPaise:0,reportingPaise:1250000,currency:'INR',totalPaise:'1250000',subtotalPaise:'1250000',discountPaise:'0',shippingPaise:'0',address:{recipientName:'Local Owner Fixture',mobileNumber:'+919840123456',line1:'Local fixture street',locality:'Local area',city:'Bengaluru',state:'Karnataka',pinCode:'560003',country:'India'},items:[],history:[],refunds:[],request:null,collection:null,stockRestored:false,internalNotes:'Local administrator note',courier:'Blue Dart Express',trackingNumber:'BLR-8923019-IN',trackingUrl:'https://courier.example.test/track/BLR-8923019-IN',estimatedDeliveryDate:'2020-01-01',createdAt:new Date(),updatedAt:new Date()});break;
 case 'background':await ref.update({revision:FieldValue.increment(1),internalNotes:'Background local note',updatedAt:new Date()});break;
 case 'assert-once':{const order=(await ref.get()).data()!;if(order.status!=='Shipped'||order.history.filter((event:{action:string})=>event.action==='Shipped').length!==1||order.paymentStatus!=='due'||order.collectedPaise!==0||order.stockRestored!==false)throw new Error('Delivery invariants failed');break;}
 case 'cleanup':await ref.delete();break;
 default:throw new Error('Unknown local fixture action');
}}finally{await db.terminate();await deleteApp(app);}
