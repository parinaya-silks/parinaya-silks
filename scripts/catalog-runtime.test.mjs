// Optional packaging regression. Install the pinned builder in ignored storage:
// npm install --prefix .cache/vercel-runtime --no-save --ignore-scripts --no-audit --no-fund @vercel/node@24.0.3 @vercel/build-utils@14.21.3
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve,join,dirname} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url);
let build,FileFsRef;
try {
  ({build}=require('../.cache/vercel-runtime/node_modules/@vercel/node'));
  ({FileFsRef}=require('../.cache/vercel-runtime/node_modules/@vercel/build-utils'));
} catch {throw new Error('Install the optional pinned Vercel builder using the command at the top of scripts/catalog-runtime.test.mjs.');}
const root=resolve('.');
const result=await build({files:{'api/catalog.ts':new FileFsRef({fsPath:join(root,'api/catalog.ts')})},entrypoint:'api/catalog.ts',workPath:root,repoRootPath:root,meta:{skipDownload:true},considerBuildCommand:true,config:{projectSettings:{installCommand:'',buildCommand:'node -e ""'},maxDuration:30}});
const lambda=result.output;
assert.match(lambda.runtime,/^nodejs/);
const destination=resolve('.cache/catalog-function-regression');
for(const [path,file]of Object.entries(lambda.files)){
  const target=resolve(destination,path);
  if(!target.startsWith(destination+'\\')&&!target.startsWith(destination+'/'))throw new Error('Unsafe traced path.');
  await mkdir(dirname(target),{recursive:true});
  const chunks=[];
  await new Promise((done,fail)=>{const stream=file.toStream();stream.on('data',chunk=>chunks.push(Buffer.from(chunk)));stream.on('end',done);stream.on('error',fail);});
  await writeFile(target,Buffer.concat(chunks));
}
const probe=join(destination,'runtime-probe.mjs');
await writeFile(probe,`
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import handler from './api/catalog.js';
assert.equal(typeof handler,'function');
// Fail closed before any credentials, network or database can be used.
process.env.FIREBASE_PROJECT_ID='intentional-runtime-test-mismatch';
const diagnostics=[];console.error=entry=>diagnostics.push(JSON.parse(entry));
const server=createServer(handler).listen(0,'127.0.0.1');await once(server,'listening');
const url='http://127.0.0.1:'+server.address().port+'/api/catalog';
try {
  const request=authorized=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(authorized?{Authorization:'Bearer synthetic-runtime-token'}:{})},body:'{"action":"list"}'});
  let response=await request(false);assert.equal(response.status,401);assert.equal((await response.json()).code,'unauthorized');
  response=await request(true);assert.equal(response.status,503);assert.equal((await response.json()).code,'configuration');
  assert.equal(diagnostics[0].reason,process.argv[2]==='disabled'?'server-module-load':'firebase-project-mismatch');
  if(process.argv[2]==='enabled')assert.equal(typeof (await import('firebase-admin/auth')).getAuth,'function');
  else assert.ok(diagnostics[0].errors.some(error=>error.code==='ERR_REQUIRE_ESM'));
} finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
console.log('Packaged handler: '+process.argv[2]+' require(ESM), correct JSON status and safe initialization.');
`);
// Do not pass developer credentials or NODE_OPTIONS into the packaged probe.
const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>['PATH','SYSTEMROOT','TEMP','TMP','WINDIR'].includes(key.toUpperCase())));
for(const [mode,flag]of [['disabled','--no-experimental-require-module'],['enabled','--experimental-require-module']]){
  const child=spawnSync(process.execPath,[flag,probe,mode],{env,encoding:'utf8',timeout:30000});
  assert.equal(child.status,0,child.stderr||child.error?.message||'Packaged function failed.');
  process.stdout.write(child.stdout);
}
console.log('Vercel builder 24.0.3; '+lambda.runtime+' artifact; local Node '+process.versions.node+'. No tsx loader used for packaged invocation.');
