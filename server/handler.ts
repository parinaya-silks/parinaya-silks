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
        if(url.searchParams.get('seo')==='sitemap'&&[...url.searchParams.keys()].length===1){const xml=await (await initialize()).sitemap();response.setHeader('Content-Type','application/xml; charset=utf-8');response.statusCode=200;response.end(xml);return;}
        if(url.searchParams.has('campaign')||url.searchParams.get('campaigns')==='1'){const ready=await initialize();if(url.searchParams.get('campaigns')==='1'&&[...url.searchParams.keys()].length===1){action='campaigns:public-list';result=await ready.publicCampaignList();}else if(url.searchParams.has('campaign')&&[...url.searchParams.keys()].length===1){action='campaigns:public-get';result=await ready.publicCampaignGet(url.searchParams.get('campaign'));}else if(url.searchParams.get('browse')==='1'){action='campaigns:public-browse';result=await ready.publicCampaignBrowse(Object.fromEntries(url.searchParams));}else throw new ProductError('invalid','Unsupported campaign query.');response.statusCode=200;response.end(JSON.stringify(result));return;}
        const appearance=url.searchParams.get('appearance')==='login'&&[...url.searchParams.keys()].length===1;
        const content=url.searchParams.get('content')==='store'&&[...url.searchParams.keys()].length===1;
        const browse=url.searchParams.get('browse')==='1';
        if(!appearance&&!content&&!browse&&[...url.searchParams.keys()].some(key=>!['slug','cursor'].includes(key)))throw new ProductError('invalid','Unsupported catalog query.');
        action=content?'content:public':appearance?'appearance:public':browse?'browse':url.searchParams.has('slug')?'get':'list';
        const ready=await initialize();
        result=browse?await ready.publicBrowse(Object.fromEntries(url.searchParams)):content?await ready.publicContent():appearance?await ready.publicAppearance():url.searchParams.has('slug') ? await ready.publicGet(url.searchParams.get('slug')) : await ready.publicList(url.searchParams.get('cursor'));
      } else if(request.method==='POST') {
        if(!request.headers['content-type']?.startsWith('application/json'))throw new ProductError('invalid','JSON is required.');
        const bearer=request.headers.authorization;

        let body=request.body;
        if(body===undefined){const chunks:Buffer[]=[];let size=0;for await(const chunk of request){const bytes=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);size+=bytes.length;if(size>100000)throw new ProductError('invalid','Request too large.');chunks.push(bytes);}try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch(error){if(error instanceof ProductError)throw error;throw new ProductError('invalid','Invalid JSON.');}}
        if(typeof body==='string') {try{body=JSON.parse(body);}catch{throw new ProductError('invalid','Invalid JSON.');}}
        if(!body || typeof body!=='object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body))>100000)throw new ProductError('invalid','Invalid catalog request.');
        const input=body as Record<string,unknown>;
        if(typeof input.action==='string' && ['enquiries:submit','enquiries:list','enquiries:get','enquiries:update','enquiries:delete','settings:get','settings:save','about:get','about:save','about:sign','about:verify','campaigns:list','campaigns:get','campaigns:members','campaigns:preview','campaigns:save','campaigns:sign','campaigns:verify','coupons:get','list','get','save','sign','verify','delete','appearance:get','appearance:sign','appearance:verify','appearance:save','shopping:get','bag:add','bag:adjust','bag:remove','wishlist:set','addresses:list','addresses:save','addresses:delete','addresses:default','checkout:review','shipping:get','shipping:save','orders:review','orders:place','orders:list','orders:get','orders:request','orders:recover','adminOrders:list','adminOrders:get','adminOrders:update','profile:update','coupons:list','coupons:save','notifications:list','notifications:read','notifications:readAll','customers:list','customers:get','customers:stats','customers:orders','customers:addresses','customers:export','profile:syncDirectory','inventory:adjust','inventory:history','inventory:low','reports:get','contact:get','contact:save','website:list','website:get','website:save','banners:get','banners:save','banners:preview','content:get','content:save','content:sign','content:verify'].includes(input.action))action=input.action;
        if(input.action==='enquiries:submit'){if(url.search||Buffer.byteLength(JSON.stringify(input))>16000)throw new ProductError('invalid','Invalid enquiry request.');result=await (await initialize()).submitEnquiry(input);}
        else{if(!bearer||!/^Bearer [^\s]{1,8192}$/.test(bearer))throw new ProductError('unauthorized','Sign in again to continue.');result=await (await initialize()).privileged(bearer.slice(7),input);}
      } else {response.setHeader('Allow','GET, POST');response.statusCode=405;response.end(JSON.stringify({code:'method',message:'Method not allowed.'}));return;}
      response.statusCode=200;response.end(JSON.stringify(result));
    } catch(error) {
      const failure=catalogFailure(error);
      if(failure.status>=500)report(catalogDiagnostic(error,requestId,phase,action));
      if(failure.status===429)response.setHeader('Retry-After','3600');
      response.statusCode=failure.status;
      response.end(JSON.stringify({code:failure.code,message:failure.message,fields:failure.fields,...(failure.status>=500?{requestId}:{})}));
    }
  };
}
