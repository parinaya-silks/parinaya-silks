import { CatalogConfigurationError } from './errors.ts';
import { ProductError } from '../src/products/model.ts';

export function catalogFailure(error: unknown) {
  if(error instanceof CatalogConfigurationError) return {status:503,code:'configuration',message:'Catalog service is not configured.',fields:{},reason:error.reason};
  if(error instanceof ProductError) {
    const status=({unauthorized:401,permission:403,'not-found':404,invalid:400,conflict:409,duplicate:409,configuration:503,'deletion-blocked':409,schema:500,media:400,upload:502} as Record<string,number>)[error.code] || 500;
    return {status,code:error.code,message:status>=500?'Catalog service is unavailable. Please try again.':error.message,fields:status>=500?{}:error.fields,reason:error.code};
  }
  const source=error as {code?:unknown;message?:unknown}|null;
  const code=source?.code;
  if(code===9 && typeof source?.message==='string' && /requires an index/i.test(source.message)) return {status:503,code:'index-required',message:'Catalog service is temporarily unavailable.',fields:{},reason:'firestore-index-required'};
  if(code===7 || code==='app/invalid-credential') return {status:503,code:'configuration',message:'Catalog service is not configured.',fields:{},reason:'firebase-service-permission'};
  if([4,14,'unavailable','deadline-exceeded','ETIMEDOUT','ECONNRESET'].includes(code as never)) return {status:503,code:'unavailable',message:'Catalog service is temporarily unavailable.',fields:{},reason:'upstream-unavailable'};
  return {status:500,code:'internal',message:'Catalog request failed. Please try again.',fields:{},reason:'unexpected'};
}

// Never serialize an exception, message, request, headers or environment. Keep
// only recognized codes and stack locations; messages may contain credentials.
export function catalogDiagnostic(error:unknown,requestId:string,phase:string,action?:string) {
  const seen=new Set<unknown>();
  const errors:unknown[]=[];
  let current=error;
  while(current instanceof Error && !seen.has(current) && errors.length<3) {
    seen.add(current);
    const rawCode='code' in current?current.code:undefined;
    const code=typeof rawCode==='number' || (typeof rawCode==='string' && /^[a-zA-Z0-9_/-]{1,60}$/.test(rawCode))?rawCode:undefined;
    const locations=(current.stack||'').split('\n').filter(line=>/^\s+at /.test(line) && /:\d+:\d+\)?$/.test(line) && !/Bearer|authorization|-----|eyJ|[?@]/i.test(line)).map(line=>line.trim()).slice(0,10);
    errors.push({name:/^[a-zA-Z]{1,40}$/.test(current.name)?current.name:'Error',code,locations});
    current=current.cause;
  }
  return {event:'catalog_failure',requestId,phase,action,reason:catalogFailure(error).reason,errors};
}
