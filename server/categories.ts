import {FieldValue,type Firestore,type Transaction} from 'firebase-admin/firestore';
import {validateCategory,type CategoryInput} from '../src/categories/model.ts';
import {ProductError} from '../src/products/model.ts';
import {exact} from '../src/orders/model.ts';
import {loginImage,validateAppearance} from '../src/appearance/model.ts';
export function categoryService(db:Firestore,access:(tx:Transaction,uid:string)=>Promise<void>){return async(uid:string,body:Record<string,unknown>)=>{
 exact(body,['action','id','expectedUpdatedAt','category']);if(typeof body.id!=='string'||!/^[A-Za-z0-9]{20}$/.test(body.id)||!Number.isSafeInteger(body.expectedUpdatedAt)||(body.expectedUpdatedAt as number)<0)throw new ProductError('invalid','Invalid category revision.');
 let input:CategoryInput;try{const raw=body.category as CategoryInput;exact(raw as unknown as Record<string,unknown>,['name','slug','enabled','displayOrder'],['description','homepageImage']);input=validateCategory(raw);}catch{throw new ProductError('invalid','Check the category fields and verified image.');}
 const ref=db.doc('categories/'+body.id),slugRef=db.doc('categorySlugs/'+input.slug);
 await db.runTransaction(async tx=>{await access(tx,uid);const [doc,slug]=await Promise.all([tx.get(ref),tx.get(slugRef)]),old=doc.data();
  if(old&&old.slug!==input.slug)throw new ProductError('invalid','The saved category link is permanent.');
  if(slug.exists&&slug.data()?.categoryId!==body.id)throw new ProductError('duplicate','That URL slug is already in use.');
  if(old&&!slug.exists)throw new ProductError('schema','Category link reservation needs owner review.');
  if(input.homepageImage){const image=input.homepageImage,asset=(await tx.get(db.doc('categoryMedia/'+image.mediaId))).data();const clean=validateAppearance({desktop:(({mediaId,alt,focalX,focalY})=>({mediaId,alt,focalX,focalY}))(image),mobile:null}).desktop!;
   if(!asset||asset.verified!==true||asset.purpose!=='category-home-image'||asset.categoryId!==body.id||asset.device!=='desktop')throw new ProductError('media','Verify this category image before saving.');
   input={...input,homepageImage:loginImage(clean,asset.metadata)};
  }
  // Exact retries are successful without rewriting timestamps or unrelated fields.
  if(old&&JSON.stringify(validateCategory(old as CategoryInput))===JSON.stringify(input))return;
  if((old?.updatedAt?.toMillis?.()||0)!==body.expectedUpdatedAt)throw new ProductError('conflict','This category changed. Reopen its latest version before saving.');
  const data={...input,updatedAt:FieldValue.serverTimestamp()};if(old)tx.update(ref,data);else{tx.create(ref,{...data,createdAt:FieldValue.serverTimestamp()});tx.create(slugRef,{categoryId:body.id,createdAt:FieldValue.serverTimestamp()});}
 });return {id:body.id};
};}
