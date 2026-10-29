import {historyFilters,historyStatuses,historyProjection,type HistoryFilter} from '../src/orders/historyModel.ts';
import {loyaltyService} from './loyalty.ts';
import {orderListProjection} from '../src/admin/orders/model.ts';
import {deliveryRecord,deliveryChanged,deliveryEditable,deliveryFields} from '../src/orders/delivery.ts';
import {dashboardBounds} from '../src/admin/dashboard/model.ts';
import {checkoutSource,type CheckoutSource} from '../src/checkout/source.ts';
import {createHash} from 'node:crypto';
import {FieldValue,Timestamp,FieldPath,type Firestore,type Transaction,type DocumentSnapshot,type Query} from 'firebase-admin/firestore';
import {ProductError,type ProductInput} from '../src/products/model.ts';
import {referenceId,exact,text,noteText,transitions,orderStatuses,changeStock,lowStock,newlyLowStock,storedCoupon,couponUses,couponDiscount,type OrderRecord,type OrderItem,type CouponInput} from '../src/orders/model.ts';
import type {CheckoutReview} from '../src/delivery/model.ts';

const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const stamp=()=>FieldValue.serverTimestamp();
const now=()=>Date.now();
const millis=(value:unknown):unknown=>value instanceof Timestamp?value.toMillis():Array.isArray(value)?value.map(millis):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,millis(item)])):value;
const present=(doc:DocumentSnapshot)=>({...(millis(doc.data()) as object),id:doc.id}) as OrderRecord;

