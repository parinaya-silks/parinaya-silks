import {savedTheme,themeInput} from '../src/appearance/theme.ts';
import {bannerSeconds,validateBannerTiming} from '../src/content/bannerTiming.ts';
import {savedLoyalty,validateLoyalty} from '../src/loyalty/model.ts';
import {createHash} from 'node:crypto';
import {FieldValue,type Firestore,type Transaction} from 'firebase-admin/firestore';
import {exact,referenceId} from '../src/orders/model.ts';
import {ProductError} from '../src/products/model.ts';
import {savedShipping,validateShipping} from '../src/shipping/model.ts';
import {emptyAppearance,validateAppearance,loginImage,type Appearance} from '../src/appearance/model.ts';

export function storeSettingsService(db:Firestore,access:(tx:Transaction,uid:string)=>Promise<void>){
 const shippingRef=db.doc('siteSettings/shipping'),appearanceRef=db.doc('siteSettings/loginAppearance'),loyaltyRef=db.doc('siteSettings/loyalty'),bannerRef=db.doc('siteSettings/homepageBanners'),themeRef=db.doc('siteSettings/storefrontAppearance');
 async function get(){const [s,a,l,b,t]=await db.getAll(shippingRef,appearanceRef,loyaltyRef,bannerRef,themeRef),shipping=s.data(),image=a.data();if(image&&image.schemaVersion!==1)throw new ProductError('schema','Saved login appearance needs owner review.');return {storefrontAppearance:savedTheme(t.data()),homepageBanners:{seconds:bannerSeconds(b.data()?.seconds),revision:b.data()?.revision??0},loyalty:savedLoyalty(l.data()),shipping:savedShipping(shipping),appearance:image?{desktop:image.desktop??null,mobile:image.mobile??null,revision:image.revision} as Appearance:emptyAppearance(),updatedAt:{shipping:shipping?.updatedAt?.toMillis?.()??null,appearance:image?.updatedAt?.toMillis?.()??null},capabilities:{cod:'supported',online:'not-supported',maintenance:'not-supported'}};}
 return {get,async save(uid:string,body:Record<string,unknown>){
  exact(body,['action','shipping','appearance','expectedShippingRevision','expectedAppearanceRevision','operationId'],['loyalty','expectedLoyaltyRevision','homepageBanners','expectedBannerRevision','storefrontAppearance','expectedStorefrontAppearanceRevision']);
  const shipping=body.shipping===null?null:validateShipping(body.shipping),appearance=body.appearance===null?null:validateAppearance(body.appearance),operationId=referenceId(body.operationId);
  const loyalty=body.loyalty==null?null:validateLoyalty(body.loyalty);if(loyalty&&(!Number.isSafeInteger(body.expectedLoyaltyRevision)||(body.expectedLoyaltyRevision as number)<0||(body.expectedLoyaltyRevision as number)>=1e9))throw new ProductError('invalid','Invalid loyalty revision.');
  const homepageBanners=body.homepageBanners==null?null:validateBannerTiming(body.homepageBanners);if(homepageBanners&&(!Number.isSafeInteger(body.expectedBannerRevision)||(body.expectedBannerRevision as number)<0||(body.expectedBannerRevision as number)>=1e9))throw new ProductError('invalid','Invalid banner settings revision.');
  const theme=body.storefrontAppearance==null?null:themeInput(body.storefrontAppearance);if(theme&&(!Number.isSafeInteger(body.expectedStorefrontAppearanceRevision)||(body.expectedStorefrontAppearanceRevision as number)<0||(body.expectedStorefrontAppearanceRevision as number)>=1e9))throw new ProductError('invalid','Invalid appearance revision.');
  if(!shipping&&!appearance&&!loyalty&&!homepageBanners&&!theme)throw new ProductError('invalid','No settings changes supplied.');
  for(const key of ['expectedShippingRevision','expectedAppearanceRevision'])if(!Number.isSafeInteger(body[key])||(body[key] as number)<0||(body[key] as number)>=1_000_000_000)throw new ProductError('invalid','Invalid store settings revision.');
  const hash=createHash('sha256').update(JSON.stringify({shipping,appearance,...(theme?{theme}:{}),...(loyalty?{loyalty}:{}),...(homepageBanners?{homepageBanners}:{})})).digest('hex');
  await db.runTransaction(async tx=>{await access(tx,uid);const [s,a,l,b,t]=await tx.getAll(shippingRef,appearanceRef,loyaltyRef,bannerRef,themeRef),oldT=t.data(),oldS=s.data(),oldA=a.data(),oldL=l.data(),oldB=b.data(),changed=[...(theme?[oldT]:[]),...(shipping?[oldS]:[]),...(appearance?[oldA]:[]),...(loyalty?[oldL]:[]),...(homepageBanners?[oldB]:[])];
   const retries=changed.filter(v=>v?.storeSettingsOperation?.id===operationId);
   if(retries.length){if(retries.length!==changed.length||retries.some(v=>v!.storeSettingsOperation.hash!==hash||v!.storeSettingsOperation.actor!==uid))throw new ProductError('conflict','Store settings operation changed. Review the saved version.');return;}
   if(oldS&&(!Number.isSafeInteger(oldS.revision)||oldS.revision<1||oldS.schemaVersion!==1)||oldA&&(!Number.isSafeInteger(oldA.revision)||oldA.revision<1||oldA.schemaVersion!==1))throw new ProductError('schema','Saved settings need trusted owner review.');
   if(theme&&savedTheme(oldT).revision!==body.expectedStorefrontAppearanceRevision)throw new ProductError('conflict','Storefront theme changed. Reload the saved theme before trying again.');
   if(loyalty)savedLoyalty(oldL);
   if(homepageBanners&&(oldB?.revision??0)!==body.expectedBannerRevision)throw new ProductError('conflict','Homepage banner settings changed. Review the latest saved version.');
   if(loyalty&&(oldL?.revision??0)!==body.expectedLoyaltyRevision)throw new ProductError('conflict','Loyalty settings changed. Review the latest saved version.');
   if((oldS?.revision??0)!==body.expectedShippingRevision||(oldA?.revision??0)!==body.expectedAppearanceRevision)throw new ProductError('conflict','Store settings changed in another session. Your entries are kept; review the latest saved version.');
   const resolved:Appearance={...emptyAppearance(),revision:(oldA?.revision??0)+1};
   if(appearance)for(const device of ['desktop','mobile'] as const){const image=appearance[device];if(!image)continue;const asset=(await tx.get(db.doc('loginAppearanceMedia/'+image.mediaId))).data();if(!asset||asset.verified!==true||asset.purpose!=='login-appearance'||asset.device!==device||(asset.uid!==uid&&oldA?.[device]?.mediaId!==image.mediaId))throw new ProductError('media','Use verified login images for the correct device owned by this administrator or already saved.');resolved[device]=loginImage(image,asset.metadata);}
   const metadata={schemaVersion:1,updatedAt:FieldValue.serverTimestamp(),updatedBy:uid,storeSettingsOperation:{id:operationId,hash,actor:uid}};
   if(theme)tx.set(themeRef,{...theme,...metadata,revision:(oldT?.revision??0)+1},{merge:true});
   if(shipping){const revision=(oldS?.revision??0)+1;tx.set(shippingRef,{...shipping,...metadata,revision},{merge:true});tx.set(db.doc('siteSettings/shippingRevision'),{revision},{merge:true});}
   if(appearance)tx.set(appearanceRef,{...resolved,...metadata},{merge:true});
   if(homepageBanners)tx.set(bannerRef,{...homepageBanners,...metadata,revision:(oldB?.revision??0)+1},{merge:true});
   if(loyalty)tx.set(loyaltyRef,{config:loyalty,revision:(oldL?.revision??0)+1,...metadata},{merge:true});
  });return get();
 }};
}
