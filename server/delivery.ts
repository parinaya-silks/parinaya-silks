import {createHash} from 'node:crypto';
import {FieldValue,type Firestore} from 'firebase-admin/firestore';
import {ProductError,type PublicProductRecord} from '../src/products/model.ts';
import {ADDRESS_LIMIT,addressId,validateAddress,type AddressBook,type DeliveryAddress,type CheckoutReview,type CheckoutLine} from '../src/delivery/model.ts';
import {savedShipping,quoteShipping} from '../src/shipping/model.ts';
import {SHOPPING_LIMIT,resolveItem} from '../src/shopping/model.ts';

const fields=(body:Record<string,unknown>,allowed:string[])=>{if(Object.keys(body).some(key=>!allowed.includes(key))||allowed.some(key=>!(key in body)))throw new ProductError('invalid','Unsupported or missing request fields.');};
function presentAddress(doc:FirebaseFirestore.DocumentSnapshot):DeliveryAddress {const data=doc.data()!;return {...validateAddress(Object.fromEntries(Object.keys(validateAddressFields).map(key=>[key,data[key]]))),id:doc.id,revision:data.revision,createdAt:data.createdAt.toMillis(),updatedAt:data.updatedAt.toMillis()};}
const validateAddressFields={recipientName:1,mobileNumber:1,pinCode:1,line1:1,locality:1,city:1,state:1,landmark:1,label:1,country:1};

