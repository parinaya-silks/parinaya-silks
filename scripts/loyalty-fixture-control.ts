// Trusted loopback fixtures only. No service-account credentials are read.
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {catalogService} from '../server/catalog.ts';
import {rebuildCustomerDirectory} from './customer-directory-rebuild.ts';
import type {DecodedIdToken} from 'firebase-admin/auth';
import {randomUUID} from 'node:crypto';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||process.env.VERCEL||process.env.NODE_ENV==='production')throw Error('Loopback emulators required');
const app=initializeApp({projectId:'parinaya-silks'},'loyalty-browser-fixture'),db=getFirestore(app),auth=getAuth(app),uid='test-customer',owner='test-approved-admin',op=()=>randomUUID().replaceAll('-','');
const service=catalogService({database:db,auth:{getUser:auth.getUser.bind(auth),verifyIdToken:async role=>({uid:role,email:role+'@example.test',aud:'parinaya-silks',admin:role===owner}) as unknown as DecodedIdToken},media:{sign:()=>({}),verify:async()=>{throw Error('Unused');}}}),call=(body:Record<string,unknown>,role=uid)=>service.privileged(role,body) as Promise<any>;
async function change(order:any,command:string,extra={}){return call({action:'adminOrders:update',id:order.id,expectedRevision:order.revision,operationId:op(),command,...extra},owner);}
async function complete(order:any){for(const status of ['Confirmed','Processing','Shipped','Delivered'])order=await change(order,status,status==='Shipped'?{courier:'Fixture courier',trackingNumber:'LOCAL'}:{});return change(order,'collect',{reference:op()});}
try{switch(process.argv[2]){
 case 'earn':{const source={kind:'buy-now',productId:'s'.repeat(20),variantId:null,quantity:1},q=await call({action:'orders:review',addressId:'d'.repeat(32),couponCode:null,source}),o=await call({action:'orders:place',addressId:'d'.repeat(32),couponCode:null,source,fingerprint:q.fingerprint,operationId:op()});await complete(o.order);await rebuildCustomerDirectory(db,auth);break;}
 case 'prepare-refund':{const found=await db.collection('orders').where('uid','==',uid).get();let order=found.docs.map(d=>({...d.data(),id:d.id})).find((o:any)=>o.loyalty?.redeemed===20) as any;if(!order)throw Error('Expected browser points order');order=await complete(order);await db.doc('siteSettings/returns').set({enabled:true,approved:true,approvedText:'Loopback policy',allowedKinds:['return']});order=await call({action:'orders:request',id:order.id,expectedRevision:order.revision,operationId:op(),command:'request-return',note:'Local test'});order=await change(order,'approve-request',{note:'Local test'});await change(order,'resolve-request',{note:'Local refund without restock'});break;}
 case 'assert':{const account=(await db.doc('loyaltyAccounts/'+uid).get()).data()!;if(account.reserved!==0||account.pending!==0)throw Error('Fixture points were not settled');const found=(await db.collection('orders').where('uid','==',uid).get()).docs.find(d=>d.data().loyalty?.redeemed===20)?.data();if(found?.loyalty.restored!==20||found?.loyalty.reversed!==found?.loyalty.earned)throw Error('Browser refund allocation failed');break;}
 case 'cleanup':await db.recursiveDelete(db.doc('loyaltyAccounts/'+uid));await db.doc('siteSettings/loyalty').delete();break;
 default:throw Error('Unknown loopback fixture command');
}console.log('Loopback loyalty fixture completed');}finally{await db.terminate();await deleteApp(app);}
