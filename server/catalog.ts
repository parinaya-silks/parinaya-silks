import { createHash } from 'node:crypto';
import { FieldPath, FieldValue, type Firestore, type Transaction } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import { MAX_IMAGE_BYTES, ProductError, productFields, validateProduct, type ProductRecord, type ProductImage } from '../src/products/model.ts';
import type { CloudinaryMedia, UploadTicket } from './cloudinary.ts';
import { CatalogConfigurationError } from './errors.ts';
import {loginAppearanceService} from './loginAppearance.ts';
import {publicProduct} from './publicProduct.ts';
import {shoppingService} from './shopping.ts';
import {deliveryService} from './delivery.ts';
import {newlyLowStock} from '../src/orders/model.ts';
import {sitemap} from './seo.ts';
import {browseService} from './browse.ts';
import {contentService} from './content.ts';
import {businessService} from './business.ts';
import {customerUid} from '../src/admin/customers/model.ts';
import {customerDirectoryService} from './customerDirectory.ts';
import {ordersService} from './orders.ts';
import {shippingService} from './shipping.ts';

type Dependencies={database:Firestore;auth:Pick<Auth,'verifyIdToken'>&Partial<Pick<Auth,'getUser'>>;media:CloudinaryMedia};
const idPattern=/^[A-Za-z0-9]{20}$/;
function id(value:unknown):string {if(typeof value!=='string'||!idPattern.test(value)) throw new ProductError('invalid','Invalid product ID.');return value;}
function keys(value:Record<string,unknown>,allowed:string[]) {if(Object.keys(value).some(key=>!allowed.includes(key))) throw new ProductError('invalid','Unsupported request fields.');}
function mediaId(value:unknown):string {if(typeof value!=='string'||!/^[a-f0-9]{32}$/.test(value))throw new ProductError('invalid','Invalid media ID.');return value;}

