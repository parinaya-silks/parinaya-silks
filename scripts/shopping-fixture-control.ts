import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {emptyProduct} from '../src/products/model.ts';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw new Error('Loopback emulators required.');
const app=initializeApp({projectId:'parinaya-silks'},'shopping-browser-fixtures');
const db=getFirestore(app),pid='s'.repeat(20),vid='v'.repeat(20),cid='q'.repeat(20);
try{
  switch(process.argv[2]){
    case 'seed':{
      await db.doc('categories/'+cid).set({name:'Shopping test silk',slug:'shopping-test',enabled:true,displayOrder:999,createdAt:new Date(),updatedAt:new Date()});
      const mediaId='f'.repeat(32),base={...emptyProduct(),schemaVersion:1,name:'Shopping Simple',slug:'shopping-simple',sku:'SHOP-SIMPLE',description:'Local shopping test only',categoryId:cid,pricePaise:123405,images:[{mediaId,alt:'Shopping saree',url:'https://res.cloudinary.com/parinaya-emulator/image/upload/v1/shopping.jpg',width:300,height:400}],coverMediaId:mediaId,status:'Published',inventory:{mode:'simple',quantity:5},createdAt:new Date(),updatedAt:new Date(),revision:1};
      await db.doc('products/'+pid).set(base);await db.doc('productSlugs/shopping-simple').set({productId:pid});
      await db.doc('products/'+vid).set({...base,name:'Shopping Colours',slug:'shopping-colours',sku:'SHOP-COLOURS',inventory:{mode:'variants',variants:[{id:'wine',name:'Wine',hex:'#780D24',sku:'SHOP-WINE',quantity:3},{id:'gold',name:'Gold',hex:'#B88A44',sku:'SHOP-GOLD',quantity:0}]}});await db.doc('productSlugs/shopping-colours').set({productId:vid});
      for(const uid of ['test-customer','legacy-customer'])await db.recursiveDelete(db.doc('customerShopping/'+uid));break;
    }
    case 'price-stock':await db.doc('products/'+pid).update({pricePaise:200005,'inventory.quantity':1});break;
    case 'hide':await db.doc('products/'+pid).update({status:'Draft'});break;
    case 'restore':await db.doc('products/'+pid).update({status:'Published','inventory.quantity':5});break;
    case 'cleanup':for(const path of ['products/'+pid,'products/'+vid,'categories/'+cid,'productSlugs/shopping-simple','productSlugs/shopping-colours','customerShopping/test-customer','customerShopping/legacy-customer'])await db.recursiveDelete(db.doc(path));break;
    default:throw new Error('Unknown fixture command.');
  }
  console.log('Shopping emulator fixture updated.');
}finally{await db.terminate();await deleteApp(app);}
