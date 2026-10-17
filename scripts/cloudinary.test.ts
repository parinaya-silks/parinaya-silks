import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cloudinaryMedia } from '../server/cloudinary.ts';
const environment={CLOUDINARY_CLOUD_NAME:'parinaya-emulator',CLOUDINARY_API_KEY:'synthetic-key',CLOUDINARY_API_SECRET:'synthetic-secret',CLOUDINARY_UPLOAD_PRESET:'restricted-test'};
const ticket={productId:'p'.repeat(20),publicId:'parinaya-silks/products/'+ 'p'.repeat(20)+'/a'.repeat(1),uid:'synthetic',timestamp:1234,verified:false};
const asset={asset_id:'trusted-id',public_id:ticket.publicId,resource_type:'image',type:'upload',format:'jpg',width:100,height:200,bytes:1000,version:1,secure_url:'https://res.cloudinary.com/parinaya-emulator/image/upload/v1/test.jpg'};
test('Cloudinary uses a fixed, non-overwriting signed image destination; secrets stay server-side',()=>{
  const signed=cloudinaryMedia(environment).sign(ticket);
  assert.equal(signed.overwrite,'false');assert.equal(signed.allowed_formats,'jpg,png,webp');assert.equal(signed.public_id,ticket.publicId);
  const canonical=`allowed_formats=jpg,png,webp&overwrite=false&public_id=${ticket.publicId}&timestamp=1234&upload_preset=restricted-test`;
  assert.equal(signed.signature,createHash('sha1').update(canonical+environment.CLOUDINARY_API_SECRET).digest('hex'));
  assert.ok(!JSON.stringify(signed).includes(environment.CLOUDINARY_API_SECRET));
  assert.throws(()=>cloudinaryMedia({}).sign(ticket));
});
test('trusted Cloudinary metadata lookup rejects forged, unsafe and oversized assets',async()=>{
  let fixture={...asset};let call='';
  const media=cloudinaryMedia(environment,async(url,options)=>{call=String(url);assert.ok(options?.headers);return new Response(JSON.stringify(fixture),{status:200});});
  const result=await media.verify(ticket);assert.equal(result.assetId,'trusted-id');assert.ok(call.includes('/resources/image/upload/'));
  for(const invalid of [{public_id:'another-product'},{resource_type:'video'},{bytes:10485761},{format:'svg'},{width:0},{version:0},{pages:2},{secure_url:'https://evil.example/file.jpg'}]){fixture={...asset,...invalid};await assert.rejects(media.verify(ticket));}
  await assert.rejects(cloudinaryMedia(environment,async()=>{throw new Error('network');}).verify(ticket));
});
