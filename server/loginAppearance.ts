import {createHash} from 'node:crypto';
import {FieldValue,type Firestore,type Transaction} from 'firebase-admin/firestore';
import {ProductError,MAX_IMAGE_BYTES} from '../src/products/model.ts';
import {emptyAppearance,loginImage,validateAppearance,type Appearance,type Device} from '../src/appearance/model.ts';
import type {CloudinaryMedia,MediaUploadTicket} from './cloudinary.ts';

interface LoginTicket extends MediaUploadTicket {purpose:'login-appearance'|'home-banner'|'about-founder';device:Device}
export function loginAppearanceService(db:Firestore,media:CloudinaryMedia,access:(tx:Transaction,uid:string)=>Promise<void>,scope:'login'|'home'|'about'='login'){
  const purpose=scope==='login'?'login-appearance':scope==='home'?'home-banner':'about-founder',registry=scope==='login'?'loginAppearanceMedia':scope==='home'?'homeBannerMedia':'aboutFounderMedia';
  const settings=db.doc(scope==='login'?'siteSettings/loginAppearance':'siteSettings/homeAppearance');
  const allowed=(body:Record<string,unknown>,fields:string[])=>{if(Object.keys(body).some(key=>!['action',...fields].includes(key)))throw new ProductError('invalid','Unsupported appearance fields.');};
  function identity(body:Record<string,unknown>){if(!['desktop','mobile'].includes(body.device as string)||typeof body.mediaId!=='string'||!/^[a-f0-9]{32}$/.test(body.mediaId))throw new ProductError('invalid','Choose a device and valid image upload.');return {device:body.device as Device,imageId:body.mediaId};}
  // Only the fields needed to render the customer portrait leave the server.
  async function get(){const data=(await settings.get()).data();if(data&&data.schemaVersion!==1)throw new ProductError('schema','Saved appearance needs owner review.');return data?{desktop:data.desktop??null,mobile:data.mobile??null,revision:data.revision}:emptyAppearance();}
  return {
    async publicGet(){const value=await get();const image=(device:Device)=>{const item=value[device];if(!item)return null;const {url,alt,focalX,focalY,width,height}=item;return {url,alt,focalX,focalY,width,height};};return {desktop:image('desktop'),mobile:image('mobile')};},
    get,
    async sign(uid:string,body:Record<string,unknown>){
      allowed(body,['device','mediaId','type','size']);const {device,imageId}=identity(body);
      if(!['image/jpeg','image/png','image/webp'].includes(body.type as string)||!Number.isSafeInteger(body.size)||(body.size as number)<=0||(body.size as number)>MAX_IMAGE_BYTES)throw new ProductError('invalid','Use JPEG, PNG or WebP up to 10 MiB.');
      const ticket:LoginTicket={purpose,device,uid,publicId:`parinaya-silks/${scope}/${device}/${imageId}`,timestamp:Math.floor(Date.now()/1000),verified:false};
      media.sign(ticket);
      await db.runTransaction(async tx=>{
        await access(tx,uid);const ref=db.doc(`${registry}/${imageId}`),previous=await tx.get(ref);
        const limit=db.doc(`catalogUploadLimits/${uid}_${new Date().toISOString().slice(0,10)}`),count=await tx.get(limit);
        if(previous.exists)throw new ProductError('media','Select a new upload attempt; existing media is never overwritten.');
        if((count.data()?.count||0)>=100)throw new ProductError('media','Daily upload allowance reached.');
        tx.set(limit,{count:(count.data()?.count||0)+1,updatedAt:FieldValue.serverTimestamp()});tx.create(ref,{...ticket,createdAt:FieldValue.serverTimestamp()});
      });return {...media.sign(ticket),mediaId:imageId};
    },
    async verify(uid:string,body:Record<string,unknown>){
      allowed(body,['device','mediaId']);const {device,imageId}=identity(body),ref=db.doc(`${registry}/${imageId}`),record=await ref.get(),ticket=record.data() as LoginTicket|undefined;
      if(!ticket||ticket.uid!==uid||ticket.device!==device||ticket.purpose!==purpose)throw new ProductError('permission','This image does not belong to this login upload.');
      if(ticket.verified)return loginImage({mediaId:imageId,alt:'',focalX:50,focalY:device==='mobile'?20:50},record.data()!.metadata);
      const metadata=await media.verify(ticket);
      await db.runTransaction(async tx=>{await access(tx,uid);const current=await tx.get(ref);if(current.data()?.publicId!==ticket.publicId)throw new ProductError('media','Upload changed.');tx.update(ref,{verified:true,metadata,verifiedAt:FieldValue.serverTimestamp()});});
      return loginImage({mediaId:imageId,alt:'',focalX:50,focalY:device==='mobile'?20:50},metadata);
    },
    async save(uid:string,body:Record<string,unknown>){
      allowed(body,['appearance','expectedRevision','operationId']);const input=validateAppearance(body.appearance);
      if(!Number.isSafeInteger(body.expectedRevision)||(body.expectedRevision as number)<0||typeof body.operationId!=='string'||!/^[a-f0-9]{32}$/.test(body.operationId))throw new ProductError('invalid','Invalid appearance save revision.');
      const hash=createHash('sha256').update(JSON.stringify(input)).digest('hex');
      await db.runTransaction(async tx=>{
        await access(tx,uid);const previous=await tx.get(settings),old=previous.data();
        if(old&&old.schemaVersion!==1)throw new ProductError('schema','Saved appearance needs owner review.');
        if(old&&old.lastOperationId===body.operationId){if(old.lastOperationHash!==hash)throw new ProductError('conflict','Save operation changed. Reload saved appearance.');return;}
        if((old?.revision||0)!==body.expectedRevision)throw new ProductError('conflict','Appearance changed in another session. Cancel to reload before saving.');
        const result:Appearance={...emptyAppearance(),revision:(old?.revision||0)+1};
        for(const device of ['desktop','mobile'] as const){const image=input[device];if(!image)continue;const record=await tx.get(db.doc(`${registry}/${image.mediaId}`)),asset=record.data();
          if(!asset||asset.verified!==true||asset.purpose!==purpose||asset.device!==device)throw new ProductError('media','Finish trusted verification for the correct login image before saving.');
          result[device]=loginImage(image,asset.metadata);
        }
        tx.set(settings,{...result,schemaVersion:1,lastOperationId:body.operationId,lastOperationHash:hash,updatedAt:FieldValue.serverTimestamp(),updatedBy:uid});
      });return get();
    },
  };
}
