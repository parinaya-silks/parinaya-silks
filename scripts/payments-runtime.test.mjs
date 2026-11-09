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
process.env.VERCEL_ENV='preview';process.env.RAZORPAY_MODE='live';process.env.RAZORPAY_LIVE_ACTIVATED='true';
for(const action of ['create-order','verify','worker','webhook']){
 r=await POST(new Request('https://www.parinayasarees.com/api/payments/'+action,{method:'POST',headers:{'x-forwarded-proto':'https',Authorization:'Bearer synthetic','content-type':'application/json'},body:'{}'}));assert.equal(r.status,403);assert.equal((await r.json()).code,'permission');
}
delete process.env.VERCEL_ENV;delete process.env.RAZORPAY_MODE;delete process.env.RAZORPAY_LIVE_ACTIVATED;
if(process.env.PAYMENT_RUNTIME_EMULATOR==='1'){
 process.env.PARINAYA_SERVER_EMULATORS='true';process.env.RAZORPAY_MODE='test';process.env.RAZORPAY_KEY_ID='rzp_test_fixture123456';process.env.RAZORPAY_KEY_SECRET='synthetic-secret-for-tests';process.env.RAZORPAY_WEBHOOK_SECRET='synthetic-webhook-for-tests';
 const raw='{ "event": "payment.captured", "payload": { "payment": {"entity":{"id":"pay_Runtime","order_id":"order_Runtime"}}}}\\n',id='runtime-raw-byte-fixture';
 const sig=createHmac('sha256',process.env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex');
 const request=body=>new Request('http://127.0.0.1/api/payments/webhook?action=webhook',{method:'POST',headers:{'content-type':'application/json','x-razorpay-signature':sig,'x-razorpay-event-id':id},body});
 // Cold local gRPC initialization may outlast the unchanged four-second
 // acceptance budget. A provider retries the SAME signed bytes/event ID;
 // verify eventual durable acceptance rather than treating pending as success.
 const {serverFirebase}=await import('./server/firebase.js'),db=serverFirebase().database,ref=db.doc('paymentEvents/'+createHash('sha256').update(id).digest('hex'));
 r=await POST(request(raw));let body=await r.json();
 if(r.status===503){
  assert.equal(body.code,'unavailable');assert.equal(body.accepted,undefined);
  // Acceptance continues after the HTTP deadline. Observe that exact durable
  // event before replaying; overlapping cold transactions would make teardown
  // terminate a client still being used by the first request.
  const deadline=Date.now()+25000;let accepted=false;
  do{const pending=await ref.get();if(pending.exists&&pending.get('processing')==='accepted'){accepted=true;break;}await new Promise(resolve=>setTimeout(resolve,100));}while(Date.now()<deadline);
  assert.equal(accepted,true,'Pending original-byte acceptance must finish durably.');
  r=await POST(request(raw));body=await r.json();
  console.log('Cold acceptance pending; durable event observed and identical signed retry accepted.');
 }
 assert.equal(r.status,202);assert.equal(body.accepted,true);
 r=await POST(request(JSON.stringify(JSON.parse(raw))));assert.equal(r.status,403);
 const doc=await ref.get();assert.equal(doc.data().bodyHash,createHash('sha256').update(raw).digest('hex'));assert.equal(doc.data().processing,'accepted');await ref.delete();await db.terminate();
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
