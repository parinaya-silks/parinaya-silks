import {type ComponentProps} from 'react';


const infinity='M 12 12 C 14 8.5 19 8.5 19 12 C 19 15.5 14 15.5 12 12 C 10 8.5 5 8.5 5 12 C 5 15.5 10 15.5 12 12 Z';
// Decorative by default: the owning status region or button supplies one name.
export function MorphingInfinity(props:ComponentProps<'svg'>){
 return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}><path d={infinity}/></svg>;
}
export function InlineLoader({label='Loading…',announce=false}:{label?:string;announce?:boolean}){
 return <span className="loading-inline" aria-busy="true" role={announce?'status':undefined}><svg className="loading-spinner" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity=".2"/><path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg><span>{label}</span></span>;
}
export const ButtonLoader=InlineLoader;
export function PageLoader({label='Loading page…'}:{label?:string}){
 return <div className="loading-page" role="status" aria-busy="true"><MorphingInfinity className="loading-infinity"/><p>{label}</p></div>;
}
export function PaymentVerificationLoader({label='Checking payment…'}:{label?:string}){
 return <span className="loading-payment" role="status" aria-busy="true"><span className="loading-payment-orbit" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z"/><path d="M9 11h6v5H9zM10 11V9a2 2 0 0 1 4 0v2"/></svg></span><span>{label}</span></span>;
}
export function ImageUploadLoader({value,label='Uploading image'}:{value?:number;label?:string}){
 const progress=typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(100,value)):undefined;
 return <span className="loading-upload" aria-busy="true"><progress max="100" value={progress} aria-label={label}/><InlineLoader label={progress===undefined?label:`${label} · ${Math.round(progress)}%`}/></span>;
}