export function catalogService({database:db,auth,media}:Dependencies) {
  async function authenticate(token:string) {
    let user;
    try { user=await auth.verifyIdToken(token,true); } catch(error) {
      const code=typeof error==='object' && error!==null && 'code' in error ? error.code : '';
      if(['auth/argument-error','auth/invalid-argument','auth/invalid-id-token','auth/id-token-expired','auth/id-token-revoked','auth/user-disabled','auth/user-not-found'].includes(code as string)) throw new ProductError('unauthorized','Sign in again to continue.');
      if(['app/invalid-credential','auth/invalid-credential','auth/insufficient-permission'].includes(code as string)) throw new CatalogConfigurationError('Firebase token verification is not configured.', 'firebase-auth-configuration', {cause:error});
      throw error;
    }
    if(user.aud!=='parinaya-silks')throw new ProductError('unauthorized','Sign in again to continue.');
    return user;
  }
  async function administrator(token:string) {
    const user=await authenticate(token);
    if(user.admin!==true || (await db.doc(`adminAccess/${user.uid}`).get()).data()?.enabled!==true) throw new ProductError('permission','Active administrator permission is required.');
    return user.uid;
  }
  async function transactionAccess(transaction:Transaction,uid:string) {if((await transaction.get(db.doc(`adminAccess/${uid}`))).data()?.enabled!==true)throw new ProductError('permission','Active administrator permission is required.');}
  const content=contentService(db,transactionAccess,async(doc,name)=>publicProduct(await present(doc,name)));
  const homeMedia=loginAppearanceService(db,media,transactionAccess,'home');
  const business=businessService(db,transactionAccess);
  const customers=customerDirectoryService(db,auth);
  const shipping=shippingService(db,transactionAccess);
  const appearance=loginAppearanceService(db,media,transactionAccess);
  async function present(document:FirebaseFirestore.DocumentSnapshot,categoryName?:string):Promise<ProductRecord> {
    const data=document.data()!;
    if(data.schemaVersion!==1) throw new ProductError('schema','This product needs an owner-reviewed schema migration.');
    const input=Object.fromEntries(productFields.map(key=>[key,data[key]]));
    input.images=(data.images||[]).map(({mediaId,alt}:ProductImage)=>({mediaId,alt}));
    const clean=validateProduct(input);
    const images:ProductImage[]=data.images.map((item:ProductImage)=>Object.fromEntries((['mediaId','alt','assetId','publicId','url','width','height','bytes','format','version'] as const).map(key=>[key,item[key]])));
    const category=categoryName ?? (clean.categoryId ? (await db.doc(`categories/${clean.categoryId}`).get()).data()?.name || 'Category unavailable' : 'Unassigned');
    return {...clean,id:document.id,images,revision:data.revision,createdAt:data.createdAt.toMillis(),updatedAt:data.updatedAt.toMillis(),categoryName:category};
  }
  async function list(isAdmin:boolean,cursor?:unknown) {
    let query:FirebaseFirestore.Query=db.collection('products');
    if(!isAdmin)query=query.where('status','==','Published');
    query=query.orderBy('createdAt','desc').orderBy(FieldPath.documentId(),'desc');
    if(cursor) {const after=await db.doc(`products/${id(cursor)}`).get();if(!after.exists)throw new ProductError('invalid','Invalid page cursor.');query=query.startAfter(after);}
    const snapshot=await query.limit(50).get();
    const categoryIds=[...new Set(snapshot.docs.map(doc=>doc.data().categoryId).filter(value=>typeof value==='string' && idPattern.test(value)))];
    const categories=categoryIds.length ? await db.getAll(...categoryIds.map(id=>db.doc(`categories/${id}`))) : [];
    const byId=new Map(categories.map(category=>[category.id,category.data()]));
    const items:ProductRecord[]=[];
    for(const document of snapshot.docs) {
      const category=byId.get(document.data().categoryId);
      if(!isAdmin && category?.enabled!==true)continue;
      items.push(await present(document,category?.name || 'Unassigned'));
    }
    return {items,nextCursor:snapshot.size===50?snapshot.docs.at(-1)!.id:null};
  }
  async function publicGet(slug:unknown) {
    if(typeof slug!=='string'||slug.length>100||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new ProductError('not-found','Product not found.');
    const reservation=await db.doc(`productSlugs/${slug}`).get();
    if(!reservation.exists)throw new ProductError('not-found','Product not found.');
    const document=await db.doc(`products/${id(reservation.data()!.productId)}`).get();
    const data=document.data();
    if(!data || data.status!=='Published' || !idPattern.test(data.categoryId))throw new ProductError('not-found','Product not found.');
    const category=await db.doc(`categories/${data.categoryId}`).get();
    if(category.data()?.enabled!==true)throw new ProductError('not-found','Product not found.');
    return publicProduct(await present(document,category.data()!.name));
  }
  async function save(uid:string,body:Record<string,unknown>) {
    keys(body,['action','id','expectedRevision','operationId','product']);
    const productId=id(body.id), input=validateProduct(body.product);
    if(!Number.isSafeInteger(body.expectedRevision) || (body.expectedRevision as number)<0 || typeof body.operationId!=='string' || !/^[a-f0-9]{32}$/.test(body.operationId))throw new ProductError('invalid','Invalid save revision or operation.');
    const reference=db.doc(`products/${productId}`),slugRef=db.doc(`productSlugs/${input.slug}`);
    await db.runTransaction(async transaction=>{
      await transactionAccess(transaction,uid);
      const previous=await transaction.get(reference);
      const old=previous.data();
      if(old && old.schemaVersion!==1)throw new ProductError('schema','This product needs an owner-reviewed schema migration.');
      const operationHash=createHash('sha256').update(JSON.stringify(input)).digest('hex');
      if(old && old.lastOperationId===body.operationId){if(old.lastOperationHash!==operationHash)throw new ProductError('conflict','This save operation was already used for different changes. Reload before saving.');return;}
      if((old?.revision || 0)!==body.expectedRevision)throw new ProductError('conflict','This product changed in another session. Reload before saving; your edits have been kept.');
      if(old && old.slug!==input.slug)throw new ProductError('invalid','The product URL slug cannot change.',{slug:'The saved URL is permanent.'});
      const slug=await transaction.get(slugRef);
      if(slug.exists && slug.data()!.productId!==productId)throw new ProductError('duplicate','That URL slug is already used.',{slug:'Choose another unique slug.'});
      if(old && !slug.exists)throw new ProductError('schema','The saved product slug reservation is missing. Contact the owner.');
      if(input.categoryId) {const category=await transaction.get(db.doc(`categories/${input.categoryId}`));const retainedDraft=input.status==='Draft'&&old?.categoryId===input.categoryId;if((!category.exists&&!retainedDraft) || (input.status==='Published'&&category.data()?.enabled!==true))throw new ProductError('invalid','Choose an enabled category before publishing.',{categoryId:'This category is missing or disabled.'});}
      const images:ProductImage[]=[];
      for(const image of input.images) {
        const record=await transaction.get(db.doc(`productMedia/${image.mediaId}`));
        const asset=record.data();
        if(!asset || asset.verified!==true || asset.productId!==productId)throw new ProductError('media','Images must finish trusted verification for this product.',{images:'Verify uploads before saving.'});
        images.push({...asset.metadata,mediaId:image.mediaId,alt:image.alt});
      }
      const data={...input,images,schemaVersion:1,revision:(old?.revision||0)+1,lastOperationId:body.operationId,lastOperationHash:operationHash,updatedAt:FieldValue.serverTimestamp(),...(!old?{createdAt:FieldValue.serverTimestamp()}:{})};
      if(old&&(JSON.stringify(old.inventory)!==JSON.stringify(input.inventory)||old.lowStockThreshold!==input.lowStockThreshold)){transaction.create(db.doc('inventoryAudit/editor_'+body.operationId),{productId,actor:uid,reason:'Product editor inventory or threshold change',before:old.inventory,after:input.inventory,createdAt:FieldValue.serverTimestamp()});if(newlyLowStock(old.inventory,input.inventory,input.lowStockThreshold,old.lowStockThreshold))transaction.create(db.doc('adminNotifications/editor_'+body.operationId),{kind:'stock',target:'/admin/products/edit/'+productId,label:'Stock is low or unavailable',createdAt:FieldValue.serverTimestamp()});}
      if(!slug.exists)transaction.create(slugRef,{productId,createdAt:FieldValue.serverTimestamp()});
      if(previous.exists)transaction.update(reference,data);else transaction.create(reference,data);
    });
    return present(await reference.get());
  }
  async function sign(uid:string,body:Record<string,unknown>) {
    keys(body,['action','productId','mediaId','type','size']);
    const productId=id(body.productId),imageId=mediaId(body.mediaId);
    if(!['image/jpeg','image/png','image/webp'].includes(body.type as string) || !Number.isSafeInteger(body.size) || (body.size as number)<=0 || (body.size as number)>MAX_IMAGE_BYTES)throw new ProductError('invalid','Use JPEG, PNG or WebP images up to 10 MiB.');
    const reference=db.doc(`productMedia/${imageId}`);
    const ticket:UploadTicket={productId,uid,timestamp:Math.floor(Date.now()/1000),publicId:`parinaya-silks/products/${productId}/${imageId}`,verified:false};
    media.sign(ticket); // Missing credentials fail before any write.
    await db.runTransaction(async transaction=>{
      await transactionAccess(transaction,uid);
      const existing=await transaction.get(reference);
      const limitRef=db.doc(`catalogUploadLimits/${uid}_${new Date().toISOString().slice(0,10)}`);
      const limit=await transaction.get(limitRef);
      if(existing.exists) {
        const old=existing.data()!;
        if(old.uid!==uid || old.productId!==productId || old.verified || ticket.timestamp-old.timestamp>600)throw new ProductError('media','This upload attempt expired or completed. Select the image again.');
        Object.assign(ticket,old);
        return;
      }
      if((limit.data()?.count||0)>=100)throw new ProductError('media','Daily upload allowance reached. Contact the owner.');
      transaction.set(limitRef,{count:(limit.data()?.count||0)+1,updatedAt:FieldValue.serverTimestamp()});
      transaction.create(reference,{...ticket,createdAt:FieldValue.serverTimestamp()});
    });
    return {...media.sign(ticket),mediaId:imageId};
  }
  async function verify(uid:string,body:Record<string,unknown>) {
    keys(body,['action','productId','mediaId']);
    const productId=id(body.productId),imageId=mediaId(body.mediaId),ref=db.doc(`productMedia/${imageId}`);
    const document=await ref.get(),ticket=document.data() as UploadTicket|undefined;
    if(!ticket || ticket.productId!==productId || ticket.uid!==uid)throw new ProductError('permission','This upload does not belong to this product/session.');
    if(ticket.verified)return {...document.data()!.metadata,mediaId:imageId,alt:''};
    const metadata=await media.verify(ticket);
    await db.runTransaction(async transaction=>{await transactionAccess(transaction,uid);const current=await transaction.get(ref);if(current.data()?.productId!==productId)throw new ProductError('media','Upload changed.');transaction.update(ref,{verified:true,metadata,verifiedAt:FieldValue.serverTimestamp()});});
    return {...metadata,mediaId:imageId,alt:''};
  }
  const delivery=deliveryService(db,async(document,name)=>publicProduct(await present(document,name)));
  const orders=ordersService(db,transactionAccess,delivery.reviewInTransaction);
  const shopping=shoppingService(db,async(document,name)=>publicProduct(await present(document,name)));
  return {
    sitemap:()=>sitemap(db),
    publicBrowse:browseService(db,async(doc,name)=>publicProduct(await present(doc,name))),
    publicAppearance:appearance.publicGet,publicContent:content.publicGet,
    publicList:async(cursor?:unknown)=>{const page=await list(false,cursor);return {...page,items:page.items.map(publicProduct)};},publicGet,
    async privileged(token:string,body:Record<string,unknown>) {
      if(body.action==='profile:syncDirectory'){keys(body,['action']);return customers.sync((await authenticate(token)).uid);}
      if(body.action==='profile:update')return business.profile((await authenticate(token)).uid,body);
      if(typeof body.action==='string'&&body.action.startsWith('orders:')){const user=await authenticate(token);if(body.action==='orders:place'&&!(await db.doc('customerDirectory/'+user.uid).get()).exists&&(await db.doc('customerProfiles/'+user.uid).get()).exists)await customers.sync(user.uid);return orders.customer(user.uid,user.email||'',body);}
      if(typeof body.action==='string'&&/^(addresses:|checkout:)/.test(body.action))return delivery.action((await authenticate(token)).uid,body);
      if(typeof body.action==='string'&&/^(shopping:|bag:|wishlist:)/.test(body.action))return shopping.action((await authenticate(token)).uid,body);
      const uid=await administrator(token);
      if(body.action==='dashboard:orders')return orders.admin(uid,body);
      if(body.action==='customers:orders'){keys(body,['action','uid','cursor']);const target=customerUid(body.uid);if(!(await db.doc('customerProfiles/'+target).get()).exists)throw new ProductError('not-found','Customer profile not found.');const page=await orders.admin(uid,{action:'adminOrders:list',view:'history',pageSize:5,customerUid:target,...(body.cursor?{cursor:body.cursor}:{})}) as {items:any[];nextCursor:string|null};return {...page,items:page.items.map(order=>({id:order.id,reference:order.reference,createdAt:order.createdAt,status:order.status,paymentStatus:order.paymentStatus,collectedPaise:order.collectedPaise||0,totalPaise:order.totalPaise,items:Array.isArray(order.items)?order.items.map((item:any)=>({name:item.name,quantity:item.quantity})):null}))};}
      if(typeof body.action==='string'&&body.action.startsWith('customers:'))return customers.admin(body);
      if(typeof body.action==='string'&&/^(dashboard:|coupons:|notifications:|customers:|inventory:|reports:)/.test(body.action))return business.admin(uid,body);
      if(typeof body.action==='string'&&body.action.startsWith('adminOrders:'))return orders.admin(uid,body);
      switch(body.action) {
        case 'content:get':keys(body,['action']);return content.get();
        case 'content:save':return content.save(uid,body);
        case 'content:sign':return homeMedia.sign(uid,body);
        case 'content:verify':return homeMedia.verify(uid,body);
        case 'shipping:get': keys(body,['action']);return shipping.get();
        case 'shipping:save':return shipping.save(uid,body);
        case 'appearance:get': keys(body,['action']);return appearance.get();
        case 'appearance:sign':return appearance.sign(uid,body);
        case 'appearance:verify':return appearance.verify(uid,body);
        case 'appearance:save':return appearance.save(uid,body);
        case 'list': keys(body,['action','cursor']);return list(true,body.cursor);
        case 'get': {keys(body,['action','id']);const document=await db.doc(`products/${id(body.id)}`).get();if(!document.exists)throw new ProductError('not-found','Product not found.');return present(document);}
        case 'save':return save(uid,body);
        case 'sign':return sign(uid,body);
        case 'verify':return verify(uid,body);
        case 'delete':throw new ProductError('deletion-blocked','Permanent deletion is unavailable until historical references can be verified. Archive this product instead.');
        default:throw new ProductError('invalid','Unsupported catalog operation.');
      }
    },
  };
}