export function deliveryService(db:Firestore,presentProduct:(doc:FirebaseFirestore.DocumentSnapshot,name?:string)=>Promise<PublicProductRecord>) {
  const root=(uid:string)=>db.doc(`customerShopping/${uid}`);
  async function list(uid:string):Promise<AddressBook>{return db.runTransaction(async tx=>{
    const [docs,preferences]=await Promise.all([tx.get(root(uid).collection('addresses').limit(ADDRESS_LIMIT+1)),tx.get(root(uid).collection('preferences').doc('delivery'))]);
    if(docs.size>ADDRESS_LIMIT)throw new ProductError('conflict','Your address book needs owner review.');
    return {addresses:docs.docs.map(presentAddress),defaultAddressId:preferences.data()?.defaultAddressId||null,revision:preferences.data()?.revision||0};
  });}
  async function mutate(uid:string,body:Record<string,unknown>){
    const save=body.action==='addresses:save',remove=body.action==='addresses:delete';
    if(!save&&!remove&&body.action!=='addresses:default')throw new ProductError('invalid','Unsupported address operation.');
    fields(body,save?['action','id','expectedRevision','operationId','address']:['action','id','expectedRevision','operationId']);
    const id=addressId(body.id),operationId=addressId(body.operationId);
    if(!Number.isSafeInteger(body.expectedRevision)||(body.expectedRevision as number)<0)throw new ProductError('invalid','Invalid address revision.');
    const address=save?validateAddress(body.address):null;
    const hash=createHash('sha256').update(JSON.stringify([body.action,id,body.expectedRevision,address])).digest('hex');
    const ref=root(uid).collection('addresses').doc(id),pref=root(uid).collection('preferences').doc('delivery'),receipt=root(uid).collection('operations').doc(operationId);
    return db.runTransaction(async tx=>{
      const recorded=await tx.get(receipt);if(recorded.exists){if(recorded.data()!.hash!==hash)throw new ProductError('conflict','This operation was used for different changes.');return {id,bookRevision:recorded.data()!.bookRevision||0};}
      const [all,preferences]=await Promise.all([tx.get(root(uid).collection('addresses').limit(ADDRESS_LIMIT+1)),tx.get(pref)]);
      const old=all.docs.find(doc=>doc.id===id);
      if((old?.data().revision||0)!==body.expectedRevision)throw new ProductError('conflict','This address changed in another session. Reload addresses before saving; your form has been kept.');
      if(!save&&!old)throw new ProductError('not-found','This saved address is no longer available.');
      if(save&&!old&&all.size>=ADDRESS_LIMIT)throw new ProductError('conflict',`You can save up to ${ADDRESS_LIMIT} addresses. Delete an address before adding another.`);
      let defaultId=preferences.data()?.defaultAddressId||null;
      if(save){tx.set(ref,{...address,revision:(old?.data().revision||0)+1,updatedAt:FieldValue.serverTimestamp(),createdAt:old?.data().createdAt||FieldValue.serverTimestamp()});if(!defaultId||!all.docs.some(doc=>doc.id===defaultId))defaultId=id;}
      else if(remove){tx.delete(ref);if(defaultId===id||!all.docs.some(doc=>doc.id===defaultId))defaultId=all.docs.map(doc=>doc.id).filter(value=>value!==id).sort()[0]||null;}
      else defaultId=id;
      // One pointer, serialized by the same transaction: never competing flags.
      const bookRevision=(preferences.data()?.revision||0)+1;
      tx.set(pref,{defaultAddressId:defaultId,revision:bookRevision,updatedAt:FieldValue.serverTimestamp()});
      tx.create(receipt,{hash,addressId:id,bookRevision,outcome:remove?'removed':'saved',createdAt:FieldValue.serverTimestamp()});
      return {id,bookRevision};
    });
  }
  async function review(uid:string,body:Record<string,unknown>):Promise<CheckoutReview>{
    fields(body,['action','addressId']);
    const selected=body.addressId===null?null:addressId(body.addressId);
    return db.runTransaction(async tx=>{
      const bag=await tx.get(root(uid).collection('bag').limit(SHOPPING_LIMIT+1));
      if(bag.size>SHOPPING_LIMIT)throw new ProductError('conflict','Too many bag items. Review your bag first.');
      const addressDoc=selected?await tx.get(root(uid).collection('addresses').doc(selected)):null;
      if(selected&&!addressDoc?.exists)throw new ProductError('permission','Choose an address saved to your account.');
      const address=addressDoc?presentAddress(addressDoc):null;
      const ids=[...new Set(bag.docs.map(doc=>doc.data().productId).filter(id=>typeof id==='string'&&/^[A-Za-z0-9]{20}$/.test(id)))];
      const products=ids.length?await tx.getAll(...ids.map(id=>db.doc('products/'+id))):[];
      const categoryIds=[...new Set(products.filter(doc=>doc.exists&&doc.data()?.status==='Published').map(doc=>doc.data()!.categoryId).filter(id=>typeof id==='string'&&/^[A-Za-z0-9]{20}$/.test(id)))];
      const categories=categoryIds.length?await tx.getAll(...categoryIds.map(id=>db.doc('categories/'+id))):[];
      const categoryMap=new Map(categories.map(doc=>[doc.id,doc.data()])),catalog=new Map<string,PublicProductRecord>();
      for(const doc of products){const category=categoryMap.get(doc.data()?.categoryId);if(doc.data()?.status==='Published'&&category?.enabled===true)catalog.set(doc.id,await presentProduct(doc,category.name));}
      let subtotal=0n,complete=true;
      const items:CheckoutLine[]=bag.docs.map(doc=>{
        const data=doc.data(),product=catalog.get(data.productId)||null,quantity=data.quantity,issues:string[]=[];
        const validQuantity=Number.isSafeInteger(quantity)&&quantity>0&&quantity<=1000000;
        const validVariant=data.variantId===null||typeof data.variantId==='string'&&/^[A-Za-z0-9_-]{1,40}$/.test(data.variantId);
        if(!validQuantity)issues.push('Use a positive whole quantity in your bag.');
        if(!validVariant)issues.push('Choose an available colour in your bag.');
        const resolved=resolveItem({id:doc.id,productId:data.productId,variantId:validVariant?data.variantId:null,quantity:validQuantity?quantity:1},product,true);
        if(resolved.reason)issues.push(resolved.reason);
        if(product&&validQuantity)subtotal+=BigInt(product.pricePaise)*BigInt(quantity);else complete=false;
        return {id:doc.id,productId:typeof data.productId==='string'?data.productId:'',variantId:validVariant?data.variantId:null,quantity:validQuantity?quantity:0,product,variantName:resolved.variantName,issues};
      });
      const issues=bag.empty?['Your bag is empty.']:!address?['Select a saved delivery address to complete the delivery review.']:[];
      const valid=!issues.length&&complete&&items.every(item=>!item.issues.length);
      let shipping;
      try{shipping=quoteShipping(savedShipping((await tx.get(db.doc('siteSettings/shipping'))).data()),subtotal,valid);}catch{shipping={state:'unavailable' as const,revision:null,shippingPaise:null,totalPaise:null,free:false,freeShippingEnabled:false,freeThresholdPaise:null};}
      const value={address,items,subtotalPaise:String(subtotal),subtotalComplete:complete,valid,issues,shipping};
      return {...value,fingerprint:createHash('sha256').update(JSON.stringify(value)).digest('hex')};
    });
  }
  return {async action(uid:string,body:Record<string,unknown>){if(body.action==='addresses:list'){fields(body,['action']);return list(uid);}if(body.action==='checkout:review')return review(uid,body);return mutate(uid,body);}};
}
