import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {blankContent} from '../src/content/model.ts';
import {catalogHandler} from '../server/handler.ts';
import {CatalogConfigurationError} from '../server/errors.ts';
import {ProductError} from '../src/products/model.ts';
import {catalogResponse,productLoadFailure} from '../src/products/response.ts';

test('handler distinguishes request, permission, configuration and internal failures without leaking diagnostics',async()=>{
  const diagnostics:unknown[]=[];
  let calls=0;
  let failure:unknown;
  const handler=catalogHandler(()=>{
    calls++;
    if(failure)throw failure;
    return {sitemap:async()=>'<urlset/>',publicBrowse:async()=>({items:[],nextCursor:null}),publicContent:async()=>({...blankContent(),banners:[],featuredProducts:[],featuredCategories:[]}),publicAppearance:async()=>({desktop:null,mobile:null}),publicList:async()=>({items:[],nextCursor:null}),publicGet:async()=>{throw new ProductError('not-found','Product not found.');},privileged:async()=>{throw new ProductError('permission','Active administrator permission is required.');}};
  },diagnostic=>diagnostics.push(diagnostic));
  const server=createServer(handler).listen(0,'127.0.0.1');
  await once(server,'listening');
  const url=`http://127.0.0.1:${(server.address() as {port:number}).port}/api/catalog`;
  const send=(body:string,authorized=true)=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(authorized?{Authorization:'Bearer synthetic-test-token'}:{})},body});
  try {
    let result=await send('{"action":"list"}',false);
    assert.equal(result.status,401);assert.equal((await result.json()).code,'unauthorized');assert.equal(calls,0);
    result=await send('[]');assert.equal(result.status,400);assert.equal(calls,0);
    result=await send('{');assert.equal(result.status,400);assert.equal(calls,0);
    result=await fetch(url,{method:'DELETE'});assert.equal(result.status,405);assert.equal(result.headers.get('allow'),'GET, POST');
    result=await send('{"action":"list"}');assert.equal(result.status,403);
    result=await fetch(url);assert.equal(result.status,200);assert.deepEqual(await result.json(),{items:[],nextCursor:null});
    result=await fetch(url+'?seo=sitemap');assert.equal(result.status,200);assert.match(result.headers.get('content-type')||'',/application\/xml/);assert.equal(await result.text(),'<urlset/>');
    result=await fetch(url+'?seo=sitemap&private=true');assert.equal(result.status,400);
    const privateDetail='synthetic-private-value';
    for(const [error,status,code]of [
      [new CatalogConfigurationError(privateDetail,'firebase-initialization',{cause:new Error(privateDetail)}),503,'configuration'],
      [Object.assign(new Error('The query requires an index '+privateDetail),{code:9}),503,'index-required'],
      [Object.assign(new Error(privateDetail),{code:14}),503,'unavailable'],
      [new Error(privateDetail),500,'internal'],
    ] as const){
      failure=error;result=await send('{"action":"list"}');
      assert.equal(result.status,status);
      const body=await result.json();assert.equal(body.code,code);
      assert.equal(body.requestId,result.headers.get('x-request-id'));
      assert.equal(JSON.stringify(body).includes(privateDetail),false);
    }
    assert.equal(diagnostics.length,4);
    assert.equal(JSON.stringify(diagnostics).includes(privateDetail),false);
    assert.equal(JSON.stringify(diagnostics).includes('synthetic-test-token'),false);
    assert.ok(JSON.stringify(diagnostics).includes('initialization'));
  } finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});

test('production catalog errors are concise, development guidance stays in development, and empty results remain valid',async()=>{
  for(const response of [new Response('FUNCTION_INVOCATION_FAILED',{status:500}),Response.json({code:'configuration',message:'Server-only setup detail'},{status:503})]){
    await assert.rejects(catalogResponse(response),{message:productLoadFailure});
  }
  await assert.rejects(catalogResponse(new Response('failed',{status:500}),true),/Start the local API server/);
  await assert.rejects(catalogResponse(Response.json({code:'permission',message:'Active administrator permission is required.'},{status:403})),{code:'permission',message:'Active administrator permission is required.'});
  await assert.rejects(catalogResponse(Response.json({code:'invalid',message:'Invalid product.',fields:{name:'Required'}},{status:400})),{code:'invalid',fields:{name:'Required'}});
  assert.deepEqual(await catalogResponse(Response.json({items:[],nextCursor:null})),{items:[],nextCursor:null});
});
