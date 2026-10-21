import { createHash } from 'node:crypto';
import { MAX_IMAGE_BYTES, ProductError, type ProductImage } from '../src/products/model.ts';

export interface MediaUploadTicket {publicId:string;uid:string;timestamp:number;verified:boolean}
export interface UploadTicket extends MediaUploadTicket {productId:string}
export interface CloudinaryMedia { sign(ticket:MediaUploadTicket):Record<string,string|number>; verify(ticket:MediaUploadTicket):Promise<Omit<ProductImage,'mediaId'|'alt'>> }
export function cloudinaryMedia(environment=process.env, request:typeof fetch=fetch):CloudinaryMedia {
  const config=()=>{ const cloud=environment.CLOUDINARY_CLOUD_NAME,key=environment.CLOUDINARY_API_KEY,secret=environment.CLOUDINARY_API_SECRET,preset=environment.CLOUDINARY_UPLOAD_PRESET;if(!cloud || !/^[a-zA-Z0-9_-]+$/.test(cloud) || !key || !secret || !preset) throw new ProductError('configuration','Product image uploads are not configured. Contact the store owner.');return {cloud,key,secret,preset}; };
  return {
    sign(ticket) {
      const {cloud,key,secret,preset}=config();
      const params={allowed_formats:'jpg,png,webp',overwrite:'false',public_id:ticket.publicId,timestamp:String(ticket.timestamp),upload_preset:preset};
      const canonical=Object.entries(params).sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>`${key}=${value}`).join('&');
      return {...params,signature:createHash('sha1').update(canonical+secret).digest('hex'),api_key:key,uploadUrl:`https://api.cloudinary.com/v1_1/${cloud}/image/upload`};
    },
    async verify(ticket) {
      const {cloud,key,secret}=config();
      let response:Response;
      try { response=await request(`https://api.cloudinary.com/v1_1/${cloud}/resources/image/upload/${encodeURIComponent(ticket.publicId)}`,{headers:{Authorization:`Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`},signal:AbortSignal.timeout(12000)}); }
      catch { throw new ProductError('media','Image verification failed. Retry verification without uploading again.'); }
      if(!response.ok) throw new ProductError('media','The uploaded image could not be verified. Retry verification.');
      const data=await response.json();
      if(data.resource_type!=='image' || data.type!=='upload' || data.public_id!==ticket.publicId || typeof data.asset_id!=='string' || !data.asset_id || !['jpg','png','webp'].includes(data.format) || !Number.isSafeInteger(data.bytes) || data.bytes<=0 || data.bytes>MAX_IMAGE_BYTES || !Number.isSafeInteger(data.width) || data.width<1 || data.width>20000 || !Number.isSafeInteger(data.height) || data.height<1 || data.height>20000 || (data.pages && data.pages>1) || !Number.isSafeInteger(data.version) || data.version<1 || typeof data.secure_url!=='string' || !data.secure_url.startsWith(`https://res.cloudinary.com/${cloud}/image/upload/`)) throw new ProductError('media','Uploaded asset does not meet the image requirements.');
      return {assetId:data.asset_id,publicId:data.public_id,url:data.secure_url,width:data.width,height:data.height,bytes:data.bytes,format:data.format,version:data.version};
    },
  };
}
