import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {storedContact} from '../src/contact/model.ts';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('Loopback emulators required');
const app=initializeApp({projectId:'parinaya-silks'},'client-changes-fixture'),db=getFirestore(app,'(default)'),id=(n:number)=>'p'+String(n).padStart(19,'0');
try{
 if(process.argv[2]==='seed'){
  await db.doc('siteSettings/storeContent').update({contact:storedContact({email:'local@example.test',mobile:'+919876543210',instagram:'https://www.instagram.com/local_fixture/',facebook:'https://www.facebook.com/local_fixture/',whatsappEnabled:true,whatsappUseSupport:true})});
  await db.doc('products/'+id(6)).update({videoUrl:'https://www.youtube.com/watch?v=local-fixture',newArrival:true});
  await db.doc('products/'+id(2)).update({newArrival:true});
 }else if(process.argv[2]==='empty-social')await db.doc('siteSettings/storeContent').update({'contact.instagram':'','contact.facebook':''});
 else if(process.argv[2]==='assert'){
  const data=(await db.doc('products/'+id(2)).get()).data()!;
  assert.equal(data.videoUrl,'');assert.equal(data.inventory.mode,'variants');
  assert.deepEqual(data.inventory.variants.map((v:any)=>[v.id,v.sku,v.quantity,v.hex]),[['wine','WINE-2',2,'#AABBCC'],['gold','GOLD-2',3,'#B8860B']]);
  assert.deepEqual(data.legacyPrivateField,{preserved:true});assert.equal(data.blouseDetails,'Retained legacy detail');
  const simple=(await db.doc('products/'+id(6)).get()).data()!;assert.equal(simple.colorHex,'');assert.equal(simple.inventory.quantity,18);
 }else throw Error('Unknown fixture mode');
 console.log('Client changes loopback fixture passed');
}finally{await db.terminate();await deleteApp(app);}
