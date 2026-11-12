import {FieldValue,type Firestore,type Transaction} from 'firebase-admin/firestore';
import {orderCategories,validateCategory,type CategoryInput} from '../src/categories/model.ts';
import {ProductError} from '../src/products/model.ts';
import {exact} from '../src/orders/model.ts';
import {loginImage,validateAppearance} from '../src/appearance/model.ts';
// Match the browser SDK's millisecond revision token; Admin Timestamp.toMillis truncates fractions.
export function categoryRevision(value:{seconds:number;nanoseconds:number}|undefined){return value?value.seconds*1000+value.nanoseconds/1e6:0;}
export function categoryService(db:Firestore,access:(tx:Transaction,uid:string)=>Promise<void>){return async(uid:string,body:Record<string,unknown>)=>{
 if(body.action==='categories:normalize'){
  exact(body,['action','expected']);if(!Array.isArray(body.expected)||body.expected.length>400||body.expected.some(c=>!c||typeof c.id!=='string'||!/^[A-Za-z0-9]{20}$/.test(c.id)||typeof c.updatedAt!=='number'||!Number.isFinite(c.updatedAt)||c.updatedAt<0))throw new ProductError('invalid','Category ordering supports at most 400 records.');
  await db.runTransaction(async tx=>{await access(tx,uid);const snapshot=await tx.get(db.collection('categories').limit(401));if(snapshot.size>400)throw new ProductError('unavailable','Category ordering requires owner review for this catalog size.');const expected=body.expected as {id:string;updatedAt:number}[];if(expected.length!==snapshot.size||new Set(expected.map(c=>c.id)).size!==snapshot.size||snapshot.docs.some(doc=>!expected.some(c=>c.id===doc.id&&c.updatedAt===categoryRevision(doc.data().updatedAt))))throw new ProductError('conflict','Categories changed. Reload before correcting ordering.');const rows=orderCategories(snapshot.docs.map(doc=>({...doc.data(),id:doc.id,createdAt:doc.data().createdAt?.toMillis?.()??0,updatedAt:categoryRevision(doc.data().updatedAt),displayOrder:doc.data().displayOrder??0})) as any);for(const [index,row]of rows.entries())tx.update(db.doc('categories/'+row.id),{displayOrder:index+1,updatedAt:FieldValue.serverTimestamp()});});return {saved:true};
 }
 exact(body,['action','id','expectedUpdatedAt','category']);if(typeof body.id!=='string'||!/^[A-Za-z0-9]{20}$/.test(body.id)||typeof body.expectedUpdatedAt!=='number'||!Number.isFinite(body.expectedUpdatedAt)||body.expectedUpdatedAt<0||body.expectedUpdatedAt>253402300799999)throw new ProductError('invalid','Invalid category revision.');
 let input:CategoryInput;try{const raw=body.category as CategoryInput;exact(raw as unknown as Record<string,unknown>,['name','slug','enabled','displayOrder'],['description','homepageImage']);input=validateCategory(raw);}catch{throw new ProductError('invalid','Check the category fields and verified image.');}
 const ref=db.doc('categories/'+body.id),slugRef=db.doc('categorySlugs/'+input.slug);
 await db.runTransaction(async tx=>{await access(tx,uid);if((await tx.get(db.doc('deletedRecords/categories_'+body.id))).exists)throw new ProductError('conflict','This category identity was permanently retired.');const [doc,slug]=await Promise.all([tx.get(ref),tx.get(slugRef)]),old=doc.data();
  if((!old||input.displayOrder!==(old.displayOrder??0))&&input.displayOrder<1)throw new ProductError('invalid','Display order must start at 1.');
  if(input.displayOrder>0&&(!old||input.displayOrder!==(old.displayOrder??0))){const duplicates=await tx.get(db.collection('categories').where('displayOrder','==',input.displayOrder).limit(2));if(duplicates.docs.some(d=>d.id!==body.id))throw new ProductError('conflict','This display order is already in use. Choose another number or use Save sequential order.');}
  if(old&&old.slug!==input.slug)throw new ProductError('invalid','The saved category link is permanent.');
  if(slug.exists&&slug.data()?.categoryId!==body.id)throw new ProductError('duplicate','That URL slug is already in use.');
  if(old&&!slug.exists)throw new ProductError('schema','Category link reservation needs owner review.');
  if(input.homepageImage){const image=input.homepageImage,asset=(await tx.get(db.doc('categoryMedia/'+image.mediaId))).data();const clean=validateAppearance({desktop:(({mediaId,alt,focalX,focalY})=>({mediaId,alt,focalX,focalY}))(image),mobile:null}).desktop!;
   if(!asset||asset.verified!==true||asset.purpose!=='category-home-image'||asset.categoryId!==body.id||asset.device!=='desktop')throw new ProductError('media','Verify this category image before saving.');
   input={...input,homepageImage:loginImage(clean,asset.metadata)};
  }
  // Exact retries are successful without rewriting timestamps or unrelated fields.
  if(old&&JSON.stringify(validateCategory({...old,displayOrder:old.displayOrder??0} as CategoryInput))===JSON.stringify(input))return;
  if(categoryRevision(old?.updatedAt)!==body.expectedUpdatedAt)throw new ProductError('conflict','This category changed. Reopen its latest version before saving.');
  const data={...input,updatedAt:FieldValue.serverTimestamp()};if(old)tx.update(ref,data);else{tx.create(ref,{...data,createdAt:FieldValue.serverTimestamp()});tx.create(slugRef,{categoryId:body.id,createdAt:FieldValue.serverTimestamp()});}
 });return {id:body.id};
};}
