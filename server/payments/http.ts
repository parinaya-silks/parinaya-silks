import type {IncomingMessage,ServerResponse} from 'node:http';
import {createHash,timingSafeEqual,randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {ProductError} from '../../src/products/model.ts';
import {CatalogConfigurationError} from '../errors.ts';
import type {paymentService} from './service.ts';

const allowedOrigins=new Set(['https://parinayasarees.com','https://www.parinayasarees.com']);
export function paymentHandler(initialize:()=>ReturnType<typeof paymentService>|Promise<ReturnType<typeof paymentService>>,env:NodeJS.ProcessEnv=process.env){
 return async(req:IncomingMessage&{body?:unknown},res:ServerResponse)=>{
  const startedAt=Date.now(),requestId=randomUUID();res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Request-ID',requestId);
  try{
   const url=new URL(req.url||'/','https://www.parinayasarees.com'),action=url.pathname.split('/').at(-1)||'';
   if(!['capabilities','create-order','verify','webhook','status','resume','reconcile','worker'].includes(action)){res.statusCode=404;res.end(JSON.stringify({code:'not-found',message:'Not found.'}));return;}
   // Vercel dynamic routes append the matched file parameter to the URL.
   // Ignore only that redundant, exact path match; never accept a different action.
   if(url.searchParams.getAll('action').length===1&&url.searchParams.get('action')===action)url.searchParams.delete('action');
   const get=['status','capabilities'].includes(action);
   if(req.method!==(get?'GET':'POST')){res.statusCode=405;res.setHeader('Allow',get?'GET':'POST');res.end(JSON.stringify({code:'method',message:'Method not allowed.'}));return;}
   const local=env.PARINAYA_SERVER_EMULATORS==='true'||env.NODE_ENV!=='production'&&!env.VERCEL;
   if(!local&&req.headers['x-forwarded-proto']!=='https')throw new ProductError('permission','HTTPS is required.');
   if(action!=='webhook'&&action!=='worker'){
    const origin=req.headers.origin;
    if(origin&&!allowedOrigins.has(origin)&&!(local&&/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)))throw new ProductError('permission','This request origin is not permitted.');
    if(req.headers['sec-fetch-site']==='cross-site')throw new ProductError('permission','Cross-site payment requests are not permitted.');
    if(!req.headers.authorization?.match(/^Bearer [^\s]{1,8192}$/))throw new ProductError('unauthorized','Sign in again to continue.');
   }
   if(action==='worker'){
    const secret=env.PAYMENT_WORKER_SECRET||'',token=req.headers.authorization||'';
    const digest=(v:string)=>createHash('sha256').update(v).digest();
    if(secret.length<32||!timingSafeEqual(digest(token),digest('Bearer '+secret)))throw new ProductError('permission','Worker authorization required.');
   }
   let body:Record<string,unknown>={},raw=Buffer.alloc(0);
   if(get){if([...url.searchParams.keys()].some(k=>!['id','operationId'].includes(k))||url.searchParams.getAll('id').length>1||url.searchParams.getAll('operationId').length>1)throw new ProductError('invalid','Invalid payment query.');body=Object.fromEntries(url.searchParams);}
   else{
    if(url.search||!req.headers['content-type']?.startsWith('application/json'))throw new ProductError('invalid','JSON is required.');
    // The Web entrypoint bypasses Vercel's legacy body parser. Fail closed if an intermediary consumed the bytes.
    if(action==='webhook'&&req.body!==undefined&&!Buffer.isBuffer(req.body)&&typeof req.body!=='string')throw new ProductError('invalid','Original webhook body is required.');
    if(Buffer.isBuffer(req.body)||typeof req.body==='string')raw=Buffer.from(req.body);
    else if(req.body!==undefined)raw=Buffer.from(JSON.stringify(req.body));
    else {const chunks:Buffer[]=[];let size=0;for await(const chunk of req){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>65536)throw new ProductError('invalid','Request too large.');chunks.push(bytes);}raw=Buffer.concat(chunks);}
    if(raw.length>65536)throw new ProductError('invalid','Request too large.');
    if(action!=='webhook'){try{body=JSON.parse(raw.toString('utf8'));}catch{throw new ProductError('invalid','Invalid JSON.');}if(!body||typeof body!=='object'||Array.isArray(body))throw new ProductError('invalid','Invalid payment request.');}
   }
   let timer:ReturnType<typeof setTimeout>|undefined;
   const execute=async()=>{const service=await initialize();return action==='webhook'?service.webhook(raw,req.headers['x-razorpay-signature'],req.headers['x-razorpay-event-id']):action==='worker'?service.work():service.customer(req.headers.authorization!.slice(7),action,body);};
   let result;try{result=action==='webhook'?await Promise.race([execute(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new ProductError('unavailable','Webhook acceptance is pending.')),Math.max(1,4000-(Date.now()-startedAt)));})]):await execute();}finally{clearTimeout(timer);}
   res.statusCode=action==='webhook'?202:200;res.end(JSON.stringify(result));
  }catch(error){
   const code=error instanceof ProductError?error.code:error instanceof CatalogConfigurationError?'configuration':'internal',status=({unauthorized:401,permission:403,invalid:400,'not-found':404,conflict:409,'rate-limited':429,configuration:503,unavailable:503} as Record<string,number>)[code]||500;
   if(status>=500)console.error(JSON.stringify({event:'payment_failure',requestId,code}));
   res.statusCode=status;if(status===429)res.setHeader('Retry-After','60');res.end(JSON.stringify({code,message:status>=500?'We could not confirm this payment yet. Please do not pay again. Check payment status shortly.':error instanceof ProductError?error.message:'Payment request failed.',requestId}));
  }
 };
}

// Web-standard Vercel entrypoints bypass its legacy request.body helpers entirely.
// Forward the original stream; bounded raw-byte reading stays in paymentHandler.
export function paymentWebHandler(initialize:Parameters<typeof paymentHandler>[0],env:NodeJS.ProcessEnv=process.env){
 const handler=paymentHandler(initialize,env);
 return async(request:Request)=>{
  const req=Object.assign(request.body?Readable.fromWeb(request.body as any):Readable.from([]),{url:request.url,method:request.method,headers:Object.fromEntries(request.headers)}) as unknown as IncomingMessage;
  const headers=new Headers();let status=200,result='';
  const res={setHeader:(key:string,value:string)=>headers.set(key,value),get statusCode(){return status;},set statusCode(value:number){status=value;},end:(value:string)=>{result=value;}} as unknown as ServerResponse;
  await handler(req,res);return new Response(result,{status,headers});
 };
}
