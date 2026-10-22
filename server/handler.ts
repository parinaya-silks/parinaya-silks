import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { ProductError } from '../src/products/model.ts';
import type { catalogService } from './catalog.ts';
import { catalogDiagnostic, catalogFailure } from './diagnostics.ts';
type Service=ReturnType<typeof catalogService>;
export function catalogHandler(service:()=>Service|Promise<Service>, report:(diagnostic:ReturnType<typeof catalogDiagnostic>)=>void=diagnostic=>console.error(JSON.stringify(diagnostic))) {
  return async (request:IncomingMessage & {body?:unknown},response:ServerResponse) => {
    const requestId=randomUUID();
    let phase='request';
    let action:string|undefined;
    const initialize=async()=>{phase='initialization';const ready=await service();phase='operation';return ready;};
    response.setHeader('Cache-Control','private, no-store, max-age=0');
    response.setHeader('Content-Type','application/json; charset=utf-8');
    response.setHeader('X-Content-Type-Options','nosniff');
    response.setHeader('X-Request-ID',requestId);
    try {
      const url=new URL(request.url || '/api/catalog','http://catalog.local');
      let result;
      if(request.method==='GET') {
        const appearance=url.searchParams.get('appearance')==='login'&&[...url.searchParams.keys()].length===1;
        if(!appearance&&[...url.searchParams.keys()].some(key=>!['slug','cursor'].includes(key)))throw new ProductError('invalid','Unsupported catalog query.');
        action=url.searchParams.has('slug')?'get':'list';
        const ready=await initialize();
        result=appearance?await ready.publicAppearance():url.searchParams.has('slug') ? await ready.publicGet(url.searchParams.get('slug')) : await ready.publicList(url.searchParams.get('cursor'));
      } else if(request.method==='POST') {
        if(!request.headers['content-type']?.startsWith('application/json'))throw new ProductError('invalid','JSON is required.');
        const bearer=request.headers.authorization;
        if(!bearer || !/^Bearer [^\s]{1,8192}$/.test(bearer))throw new ProductError('unauthorized','Sign in again to continue.');
        let body=request.body;
        if(body===undefined){let raw='';for await(const chunk of request){raw+=chunk;if(Buffer.byteLength(raw)>100000)throw new ProductError('invalid','Request too large.');}try{body=JSON.parse(raw);}catch(error){if(error instanceof ProductError)throw error;throw new ProductError('invalid','Invalid JSON.');}}
        if(typeof body==='string') {try{body=JSON.parse(body);}catch{throw new ProductError('invalid','Invalid JSON.');}}
        if(!body || typeof body!=='object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body))>100000)throw new ProductError('invalid','Invalid catalog request.');
        const input=body as Record<string,unknown>;
        if(typeof input.action==='string' && ['list','get','save','sign','verify','delete','appearance:get','appearance:sign','appearance:verify','appearance:save','shopping:get','bag:add','bag:adjust','bag:remove','wishlist:set'].includes(input.action))action=input.action;
        result=await (await initialize()).privileged(bearer.slice(7),input);
      } else {response.setHeader('Allow','GET, POST');response.statusCode=405;response.end(JSON.stringify({code:'method',message:'Method not allowed.'}));return;}
      response.statusCode=200;response.end(JSON.stringify(result));
    } catch(error) {
      const failure=catalogFailure(error);
      if(failure.status>=500)report(catalogDiagnostic(error,requestId,phase,action));
      response.statusCode=failure.status;
      response.end(JSON.stringify({code:failure.code,message:failure.message,fields:failure.fields,...(failure.status>=500?{requestId}:{})}));
    }
  };
}
