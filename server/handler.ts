import type { IncomingMessage, ServerResponse } from 'node:http';
import { ProductError } from '../src/products/model.ts';
import { catalogService } from './catalog.ts';
type Service=ReturnType<typeof catalogService>;
export function catalogHandler(service:()=>Service) {
  return async (request:IncomingMessage & {body?:unknown},response:ServerResponse) => {
    response.setHeader('Cache-Control','private, no-store, max-age=0');
    response.setHeader('Content-Type','application/json; charset=utf-8');
    response.setHeader('X-Content-Type-Options','nosniff');
    try {
      const url=new URL(request.url || '/api/catalog','http://catalog.local');
      let result;
      if(request.method==='GET') {
        if([...url.searchParams.keys()].some(key=>!['slug','cursor'].includes(key)))throw new ProductError('invalid','Unsupported catalog query.');
        result=url.searchParams.has('slug') ? await service().publicGet(url.searchParams.get('slug')) : await service().publicList(url.searchParams.get('cursor'));
      } else if(request.method==='POST') {
        if(!request.headers['content-type']?.startsWith('application/json'))throw new ProductError('invalid','JSON is required.');
        const bearer=request.headers.authorization;
        if(!bearer || !/^Bearer [^\s]{1,8192}$/.test(bearer))throw new ProductError('unauthorized','Sign in again to continue.');
        let body=request.body;
        if(body===undefined){let raw='';for await(const chunk of request){raw+=chunk;if(Buffer.byteLength(raw)>100000)throw new ProductError('invalid','Request too large.');}try{body=JSON.parse(raw);}catch(error){if(error instanceof ProductError)throw error;throw new ProductError('invalid','Invalid JSON.');}}
        if(typeof body==='string') {try{body=JSON.parse(body);}catch{throw new ProductError('invalid','Invalid JSON.');}}
        if(!body || typeof body!=='object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body))>100000)throw new ProductError('invalid','Invalid catalog request.');
        result=await service().privileged(bearer.slice(7),body as Record<string,unknown>);
      } else {response.setHeader('Allow','GET, POST');response.statusCode=405;response.end(JSON.stringify({message:'Method not allowed.'}));return;}
      response.statusCode=200;response.end(JSON.stringify(result));
    } catch(error) {
      const known=error instanceof ProductError;
      response.statusCode=known?({unauthorized:401,permission:403,'not-found':404,conflict:409,duplicate:409,configuration:503,'deletion-blocked':409}[error.code] || 400):503;
      response.end(JSON.stringify({code:known?error.code:'unavailable',message:known?error.message:'Catalog service unavailable. Check the server configuration or retry.',fields:known?error.fields:{}}));
    }
  };
}
