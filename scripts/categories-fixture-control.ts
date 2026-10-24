import {createHash} from 'node:crypto';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore,Timestamp} from 'firebase-admin/firestore';
import {emptyProduct} from '../src/products/model.ts';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('Loopback emulators required');
const app=initializeApp({projectId:'parinaya-silks'},'category-design-fixtures'),db=getFirestore(app,'(default)');
try{
 const mode=process.argv[2];
 if(mode==='attach-products'){
  const category=(await db.collection('categories').where('slug','==','browser-alpha').limit(1).get()).docs[0];if(!category)throw Error('Synthetic category missing');
  for(const [id,status]of [['e'.repeat(20),'Published'],['f'.repeat(20),'Draft']]){
   const image={mediaId:'a'.repeat(32),alt:'Synthetic category saree',url:'https://res.cloudinary.com/parinaya-emulator/image/upload/v1/category-fixture.png',publicId:'category-fixture',assetId:'category-fixture',width:300,height:400,bytes:1000,format:'png',version:1};
   const input={...emptyProduct(),name:status+' category fixture saree',slug:status.toLowerCase()+'-category-fixture',sku:'PS-CATEGORY-'+status,categoryId:category.id,description:'Isolated local fixture',pricePaise:800000,inventory:{mode:'simple',quantity:4},images:[image],coverMediaId:image.mediaId,status,schemaVersion:1,revision:1,createdAt:Timestamp.now(),updatedAt:Timestamp.now()};
   await db.doc('products/'+id).set(input);await db.doc('productSlugs/'+input.slug).set({productId:id,createdAt:Timestamp.now()});
  }console.log('Synthetic linked products prepared');
 }else if(mode==='products-fingerprint'){
  const products=await db.collection('products').get();console.log(createHash('sha256').update(JSON.stringify(products.docs.map(d=>[d.id,d.data()]))).digest('hex'));
 }else if(mode==='conflict'){
  const category=(await db.collection('categories').where('slug','==','browser-alpha').limit(1).get()).docs[0];if(!category)throw Error('Synthetic category missing');await category.ref.update({description:'Concurrent saved description',updatedAt:Timestamp.now()});console.log('Synthetic concurrent category update prepared');
 }else throw Error('Unsupported fixture action');
}finally{await deleteApp(app);}
