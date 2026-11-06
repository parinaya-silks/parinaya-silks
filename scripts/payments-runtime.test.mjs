import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve,join,dirname} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url),{build}=require('../.cache/vercel-runtime/node_modules/@vercel/node'),{FileFsRef}=require('../.cache/vercel-runtime/node_modules/@vercel/build-utils');
const root=resolve('.'),entrypoint='api/payments/[action].ts';
const result=await build({files:{[entrypoint]:new FileFsRef({fsPath:join(root,entrypoint)})},entrypoint,workPath:root,repoRootPath:root,meta:{skipDownload:true},considerBuildCommand:true,config:{projectSettings:{installCommand:'',buildCommand:'node -e ""'},maxDuration:60}}),lambda=result.output;
assert.match(lambda.runtime,/^nodejs/);const destination=resolve('.cache/payments-function-regression');
for(const [path,file]of Object.entries(lambda.files)){const target=resolve(destination,path);if(!target.startsWith(destination+'\\')&&!target.startsWith(destination+'/'))throw Error('Unsafe traced path');await mkdir(dirname(target),{recursive:true});const chunks=[];await new Promise((done,fail)=>{const stream=file.toStream();stream.on('data',c=>chunks.push(Buffer.from(c)));stream.on('end',done);stream.on('error',fail);});await writeFile(target,Buffer.concat(chunks));}
const probe=join(destination,'payment-runtime-probe.mjs');
await writeFile(probe,`
import assert from 'node:assert/strict';import {createHmac,createHash} from 'node:crypto';
import {GET,POST} from './api/payments/[action].js';
assert.equal(typeof GET,'function');assert.equal(typeof POST,'function');
let r=await GET(new Request('https://www.parinayasarees.com/api/payments/status',{headers:{'x-forwarded-proto':'https'}}));assert.equal(r.status,401);
if(process.env.PAYMENT_RUNTIME_EMULATOR==='1'){
 process.env.PARINAYA_SERVER_EMULATORS='true';process.env.RAZORPAY_MODE='test';process.env.RAZORPAY_KEY_ID='rzp_test_fixture123456';process.env.RAZORPAY_KEY_SECRET='synthetic-secret-for-tests';process.env.RAZORPAY_WEBHOOK_SECRET='synthetic-webhook-for-tests';
 const raw='{ "event": "payment.captured", "payload": { "payment": {"entity":{"id":"pay_Runtime","order_id":"order_Runtime"}}}}\\n',id='runtime-raw-byte-fixture';
 const sig=createHmac('sha256',process.env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex');
 const request=body=>new Request('http://127.0.0.1/api/payments/webhook?action=webhook',{method:'POST',headers:{'content-type':'application/json','x-razorpay-signature':sig,'x-razorpay-event-id':id},body});
 r=await POST(request(raw));assert.equal(r.status,202);assert.equal((await r.json()).accepted,true);
 r=await POST(request(JSON.stringify(JSON.parse(raw))));assert.equal(r.status,403);
 const {serverFirebase}=await import('./server/firebase.js'),ref=serverFirebase().database.doc('paymentEvents/'+createHash('sha256').update(id).digest('hex'));
 const doc=await ref.get();assert.equal(doc.data().bodyHash,createHash('sha256').update(raw).digest('hex'));assert.equal(doc.data().processing,'accepted');await ref.delete();await serverFirebase().database.terminate();
 console.log('Packaged Web exports: original-byte HMAC accepted; reconstructed JSON rejected; durable acceptance verified in loopback Firestore.');
}else{
 process.env.FIREBASE_PROJECT_ID='intentional-runtime-test-mismatch';
 r=await POST(new Request('https://www.parinayasarees.com/api/payments/create-order',{method:'POST',headers:{'x-forwarded-proto':'https',Authorization:'Bearer synthetic','content-type':'application/json'},body:'{}'}));assert.equal(r.status,503);
 console.log('Packaged Web exports: signed-out rejection and configuration failure fail closed.');
}
`);
const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>['PATH','SYSTEMROOT','TEMP','TMP','WINDIR'].includes(key.toUpperCase())));
if(process.env.PAYMENT_RUNTIME_EMULATOR==='1'){assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8080');assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST,'127.0.0.1:9099');Object.assign(env,{PAYMENT_RUNTIME_EMULATOR:'1',METADATA_SERVER_DETECTION:'none',GCLOUD_PROJECT:'parinaya-silks',GOOGLE_CLOUD_PROJECT:'parinaya-silks',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099'});}
const child=spawnSync(process.execPath,['--experimental-require-module',probe],{env,encoding:'utf8',timeout:45000});assert.equal(child.status,0,child.stderr||child.error?.message||'Packaged payment function failed');process.stdout.write(child.stdout);
console.log('Pinned Vercel builder 24.0.3; '+lambda.runtime+' artifact; local Node '+process.versions.node+'; no tsx runtime loader.');
