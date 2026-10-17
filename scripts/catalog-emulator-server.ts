// Test-only Cloudinary REST fixture; never imported by api/ or normal dev server.
import {createServer} from 'node:http';
import {serverFirebase} from '../server/firebase.ts';
import {catalogService} from '../server/catalog.ts';
import {catalogHandler} from '../server/handler.ts';
import {cloudinaryMedia} from '../server/cloudinary.ts';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw new Error('Loopback emulators required.');
process.env.PARINAYA_SERVER_EMULATORS='true';
const uploaded=new Set<string>();
const media=cloudinaryMedia({CLOUDINARY_CLOUD_NAME:'parinaya-emulator',CLOUDINARY_API_KEY:'synthetic',CLOUDINARY_API_SECRET:'synthetic',CLOUDINARY_UPLOAD_PRESET:'synthetic'},async url=>{
  const publicId=decodeURIComponent(String(url).split('/resources/image/upload/')[1]);
  if(!uploaded.has(publicId))return new Response('{}',{status:404});
  return new Response(JSON.stringify({public_id:publicId,asset_id:'fixture-'+publicId,resource_type:'image',type:'upload',bytes:1000,width:300,height:400,format:'png',version:1,secure_url:`https://res.cloudinary.com/parinaya-emulator/image/upload/v1/${publicId}.png`}),{status:200});
});
const service=catalogService({...serverFirebase(),media});
const handler=catalogHandler(()=>service);
createServer(async(request,response)=>{
  if(request.url==='/test/upload'&&request.method==='POST') {
    let raw='';for await(const chunk of request)raw+=chunk;
    const value=JSON.parse(raw);if(typeof value.publicId==='string')uploaded.add(value.publicId);
    response.statusCode=200;response.end('{}');return;
  }
  void handler(request,response);
}).listen(3200,'127.0.0.1',()=>console.log('Emulator catalog API ready (Cloudinary is mocked).'));
