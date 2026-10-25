import {storedAbout,publicAbout} from '../src/about/model.ts';
import {publicContact} from '../src/contact/model.ts';
import {publicWebsiteText} from '../src/content/sections.ts';
import {campaignDestination} from '../src/campaigns/model.ts';
import {createHash} from 'node:crypto';
import {FieldValue,type Firestore,type Transaction} from 'firebase-admin/firestore';
import {ProductError,type PublicProductRecord} from '../src/products/model.ts';
import {blankContent,validateContent,validateBanner,bannerStatus,publicBanner,bannerInput,type Banner,type BannerInput,type StoreContent} from '../src/content/model.ts';
import {loginImage} from '../src/appearance/model.ts';
import {referenceId,exact} from '../src/orders/model.ts';
export function contentService(db:Firestore,access:(tx:Transaction,uid:string)=>Promise<void>,project:(doc:FirebaseFirestore.DocumentSnapshot,name?:string)=>Promise<PublicProductRecord>,campaignLive?:(slug:string)=>Promise<boolean>,clock:()=>number=Date.now){
 const ref=db.doc('siteSettings/storeContent');
 async function destination(b:BannerInput,window=false):Promise<string|null>{
  if(b.showButton===false||!b.link)return null;
  const campaign=campaignDestination(b.link);
  if(campaign){
   if(!window&&campaignLive)return await campaignLive(campaign)?null:'Campaign is not live.';
   const reserved=(await db.doc('campaignSlugs/'+campaign).get()).data();if(!reserved)return 'Campaign does not exist.';
   const c=(await db.doc('campaigns/'+reserved.campaignId).get()).data();
   if(!c||c.schemaVersion!==1||c.slug!==campaign||c.intent!=='published')return 'Campaign is not published.';
   const start=Math.max(clock(),b.startsAt??0),end=b.endsAt??Infinity;
   if(c.endsAt!=null&&(start>=c.endsAt||end>c.endsAt))return 'Banner must end within the campaign availability window.';
   if(c.startsAt!=null&&start<c.startsAt)return 'Banner must start when the campaign is available.';
   return null;
  }
  let path=b.link;try{const url=new URL(path);if(url.origin==='https://parinayasilks.vercel.app')path=url.pathname;else return null;}catch{}
  if(path==='/shop'||path==='/sale'||path==='/collections')return null;
  const match=/^\/(collections|product)\/([a-z0-9-]+)$/.exec(path);if(!match)return 'Destination is not an implemented storefront route.';
  const docs=await db.collection(match[1]==='product'?'products':'categories').where('slug','==',match[2]).limit(2).get();if(docs.size!==1)return 'Destination is missing or ambiguous.';
  const data=docs.docs[0].data();if(match[1]==='collections')return data.enabled===true?null:'Category is disabled.';
  if(data.status!=='Published'||(await db.doc('categories/'+data.categoryId).get()).data()?.enabled!==true)return 'Product is not publicly available.';return null;
 }
 async function resolveImages(banner:BannerInput,tx?:Transaction):Promise<Banner>{
  const images={desktop:null,mobile:null,revision:0} as Banner['images'];
  for(const device of ['desktop','mobile'] as const){const image=banner.images[device];if(!image)continue;const mediaRef=db.doc('homeBannerMedia/'+image.mediaId),asset=(await (tx?tx.get(mediaRef):mediaRef.get())).data();if(!asset||asset.verified!==true||asset.purpose!=='home-banner'||asset.device!==device)throw new ProductError('media','Verify each homepage image for the correct device before saving.');images[device]=loginImage(image,asset.metadata);}
  if(banner.enabled&&!images.desktop&&!images.mobile)throw new ProductError('invalid','A visible banner needs a verified image.');return {...banner,images};
 }
 async function bannersAdmin(){const value=await get();return {revision:value.revision,banners:value.banners,serverNow:clock(),issues:Object.fromEntries(await Promise.all(value.banners.map(async b=>[b.id,await destination(b,true)])))};}
 async function saveBanners(uid:string,body:Record<string,unknown>){
  exact(body,['action','banners','expectedRevision','operationId']);if(!Array.isArray(body.banners)||body.banners.length>6)throw new ProductError('invalid','Use up to six homepage banners.');
  const input=body.banners.map(validateBanner);if(new Set(input.map(b=>b.id)).size!==input.length)throw new ProductError('invalid','Use distinct banner IDs.');
  const operation=referenceId(body.operationId),hash=createHash('sha256').update(JSON.stringify(input)).digest('hex');if(!Number.isSafeInteger(body.expectedRevision)||(body.expectedRevision as number)<0)throw new ProductError('invalid','Invalid content revision.');
  await db.runTransaction(async tx=>{await access(tx,uid);const old=(await tx.get(ref)).data();if(old?.bannerOperationId===operation){if(old.bannerHash!==hash||old.bannerActor!==uid)throw new ProductError('conflict','Operation already used.');return;}
   if((old?.revision||0)!==body.expectedRevision)throw new ProductError('conflict','Website content changed. Your edits are kept. Reload the latest saved list before retrying.');
   const banners:Banner[]=[];for(const b of input){
    if(b.link&&!b.link.startsWith('/')&&!campaignDestination(b.link)&&!old?.banners?.some((v:Banner)=>v.id===b.id&&v.link===b.link))throw new ProductError('invalid','Choose an implemented storefront destination.');
    if(b.enabled){const issue=await destination(b,true);if(issue)throw new ProductError('invalid',issue);if(b.link&&!b.link.startsWith('/')&&!campaignDestination(b.link)&&!old?.banners?.some((v:Banner)=>v.id===b.id&&v.link===b.link))throw new ProductError('invalid','Choose an implemented storefront destination.');}
    banners.push(await resolveImages(b,tx));
   }
   tx.set(ref,{...(old?{}:blankContent()),banners,revision:(old?.revision||0)+1,bannerOperationId:operation,bannerHash:hash,bannerActor:uid,schemaVersion:1,updatedAt:FieldValue.serverTimestamp(),updatedBy:uid},{merge:true});
  });return bannersAdmin();
 }

 async function get(snapshot?:FirebaseFirestore.DocumentSnapshot){const doc=snapshot??await ref.get();if(!doc.exists)return blankContent();const data=doc.data()!,defaults=blankContent();const {revision,banners,featuredProductIds,featuredCategoryIds,contact,policies,returnsEnabled,returnKinds}={...defaults,...data,policies:{...defaults.policies,...data.policies},contact:{...defaults.contact,...data.contact}};return {revision,banners,featuredProductIds,featuredCategoryIds,contact:Object.fromEntries(['email','mobile','address','instagram'].map(key=>[key,contact[key]])),policies:Object.fromEntries(['shipping','returns','privacy','terms'].map(key=>[key,{text:policies[key].text,approved:policies[key].approved,...(policies[key].heading===undefined?{}:{heading:policies[key].heading})}])),returnsEnabled,returnKinds} as StoreContent;}
 return {get,bannersAdmin,saveBanners,async preview(uid:string,body:Record<string,unknown>){exact(body,['action','banners']);if(!Array.isArray(body.banners)||body.banners.length>6)throw new ProductError('invalid','Invalid preview.');const banners=[];for(const b of body.banners.map(validateBanner))banners.push(publicBanner(await resolveImages({...b,enabled:false})));return {banners};},async publicGet(){const snapshot=await ref.get(),content=await get(snapshot),textSections=publicWebsiteText(snapshot.data()??{});const featuredProducts:PublicProductRecord[]=[],featuredCategories:{id:string;name:string;slug:string}[]=[];for(const id of content.featuredProductIds){const doc=await db.doc('products/'+id).get(),raw=doc.data();if(raw?.status!=='Published')continue;const category=(await db.doc('categories/'+raw.categoryId).get()).data();if(category?.enabled===true)featuredProducts.push(await project(doc,category.name));}for(const id of content.featuredCategoryIds){const data=(await db.doc('categories/'+id).get()).data();if(data?.enabled===true)featuredCategories.push({id,name:data.name,slug:data.slug});}const visibleBanners=[];for(const banner of content.banners){if(bannerStatus(banner,clock())!=='Live'||await destination(banner))continue;visibleBanners.push(banner);}const nextBoundary=Math.min(...content.banners.flatMap(b=>[b.startsAt,b.endsAt]).filter((n):n is number=>typeof n==='number'&&n>clock()));return {about:publicAbout(storedAbout(snapshot.data()?.about)),aboutSaved:snapshot.data()?.about!==undefined,textSections,serverNow:clock(),nextBoundary:Number.isFinite(nextBoundary)?nextBoundary:null,featuredProducts,featuredCategories,banners:visibleBanners.map(publicBanner),featuredProductIds:featuredProducts.map(item=>item.id),featuredCategoryIds:featuredCategories.map(item=>item.id),contact:publicContact(snapshot.data()?.contact),policies:Object.fromEntries(Object.entries(content.policies).map(([key,value])=>[key,{text:value.approved?value.text:'',approved:value.approved,...(value.approved&&value.heading!==undefined?{heading:value.heading}:{})}])),returnsEnabled:content.returnsEnabled,returnKinds:content.returnsEnabled?content.returnKinds:[]};},async save(uid:string,body:Record<string,unknown>){
  exact(body,['action','content','expectedRevision','operationId']);const input=validateContent(body.content),operation=referenceId(body.operationId),hash=createHash('sha256').update(JSON.stringify(input)).digest('hex');if(!Number.isSafeInteger(body.expectedRevision)||(body.expectedRevision as number)<0)throw new ProductError('invalid','Invalid content revision.');
  await db.runTransaction(async tx=>{await access(tx,uid);const old=(await tx.get(ref)).data();if(old?.operationId===operation){if(old.hash!==hash)throw new ProductError('conflict','Operation already used.');return;}if((old?.revision||0)!==body.expectedRevision)throw new ProductError('conflict','Store content changed. Cancel to reload before saving.');
   const banners:StoreContent['banners']=[];for(const banner of input.banners){
    const previous=old?.banners?.find((b:Banner)=>b.id===banner.id);
    if(previous&&JSON.stringify(validateBanner(bannerInput(previous)))===JSON.stringify(banner)){banners.push(previous);continue;}
    if(banner.enabled){const issue=await destination(banner,true);if(issue)throw new ProductError('invalid',issue);}
    banners.push(await resolveImages(banner,tx));
   }
   for(const id of input.featuredProductIds){const product=(await tx.get(db.doc('products/'+id))).data();if(!product||product.status!=='Published'||(await tx.get(db.doc('categories/'+product.categoryId))).data()?.enabled!==true)throw new ProductError('invalid','Featured products must be currently published in enabled categories.');}for(const id of input.featuredCategoryIds)if((await tx.get(db.doc('categories/'+id))).data()?.enabled!==true)throw new ProductError('invalid','Featured categories must be enabled.');
   tx.set(ref,{...input,banners,revision:(old?.revision||0)+1,operationId:operation,hash,schemaVersion:1,updatedAt:FieldValue.serverTimestamp(),updatedBy:uid},{merge:true});if(!old||input.returnsEnabled!==old.returnsEnabled||JSON.stringify(input.returnKinds)!==JSON.stringify(old.returnKinds)||input.policies.returns.approved!==old.policies?.returns?.approved||input.policies.returns.text!==old.policies?.returns?.text)tx.set(db.doc('siteSettings/returns'),{enabled:input.returnsEnabled,approved:input.policies.returns.approved,approvedText:input.policies.returns.approved?input.policies.returns.text:'',allowedKinds:input.returnKinds,revision:(old?.revision||0)+1,updatedAt:FieldValue.serverTimestamp(),updatedBy:uid});
  });return get();
 }};
}
