import {createHash} from 'node:crypto';
import {FieldValue,type Firestore} from 'firebase-admin/firestore';
import {ProductError,type PublicProductRecord} from '../src/products/model.ts';
import {SHOPPING_LIMIT,bagId,productId,variantId,positiveQuantity,resolveItem,type SavedItem,type ShoppingData} from '../src/shopping/model.ts';

// All paths are derived from the verified token UID, never request-supplied ownership.
export function shoppingService(db:Firestore,present:(document:FirebaseFirestore.DocumentSnapshot,name?:string)=>Promise<PublicProductRecord>) {
  async function read(uid:string):Promise<ShoppingData> {
    const root=db.doc(`customerShopping/${uid}`);
    const [bag,wishlist]=await Promise.all([root.collection('bag').limit(SHOPPING_LIMIT+1).get(),root.collection('wishlist').limit(SHOPPING_LIMIT+1).get()]);
    if(bag.size>SHOPPING_LIMIT||wishlist.size>SHOPPING_LIMIT)throw new ProductError('conflict','Too many saved items. Contact the store owner.');
    const ids=[...new Set([...bag.docs,...wishlist.docs].map(doc=>productId(doc.data().productId)))];
    const products=ids.length?await db.getAll(...ids.map(id=>db.doc(`products/${id}`))):[];
    const categoryIds=[...new Set(products.filter(doc=>doc.exists&&doc.data()?.status==='Published').map(doc=>doc.data()!.categoryId).filter(id=>typeof id==='string'&&/^[A-Za-z0-9]{20}$/.test(id)))];
    const categories=categoryIds.length?await db.getAll(...categoryIds.map(id=>db.doc(`categories/${id}`))):[];
    const categoryMap=new Map(categories.map(doc=>[doc.id,doc.data()]));
    const catalog=new Map<string,PublicProductRecord>();
    for(const doc of products){const category=categoryMap.get(doc.data()?.categoryId);if(doc.exists&&doc.data()?.status==='Published'&&category?.enabled===true)catalog.set(doc.id,await present(doc,category.name));}
    const resolve=(docs:FirebaseFirestore.QueryDocumentSnapshot[],isBag:boolean)=>docs.map(doc=>{const data=doc.data();const item:SavedItem={id:doc.id,productId:productId(data.productId),variantId:isBag?variantId(data.variantId):null,quantity:isBag?positiveQuantity(data.quantity):1};return resolveItem(item,catalog.get(item.productId)||null,isBag);});
    return {bag:resolve(bag.docs,true),wishlist:resolve(wishlist.docs,false)};
  }
  async function action(uid:string,body:Record<string,unknown>) {
    if(body.action==='shopping:get'){if(Object.keys(body).some(key=>key!=='action'))throw new ProductError('invalid','Unsupported request fields.');return read(uid);}
    const allowed=['bag:add','bag:adjust','bag:remove','wishlist:set'];
    if(!allowed.includes(body.action as string))throw new ProductError('invalid','Unsupported shopping operation.');
    const fields=body.action==='wishlist:set'?['action','productId','enabled','operationId']:body.action==='bag:add'?['action','productId','variantId','quantity','operationId']:body.action==='bag:adjust'?['action','productId','variantId','delta','operationId']:['action','productId','variantId','operationId'];
    if(Object.keys(body).some(key=>!fields.includes(key))||fields.some(key=>!(key in body)))throw new ProductError('invalid','Unsupported or missing shopping fields.');
    const pid=productId(body.productId),wish=body.action==='wishlist:set',vid=wish?null:variantId(body.variantId);
    if(typeof body.operationId!=='string'||!/^[a-f0-9]{32}$/.test(body.operationId))throw new ProductError('invalid','Invalid operation reference.');
    if(wish&&typeof body.enabled!=='boolean')throw new ProductError('invalid','Choose whether to save this product.');
    if(body.action==='bag:add')positiveQuantity(body.quantity);
    if(body.action==='bag:adjust'&&body.delta!==1&&body.delta!==-1)throw new ProductError('invalid','Adjust quantity by one.');
    const root=db.doc(`customerShopping/${uid}`),ref=root.collection(wish?'wishlist':'bag').doc(wish?pid:bagId(pid,vid));
    const receipt=root.collection('operations').doc(body.operationId);
    const hash=createHash('sha256').update(JSON.stringify(fields.map(key=>[key,body[key]]))).digest('hex');
    return db.runTransaction(async tx=>{
      const previous=await tx.get(receipt);
      if(previous.exists){if(previous.data()!.hash!==hash)throw new ProductError('conflict','This operation was used for different changes.');return {outcome:previous.data()!.outcome};}
      const saved=await tx.get(ref);
      const removing=body.action==='bag:remove'||(wish&&body.enabled===false);
      let outcome='saved';
      if(!removing){
        const product=await tx.get(db.doc(`products/${pid}`));const data=product.data();
        if(!data||data.status!=='Published'||data.schemaVersion!==1||typeof data.categoryId!=='string'||!/^[A-Za-z0-9]{20}$/.test(data.categoryId))throw new ProductError('conflict','This product is no longer available.');
        const category=await tx.get(db.doc(`categories/${data.categoryId}`));
        if(category.data()?.enabled!==true)throw new ProductError('conflict','This product is no longer available.');
        if(!wish){
          const variant=data.inventory?.variants?.find((value:{id:string})=>value.id===vid);
          if(data.inventory?.mode==='variants'?!variant:vid!==null)throw new ProductError('conflict','Choose an available colour on the product page.');
          const stock=data.inventory.mode==='simple'?data.inventory.quantity:variant.quantity;
          const qty=body.action==='bag:adjust'?positiveQuantity((saved.data()?.quantity||0)+(body.delta as number)):positiveQuantity(body.quantity);
          if(body.action==='bag:adjust'&&!saved.exists)throw new ProductError('conflict','This item was removed. Refresh your bag.');
          if(!Number.isSafeInteger(stock)||(stock<qty&&!(body.action==='bag:adjust'&&body.delta===-1)))throw new ProductError('conflict',stock>0?`Only ${stock} available. Refresh your bag.`:'This product is out of stock.');
          if(body.action==='bag:add'&&saved.exists)outcome='already';
          else {
            if(!saved.exists){const entries=await tx.get(root.collection('bag').limit(SHOPPING_LIMIT));if(entries.size>=SHOPPING_LIMIT)throw new ProductError('conflict','Your bag is full. Remove an item before adding another.');}
            tx.set(ref,{productId:pid,variantId:vid,quantity:qty,updatedAt:FieldValue.serverTimestamp(),...(!saved.exists?{createdAt:FieldValue.serverTimestamp()}: {})},{merge:true});
          }
        }else if(!saved.exists){
          const entries=await tx.get(root.collection('wishlist').limit(SHOPPING_LIMIT));if(entries.size>=SHOPPING_LIMIT)throw new ProductError('conflict','Your wishlist is full. Remove an item before adding another.');
          tx.create(ref,{productId:pid,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
        }else outcome='already';
      }else{tx.delete(ref);outcome='removed';}
      // Receipts make uncertain network retries safe, including remove/re-add races.
      tx.create(receipt,{hash,outcome,createdAt:FieldValue.serverTimestamp()});
      return {outcome};
    });
  }
  return {action};
}
