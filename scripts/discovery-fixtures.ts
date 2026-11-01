import {Timestamp,type Firestore} from 'firebase-admin/firestore';
import {emptyProduct} from '../src/products/model.ts';
import {blankContent} from '../src/content/model.ts';
import {blankCampaign} from '../src/campaigns/model.ts';
export const categoryId=(n:number)=>'c'+String(n).padStart(19,'0');
export const productId=(n:number)=>'p'+String(n).padStart(19,'0');
export async function seedDiscovery(db:Firestore){
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080')throw Error('Local emulator required');
 const batch=db.batch(),stamp=Timestamp.fromMillis(1700000000000),mediaId='a'.repeat(32),image={mediaId,alt:'Isolated saree fixture',url:'https://res.cloudinary.com/parinaya-emulator/image/upload/fixture.jpg',assetId:'fixture',publicId:'fixture',width:300,height:400,bytes:1000,format:'jpg',version:1};
 for(let i=0;i<22;i++){const c={name:i===0?'Cotton Sarees':i===1?'Silk Sarees':i===2?'Empty Collection':i===21?'Hidden Collection':'Collection '+i,slug:i===0?'cotton-sarees':i===1?'silk-sarees':i===2?'empty-collection':'collection-'+i,description:'Isolated local collection',enabled:i!==21,displayOrder:i,createdAt:stamp,updatedAt:stamp};batch.set(db.doc('categories/'+categoryId(i)),c);batch.set(db.doc('categorySlugs/'+c.slug),{categoryId:categoryId(i)});}
 for(let i=0;i<235;i++){const p={...emptyProduct(),id:undefined,name:(i<210?'Red':'Blue')+' Local Saree '+i,slug:'local-saree-'+i,sku:'LOCAL-'+i,description:'Isolated cotton weave',categoryId:categoryId(i%2),pricePaise:100001+Math.floor(i/3)*10000,originalPricePaise:i%2?null:1000001,inventory:{mode:'simple',quantity:i%5?4:0},colorName:i<210?'Red':'Blue',colorHex:i<210?'#ff0000':'#0000ff',fabric:'Cotton',weaveType:'Handloom',images:[image],coverMediaId:mediaId,status:'Published',featured:i%2===0,newArrival:true,schemaVersion:1,revision:1,createdAt:Timestamp.fromMillis(stamp.toMillis()+Math.floor(i/3)),updatedAt:stamp};delete p.id;batch.set(db.doc('products/'+productId(i)),p);}
 for(const [i,status,c] of [[240,'Draft',0],[241,'Archived',0],[242,'Published',21]] as const)batch.set(db.doc('products/'+productId(i)),{...emptyProduct(),name:'Private fixture',slug:'private-'+i,sku:'PRIVATE-'+i,description:'Private',categoryId:categoryId(c),images:[image],coverMediaId:mediaId,pricePaise:100000,status,schemaVersion:1,revision:1,createdAt:stamp,updatedAt:stamp});
 batch.set(db.doc('siteSettings/storeContent'),{...blankContent(),contact:{email:'',mobile:'',address:'',instagram:''}});
 batch.set(db.doc('campaigns/'+'c'.repeat(32)),{...blankCampaign(),name:'Local Campaign',slug:'local-campaign',intent:'published',productIds:Array.from({length:80},(_,i)=>productId(i)),banners:{desktop:null,mobile:null},schemaVersion:1,revision:1,createdAt:stamp,updatedAt:stamp,createdBy:'fixture',updatedBy:'fixture'});batch.set(db.doc('campaignSlugs/local-campaign'),{campaignId:'c'.repeat(32)});
 await batch.commit();
 return {image,stamp};
}
