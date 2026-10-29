import {initializeApp,deleteApp} from 'firebase-admin/app';import {getFirestore} from 'firebase-admin/firestore';
import {initialShipping} from '../src/shipping/model.ts';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||process.env.VERCEL||process.env.NODE_ENV==='production')throw Error('Loopback only');
const app=initializeApp({projectId:'parinaya-silks'},'shopping-design'),db=getFirestore(app),pid='s'.repeat(20),vid='v'.repeat(20),hidden='u'.repeat(20),sold='o'.repeat(20),uid='test-customer';
try{switch(process.argv[2]){
 case 'seed':{const base=(await db.doc('products/'+pid).get()).data();if(!base)throw Error('Base fixture missing');await db.doc('products/'+pid).update({name:'Kanjeevaram Pure Zari Crimson Bridal Saree',pricePaise:4800000,originalPricePaise:5800000});await db.doc('products/'+vid).update({name:'Royal Peacock Blue Handwoven Saree',pricePaise:6200000,inventory:{mode:'variants',variants:[{id:'wine',name:'Wine / Antique Gold Border',hex:'#780D24',sku:'WINE',quantity:3},{id:'blue',name:'Peacock Blue',hex:'#005566',sku:'BLUE',quantity:2},{id:'gold',name:'Gold',hex:'#B88A44',sku:'GOLD',quantity:0}]}});
 await db.doc('products/'+hidden).set({...base,name:'Private draft product',slug:'hidden-test-product',status:'Draft'});await db.doc('products/'+sold).set({...base,name:'Gold Tissue Katan Silk Brocade',slug:'sold-test-product',inventory:{mode:'simple',quantity:0},pricePaise:5800000});
 for(const productId of [pid,vid,hidden,sold])await db.doc(`customerShopping/${uid}/wishlist/${productId}`).set({productId,createdAt:new Date()});
 for(const [productId,variantId]of [[pid,null],[vid,'wine'],[hidden,null]] as const)await db.doc(`customerShopping/${uid}/bag/${productId}--${variantId?'v-'+variantId:'simple'}`).set({productId,variantId,quantity:1,createdAt:new Date()});
 await db.doc('customerProfiles/'+uid).set({uid,displayName:'Shopping Customer',mobileNumber:'+919876543210',createdAt:new Date(),updatedAt:new Date()});await db.doc('siteSettings/shipping').set({...initialShipping(),schemaVersion:1,revision:1});await db.doc('siteSettings/shippingRevision').set({revision:1});break;}
 case 'stock-zero':await db.doc('products/'+pid).update({'inventory.quantity':0});break;
 case 'colour-zero':{const data=(await db.doc('products/'+vid).get()).data()!;await db.doc('products/'+vid).update({inventory:{...data.inventory,variants:data.inventory.variants.map((variant:any)=>({...variant,quantity:variant.id==='wine'?0:variant.quantity}))}});break;}
 case 'colour-restore':{const data=(await db.doc('products/'+vid).get()).data()!;await db.doc('products/'+vid).update({inventory:{...data.inventory,variants:data.inventory.variants.map((variant:any)=>({...variant,quantity:variant.id==='wine'?3:variant.quantity}))}});break;}
 case 'stock-one':await db.doc('products/'+pid).update({'inventory.quantity':1});break;
 case 'restore-stock':await db.doc('products/'+pid).update({'inventory.quantity':5});break;
 case 'unavailable-only':for(const doc of(await db.collection(`customerShopping/${uid}/bag`).get()).docs)if(doc.data().productId!==hidden)await doc.ref.delete();break;
 case 'assert':{if((await db.collection('orders').count().get()).data().count!==0)throw Error('Shopping UI created order');if((await db.doc('products/'+pid).get()).data()?.inventory.quantity!==5)throw Error('Shopping UI changed stock');if((await db.doc('products/'+vid).get()).data()?.inventory.variants[0].quantity!==3)throw Error('Shopping changed variant stock');if((await db.doc('loyaltyAccounts/'+uid).get()).exists)throw Error('Shopping changed loyalty');break;}
 case 'cleanup':for(const path of ['products/'+hidden,'products/'+sold,'siteSettings/shipping','siteSettings/shippingRevision'])await db.recursiveDelete(db.doc(path));break;
 default:throw Error('Unknown fixture');}
 console.log('Local shopping design fixture complete.');
}finally{await db.terminate();await deleteApp(app);}