export function ordersService(db:Firestore,access:(tx:Transaction,uid:string)=>Promise<void>,reviewInTransaction:(tx:Transaction,uid:string,addressId:string|null,source?:CheckoutSource)=>Promise<CheckoutReview>){
  const loyalty=loyaltyService(db);
  function event(tx:Transaction,id:string,kind:string,target:string,label:string){tx.set(db.doc('adminNotifications/'+id),{kind,target,label,createdAt:stamp()});}
  async function coupon(tx:Transaction,uid:string,code:unknown,subtotal:string){
    if(code===null||code==='')return {code:null,discountPaise:'0',revision:0,input:null as CouponInput|null,uses:0,customerUses:0};
    const normalized=text(code,32,true).toUpperCase();if(!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(normalized))throw new ProductError('invalid','Invalid coupon code.');
    const [saved,usage]=await Promise.all([tx.get(db.doc('coupons/'+normalized)),tx.get(db.doc(`coupons/${normalized}/customers/${uid}`))]);
    if(!saved.exists)throw new ProductError('conflict','This coupon is not available. Remove it or use another code.');
    const data=saved.data()!,input=storedCoupon(data);
    if(input.code!==normalized)throw new ProductError('schema','Coupon identity requires owner review.');
    return {code:normalized,discountPaise:String(couponDiscount(input,BigInt(subtotal),couponUses(data.uses),couponUses(usage.data()?.uses))),revision:data.revision,input,uses:couponUses(data.uses),customerUses:couponUses(usage.data()?.uses)};
  }
  async function review(tx:Transaction,uid:string,addressId:string|null,code:unknown,source:CheckoutSource={kind:'bag'},points:unknown=0){
    const current=await reviewInTransaction(tx,uid,addressId,source),discount=await coupon(tx,uid,code,current.subtotalPaise);
    const merchandise=BigInt(current.subtotalPaise)-BigInt(discount.discountPaise),loyal=await loyalty.quote(tx,uid,merchandise,!!discount.code,points,current.items.map(item=>BigInt(item.product?.pricePaise??0)*BigInt(item.quantity)));
    const totalPaise=current.shipping.state==='ready'?String(BigInt(current.shipping.totalPaise!)-BigInt(discount.discountPaise)-BigInt(loyal.value.discountPaise)):null;
    // Coupon configuration is part of confirmation. Usage is independently checked
    // in this same transaction, but unrelated purchases don't invalidate a review.
    const value={...current,loyalty:loyal.value,discountPaise:discount.discountPaise,couponCode:discount.code,couponRevision:discount.revision,totalPaise};
    return {value:{...value,fingerprint:digest(value)},discount,loyal};
  }
  async function place(uid:string,email:string,body:Record<string,unknown>){
    exact(body,['action','addressId','couponCode','fingerprint','operationId'],['source','points']);const source=checkoutSource(body.source);
    const addressId=referenceId(body.addressId),operationId=referenceId(body.operationId);
    if(typeof body.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(body.fingerprint))throw new ProductError('invalid','Review checkout before placing your order.');
    const orderId=digest([uid,operationId]).slice(0,32),ref=db.doc('orders/'+orderId),receipt=db.doc(`customerShopping/${uid}/operations/${operationId}`),hash=digest([...(source.kind==='bag'?[addressId,body.couponCode,body.fingerprint]:[addressId,body.couponCode,body.fingerprint,source]),...(body.points?[body.points]:[])]);
    return db.runTransaction(async tx=>{
      const recorded=await tx.get(receipt);
      if(recorded.exists){if(recorded.data()?.hash!==hash||recorded.data()?.orderId!==orderId)throw new ProductError('conflict','This operation was used for a different request.');return {order:projection(present(await tx.get(ref)),false),recovered:true};}
      const {value:current,discount,loyal}=await review(tx,uid,addressId,body.couponCode,source,body.points===undefined?0:body.points);
      if(current.fingerprint!==body.fingerprint)return {review:current,changed:true};
      if(!current.valid||current.shipping.state!=='ready'||!current.totalPaise)throw new ProductError('conflict','Resolve the checkout review and shipping settings before placing an order.');
      if(BigInt(current.totalPaise)>1000000000000n)throw new ProductError('invalid','Order exceeds the supported COD amount. Contact the store owner.');
      const ids=[...new Set(current.items.map(item=>item.productId))];
      const [products,limit,directory]=await Promise.all([tx.getAll(...ids.map(id=>db.doc('products/'+id))),tx.get(db.doc(`orderSubmissionLimits/${uid}_${new Date().toISOString().slice(0,10)}`)),tx.get(db.doc('customerDirectory/'+uid))]);
      if((limit.data()?.count||0)>=50)throw new ProductError('conflict','Daily order submission allowance reached. Contact the store owner.');
      const inventory=new Map(products.map(doc=>[doc.id,structuredClone(doc.data()!.inventory) as ProductInput['inventory']]));
      const items:OrderItem[]=current.items.map(item=>{const product=item.product!,raw=products.find(doc=>doc.id===product.id)!.data()!;inventory.set(product.id,changeStock(inventory.get(product.id)!,item.variantId,-item.quantity));return {productId:product.id,variantId:item.variantId,quantity:item.quantity,name:product.name,slug:product.slug,sku:item.variantId?raw.inventory.variants.find((variant:{id:string})=>variant.id===item.variantId).sku:raw.sku,variantName:item.variantName,imageUrl:(product.images.find(image=>image.mediaId===product.coverMediaId)||product.images[0])?.url||'',unitPaise:product.pricePaise,linePaise:String(BigInt(product.pricePaise)*BigInt(item.quantity))};});
      const itemQuantity=items.reduce((sum,item)=>sum+item.quantity,0);
      const value={...(loyal.snapshot?{loyalty:loyal.snapshot}:{}),itemQuantity,schemaVersion:1,checkoutSource:source,uid,email:email.toLowerCase(),reference:'PS-'+orderId.toUpperCase(),currency:'INR',status:'Placed',paymentMethod:'COD',paymentStatus:'due',revision:1,address:current.address,items,subtotalPaise:current.subtotalPaise,discountPaise:current.discountPaise,shippingPaise:current.shipping.shippingPaise,totalPaise:current.totalPaise,couponCode:current.couponCode,couponSnapshot:discount.input,shippingRevision:current.shipping.revision,reportingPaise:Number(current.totalPaise),collectedPaise:0,refundPaise:0,calculationPolicy:'pre-coupon-strict-shipping-v1',stockRestored:false,courier:'',trackingNumber:'',trackingUrl:'',internalNotes:'',collection:null,request:null,refunds:[],history:[{action:'Placed',actor:uid,at:now(),note:'COD payment due; stock deducted on acceptance.'}],createdAt:stamp(),updatedAt:stamp()};
      loyalty.placed(tx,uid,loyal.balance,loyal.snapshot,orderId,value.reference);
      for(const doc of products){const old=doc.data()!,next=inventory.get(doc.id)!;tx.update(doc.ref,{inventory:next,revision:old.revision+1,updatedAt:stamp()});tx.create(db.doc(`inventoryAudit/${orderId}_${doc.id}`),{productId:doc.id,orderId,actor:uid,reason:'COD order accepted',before:old.inventory,after:next,createdAt:stamp()});if(newlyLowStock(old.inventory,next,old.lowStockThreshold))event(tx,orderId+'_'+doc.id,'stock','/admin/products/edit/'+doc.id,'Stock is low or unavailable');}
      if(source.kind==='bag')for(const item of current.items)tx.delete(db.doc(`customerShopping/${uid}/bag/${item.id}`));
      if(discount.code){tx.update(db.doc('coupons/'+discount.code),{uses:discount.uses+1});tx.set(db.doc(`coupons/${discount.code}/customers/${uid}`),{uses:discount.customerUses+1,updatedAt:stamp()});}
      if(directory.exists){const old=directory.data()!;tx.update(directory.ref,{orderCount:old.orderCount+1,hasOrders:true,itemsOrdered:Number.isSafeInteger(old.itemsOrdered)?old.itemsOrdered+itemQuantity:null,latestOrderAt:stamp(),latestOrderId:orderId,latestOrderReference:value.reference});}
      tx.create(ref,value);tx.create(receipt,{hash,orderId,createdAt:stamp()});tx.set(limit.ref,{count:(limit.data()?.count||0)+1,updatedAt:stamp()});event(tx,orderId,'order','/admin/orders/'+orderId,'New COD order '+value.reference);
      return {order:projection({...value,id:orderId,createdAt:now(),updatedAt:now()} as OrderRecord,false)};
    });
  }
  async function list(uid:string,body:Record<string,unknown>,admin=false){
    exact(body,['action'],['cursor','status','paymentStatus','from','to','search','customerUid',...(admin?['pageSize','view','statuses']:['view','filter'])]);
    const cards=!admin&&body.view==='cards';
    if(!admin&&body.filter!==undefined&&(!cards||!historyFilters.includes(body.filter as HistoryFilter)))throw new ProductError('invalid','Invalid history filter.');
    if(cards&&['status','paymentStatus','from','to','search','customerUid'].some(key=>key in body))throw new ProductError('invalid','Unsupported history filters.');
    if(body.view!==undefined&&!(admin?['summary','history']:['cards']).includes(String(body.view)))throw new ProductError('invalid','Invalid order list view.');
    if(body.statuses!==undefined&&(!Array.isArray(body.statuses)||!body.statuses.length||body.statuses.length>7||new Set(body.statuses).size!==body.statuses.length||body.statuses.some(value=>!orderStatuses.includes(value as never))||body.status))throw new ProductError('invalid','Invalid order status filters.');
    if(body.from!==undefined&&body.to!==undefined&&Number(body.from)>Number(body.to))throw new ProductError('invalid','Date range is reversed.');
    if(body.view==='summary'&&body.search&&!/^PS-[A-Z0-9_-]+$/i.test(String(body.search)))throw new ProductError('invalid','Enter an exact PS- order reference.');
    let query:Query=db.collection('orders');
    if(!admin)query=query.where('uid','==',uid);else if(body.customerUid)query=query.where('uid','==',text(body.customerUid,128,true));
    if(body.status){if(!orderStatuses.includes(body.status as never))throw new ProductError('invalid','Invalid order status.');query=query.where('status','==',body.status);}
    if(body.statuses)query=query.where('status','in',body.statuses);
    const statuses=cards?historyStatuses[(body.filter||'all') as HistoryFilter]:[];if(statuses.length)query=query.where('status','in',statuses);
    if(body.paymentStatus){if(!['due','collected'].includes(body.paymentStatus as string))throw new ProductError('invalid','Invalid COD status.');query=query.where('paymentStatus','==',body.paymentStatus);}
    if(body.search){const search=text(body.search,254,true);query=query.where(search.toUpperCase().startsWith('PS-')?'reference':'email','==',search.toUpperCase().startsWith('PS-')?search.toUpperCase():search.toLowerCase());}
    for(const [key,operator]of [['from','>='],['to','<=']] as const)if(body[key]!==undefined){if(!Number.isSafeInteger(body[key])||(body[key] as number)<0)throw new ProductError('invalid','Invalid date filter.');query=query.where('createdAt',operator,Timestamp.fromMillis(body[key] as number));}
    query=query.orderBy('createdAt','desc').orderBy(FieldPath.documentId(),'desc');
    if(body.cursor){const after=await db.doc('orders/'+referenceId(body.cursor)).get();if(!after.exists||(!admin&&after.data()?.uid!==uid))throw new ProductError('invalid','Invalid order cursor.');query=query.startAfter(after);}
    const pageSize=body.pageSize===undefined?25:body.pageSize;if(!Number.isInteger(pageSize)||(pageSize as number)<1||(pageSize as number)>25)throw new ProductError('invalid','Invalid order page size.');const summary=body.view==='summary',lookahead=cards||summary||body.view==='history',docs=await query.limit((pageSize as number)+(lookahead?1:0)).get(),page=docs.docs.slice(0,pageSize as number);return {items:page.map(doc=>projection(present(doc),admin)),nextCursor:(lookahead?docs.size>(pageSize as number):docs.size===pageSize)?page.at(-1)!.id:null};
  }
  function projection(order:OrderRecord,admin:boolean){if(admin)return order;const {internalNotes,history,...safe}=order;return {...safe,history:history.filter(item=>!['Note','Manual refund'].includes(item.action)).map(({action,at})=>({action,at})),refunds:order.refunds.map(({amountPaise,at})=>({amountPaise,at})),collection:order.collection?{at:order.collection.at}:null};}
  async function get(uid:string,body:Record<string,unknown>,admin=false){exact(body,['action','id']);const raw=typeof body.id==='string'&&/^PS-[A-F0-9]{32}$/.test(body.id)?body.id.slice(3).toLowerCase():referenceId(body.id),doc=await db.doc('orders/'+raw).get();if(!doc.exists||(!admin&&doc.data()?.uid!==uid))throw new ProductError('not-found','Order not found.');return projection(present(doc),admin);}
  async function mutate(uid:string,body:Record<string,unknown>,admin:boolean){
    exact(body,['action','id','expectedRevision','operationId','command'],['note',...deliveryFields,'reference','amountPaise','method','loyaltyRefund']);
    const id=referenceId(body.id),op=referenceId(body.operationId),command=text(body.command,40,true),note=noteText(body.note??'',1000),ref=db.doc('orders/'+id),receipt=db.doc('orderOperations/'+digest([uid,op])),hash=digest(body);
    if(!Number.isSafeInteger(body.expectedRevision)||(body.expectedRevision as number)<1)throw new ProductError('invalid','Invalid order revision.');
    return db.runTransaction(async tx=>{
      if(admin)await access(tx,uid);
      const [doc,recorded]=await Promise.all([tx.get(ref),tx.get(receipt)]);
      if(recorded.exists){if(recorded.data()?.hash!==hash)throw new ProductError('conflict','Operation already used.');if(!admin&&doc.data()?.uid!==uid)throw new ProductError('not-found','Order not found.');return projection(present(doc),admin);}
      if(!doc.exists||(!admin&&doc.data()?.uid!==uid))throw new ProductError('not-found','Order not found.');const old=present(doc);
      if(body.loyaltyRefund!==undefined&&command!=='manual-refund')throw new ProductError('invalid','Loyalty refund allocations require a refund record.');
      if(command==='manual-refund'&&old.loyalty&&body.loyaltyRefund===undefined)throw new ProductError('invalid','Allocate the loyalty refund between merchandise lines and shipping.');
      if(old.revision!==body.expectedRevision)throw new ProductError('conflict','This order changed. Reload before continuing.');
      const update:Record<string,unknown>={revision:old.revision+1,updatedAt:stamp()},history={action:command,actor:uid,at:now(),note};let restore=false;
      if(!admin){
        if(!['request-cancellation','request-return','request-exchange'].includes(command))throw new ProductError('permission','Customer action not permitted.');
        if(old.request&&old.request.status!=='rejected'&&!(old.request.kind==='cancellation'&&old.request.status==='approved'&&['Shipped','Delivered'].includes(old.status)))throw new ProductError('conflict','An order request already exists.');if(!note)throw new ProductError('invalid','Provide a reason for the request.');
        const kind=command.slice(8);if(kind==='cancellation'){if(!['Placed','Confirmed','Processing'].includes(old.status))throw new ProductError('conflict','Cancellation can only be requested before dispatch.');}
        else {const policy=(await tx.get(db.doc('siteSettings/returns'))).data();if(!policy?.enabled||policy.approved!==true||!policy.approvedText||!['Shipped','Delivered'].includes(old.status))throw new ProductError('conflict','Returns and exchanges are unavailable without an approved enabled policy.');if(!policy.allowedKinds?.includes(kind))throw new ProductError('conflict','This request is not enabled by the approved policy.');}
        update.request={kind,status:'pending',reason:note,at:now(),restocked:false};
      }else if(orderStatuses.includes(command as never)){
        if(!transitions[old.status].includes(command as never))throw new ProductError('conflict',`Cannot change ${old.status} to ${command}.`);
        if(['Cancelled','Rejected'].includes(command)){if(!note)throw new ProductError('invalid','A cancellation or rejection reason is required.');if(old.paymentStatus==='collected')throw new ProductError('conflict','Collected funds require owner resolution before pre-dispatch cancellation.');restore=!old.stockRestored;update.stockRestored=true;if(old.request?.status==='pending')update.request={...old.request,status:command==='Cancelled'&&old.request.kind==='cancellation'?'approved':'rejected'};}
        if(deliveryFields.some(field=>field in body)||command==='Shipped'){
          if(!deliveryEditable(old.status)||['Cancelled','Rejected'].includes(command))throw new ProductError('invalid','Delivery fields are not permitted for this transition.');
          Object.assign(update,deliveryRecord(old,body,command as OrderRecord['status']));
        }update.status=command;
      }else if(command==='delivery-details'){
        if(!deliveryEditable(old.status))throw new ProductError('conflict','Delivery details are read-only for this order state.');
        const delivery=deliveryRecord(old,body,old.status);if(!deliveryChanged(old,delivery))throw new ProductError('invalid','No delivery details have changed.');
        Object.assign(update,delivery);history.action='Delivery details updated';
      }else if(command==='collect'){
        if(old.status!=='Delivered'||old.paymentStatus!=='due')throw new ProductError('conflict','COD collection can be recorded once after delivery.');update.paymentStatus='collected';update.collectedPaise=Number(old.totalPaise);update.collection={actor:uid,at:now(),reference:text(body.reference,150,true),note};
      }else if(command==='note'){if(!note)throw new ProductError('invalid','Enter an internal note.');update.internalNotes=note;history.action='Note';}
      else if(command==='approve-request'||command==='reject-request'){
        if(old.request?.status!=='pending')throw new ProductError('conflict','There is no pending request.');if(!note)throw new ProductError('invalid','Record the review reason.');update.request={...old.request,status:command==='approve-request'?'approved':'rejected'};
        if(command==='approve-request'&&old.request.kind==='cancellation'){if(!['Placed','Confirmed','Processing'].includes(old.status)||old.paymentStatus==='collected')throw new ProductError('conflict','This order can no longer be cancelled before dispatch.');update.status='Cancelled';restore=!old.stockRestored;update.stockRestored=true;}
      }else if(command==='resolve-request'){if(!old.request||old.request.kind==='cancellation'||old.request.status!=='approved'||!note)throw new ProductError('conflict','An approved return/exchange and resolution note are required.');update.request={...old.request,status:'resolved'};
      }else if(command==='receive-restock'){
        if(!old.request||old.request.kind==='cancellation'||old.request.status!=='approved'||old.request.restocked||!note)throw new ProductError('conflict','An approved return/exchange and inspection note are required.');restore=true;update.request={...old.request,status:'resolved',restocked:true};
      }else if(command==='manual-refund'){
        if(old.paymentStatus!=='collected'||old.request?.status!=='resolved'||old.refunds.length>=20)throw new ProductError('conflict','A resolved return with collected COD funds is required.');const refundMethod=text(body.method,80,true),refundReference=text(body.reference,150,true);if(old.refunds.some(item=>item.method===refundMethod&&item.reference===refundReference))throw new ProductError('conflict','This external refund reference is already recorded for this order.');const amount=body.amountPaise;if(!Number.isSafeInteger(amount)||(amount as number)<(old.loyalty?0:1)||BigInt(amount as number)+old.refunds.reduce((sum,item)=>sum+BigInt(item.amountPaise),0n)>BigInt(old.totalPaise))throw new ProductError('invalid','Refund exceeds the collected amount.');update.refunds=[...old.refunds,{...(old.loyalty?{loyaltyRefund:body.loyaltyRefund}:{}),amountPaise:amount,method:refundMethod,reference:refundReference,actor:uid,at:now()}];update.refundPaise=old.refunds.reduce((sum,item)=>sum+item.amountPaise,0)+(amount as number);history.action='Manual refund';
      }else throw new ProductError('invalid','Unsupported order action.');
      if(deliveryFields.some(field=>field in body)&&(!admin||(!orderStatuses.includes(command as never)&&command!=='delivery-details')))throw new ProductError('invalid','Delivery fields require a delivery update.');
      if('courier' in update){history.note=[note,...deliveryFields.filter(field=>(old[field]??null)!==(update[field]??null)).map(field=>`${field}: ${old[field]||'Not set'} → ${update[field]||'Cleared'}`)].filter(Boolean).join('\n');}
      if(old.history.length>=250)throw new ProductError('conflict','Order history requires owner archival before further changes.');
      const ids=restore?[...new Set(old.items.map(item=>item.productId))]:[],products=ids.length?await tx.getAll(...ids.map(id=>db.doc('products/'+id))):[];
      const inventories=new Map(products.map(doc=>{if(!doc.exists)throw new ProductError('conflict','A purchased product is missing; stock requires owner review.');return [doc.id,doc.data()!.inventory as ProductInput['inventory']];}));
      if(restore)for(const item of old.items)inventories.set(item.productId,changeStock(inventories.get(item.productId)!,item.variantId,item.quantity));
      const loyaltyChange=await loyalty.transition(tx,old,update,body.loyaltyRefund,body.amountPaise as number|undefined,op);if(loyaltyChange){update.loyalty=loyaltyChange.snapshot;loyaltyChange.commit();}
      for(const product of products){const inventory=inventories.get(product.id)!;tx.update(product.ref,{inventory,revision:product.data()!.revision+1,updatedAt:stamp()});tx.create(db.doc(`inventoryAudit/${id}_${op}_${product.id}`),{productId:product.id,orderId:id,actor:uid,reason:note,before:product.data()!.inventory,after:inventory,createdAt:stamp()});}
      update.history=[...old.history,history];tx.update(ref,update);tx.create(receipt,{hash,createdAt:stamp()});
      if(!admin)event(tx,id+'_'+op,'request','/admin/orders/'+id,'Customer '+command.slice(8)+' request');
      return projection({...old,...update,updatedAt:now()} as OrderRecord,admin);
    });
  }
  return {review,async customer(uid:string,email:string,body:Record<string,unknown>){switch(body.action){case 'orders:review':exact(body,['action','addressId','couponCode'],['source','points']);return db.runTransaction(async tx=>(await review(tx,uid,body.addressId===null?null:referenceId(body.addressId),body.couponCode,checkoutSource(body.source),body.points===undefined?0:body.points)).value);case 'orders:place':return place(uid,email,body);case 'orders:list':{const result=await list(uid,body);return body.view==='cards'?{...result,items:result.items.map(order=>historyProjection(order as OrderRecord))}:result;}case 'orders:get':return get(uid,body);case 'orders:request':return mutate(uid,body,false);case 'orders:recover':{exact(body,['action','operationId']);const id=digest([uid,referenceId(body.operationId)]).slice(0,32);const doc=await db.doc('orders/'+id).get();return {order:doc.exists?projection(present(doc),false):null};}default:throw new ProductError('invalid','Unsupported order operation.');}},async admin(uid:string,body:Record<string,unknown>){if(body.action==='dashboard:orders'){exact(body,['action','from','to'],['status']);dashboardBounds(body.from,body.to);const result=await list(uid,{...body,action:'adminOrders:list',pageSize:5},true);return {items:result.items.map(order=>({id:order.id,reference:order.reference,status:order.status,revision:order.revision,createdAt:order.createdAt,totalPaise:order.totalPaise,customerName:order.address?.recipientName||'Name not recorded',customerPhone:order.address?.mobileNumber||null})),updatedAt:Date.now()};}if(body.action==='adminOrders:list'){const result=await list(uid,body,true);return body.view==='summary'?{...result,items:result.items.map(orderListProjection)}:result;}if(body.action==='adminOrders:get')return get(uid,body,true);if(body.action==='adminOrders:update')return mutate(uid,body,true);throw new ProductError('invalid','Unsupported administrator order operation.');}};
}
