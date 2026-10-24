import React,{useEffect,useRef,useState} from 'react';
import {Image as ImageIcon,Upload,Star,ArrowLeft,ArrowRight,Trash2,RefreshCw} from 'lucide-react';
import { catalogAction,newOperation,uploadImage } from '../products/client.ts';
import { MAX_IMAGES,MAX_IMAGE_BYTES,type ProductImage } from '../products/model.ts';
export const productButton='min-h-11 px-4 border border-[#B88A44] rounded-lg text-sm text-[#780D24] disabled:opacity-50';
interface Attempt {id:string;file:File;progress:number;phase:'uploading'|'failed'|'done';message:string;attempted:boolean;replaceId?:string}
export function ProductImages({productId,productName,images,cover,onChange,onBusy,onBlocked,disabled}:{productId:string;productName:string;images:ProductImage[];cover:string;onChange:(images:ProductImage[],cover:string)=>void;onBusy:(value:boolean)=>void;onBlocked?:(value:boolean)=>void;disabled:boolean}) {
  const [attempts,setAttempts]=useState<Attempt[]>([]),[error,setError]=useState('');
  const working=useRef(new Set<string>()),current=useRef(images);current.current=images;
  const coverRef=useRef(cover);coverRef.current=cover;
  const active=useRef(true),controllers=useRef(new Set<AbortController>()),dragged=useRef<string|null>(null);
  useEffect(()=>{active.current=true;return()=>{active.current=false;controllers.current.forEach(c=>c.abort());controllers.current.clear();};},[]);
  useEffect(()=>{onBlocked?.(!!error||attempts.some(item=>item.phase==='failed'));},[attempts,error,onBlocked]);
  const update=(id:string,fields:Partial<Attempt>)=>setAttempts(old=>old.map(item=>item.id===id?{...item,...fields}:item));
  async function run(attempt:Attempt) {
    if(disabled||working.current.has(attempt.id))return;working.current.add(attempt.id);onBusy(true);update(attempt.id,{phase:'uploading',message:''});
    const controller=new AbortController();controllers.current.add(controller);
    try {
      let result:ProductImage|undefined;
      if(attempt.attempted){try{result=await catalogAction<ProductImage>({action:'verify',productId,mediaId:attempt.id},controller.signal);}catch{/* A missing upload may safely retry its fixed non-overwriting public ID. */}}
      update(attempt.id,{attempted:true});
      result ||= await uploadImage(attempt.file,productId,attempt.id,progress=>{if(active.current)update(attempt.id,{progress});},controller.signal);
      if(!active.current)return;
      const latest=current.current;
      if(!latest.some(item=>item.mediaId===result.mediaId)){
        const replaced=latest.find(item=>item.mediaId===attempt.replaceId);
        const photo={...result,alt:replaced?.alt||productName.trim()||'Saree photo'};
        const next=replaced?latest.map(item=>item.mediaId===attempt.replaceId?photo:item):[...latest,photo];
        current.current=next;
        const nextCover=coverRef.current===attempt.replaceId?photo.mediaId:coverRef.current||photo.mediaId;
        coverRef.current=nextCover;onChange(next,nextCover);
      }
      update(attempt.id,{phase:'done',progress:100});
    } catch(failure){if(active.current)update(attempt.id,{phase:'failed',message:failure instanceof Error?failure.message:'Upload failed. Retry.'});}
    finally{controllers.current.delete(controller);working.current.delete(attempt.id);if(active.current)onBusy(working.current.size>0);}
  }
  function select(files:FileList|null,replaceId?:string) {
    if(!files||disabled)return;setError('');const selected=Array.from(files);
    if(current.current.length+attempts.filter(item=>item.phase!=='done'&&!item.replaceId).length+selected.length-(replaceId?1:0)>MAX_IMAGES){setError('A product can have at most eight images, including pending uploads.');return;}
    if(selected.some(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size<=0||file.size>MAX_IMAGE_BYTES)){setError('Choose JPEG, PNG or WebP files up to 10 MiB each.');return;}
    const added=selected.map(file=>({id:newOperation(),file,progress:0,phase:'uploading' as const,message:'',attempted:false,replaceId}));setAttempts(old=>[...old,...added]);for(const attempt of added)void run(attempt);
  }
  function reorder(from:number,to:number){if(disabled||to<0||to>=images.length)return;const next=[...images],[moving]=next.splice(from,1);next.splice(to,0,moving);onChange(next,cover);}
  return <section className="product-editor-panel product-photos">
    <header><ImageIcon size={17}/><h2>2. Product Photos</h2><small>{images.length} of {MAX_IMAGES} uploaded</small></header>
    <div className="product-panel-body"><label className="product-photo-drop" onDragOver={e=>{e.preventDefault();}} onDrop={e=>{e.preventDefault();if(working.current.size===0)select(e.dataTransfer.files);}}><Upload size={28}/><strong>Drag and drop saree photos, or <u>browse files</u></strong><small>JPEG, PNG or WebP · up to 10 MiB each · maximum eight photos</small><input aria-label="Add photos" disabled={disabled||working.current.size>0} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>{select(e.target.files);e.target.value='';}}/></label>
    {error&&<div role="alert" className="product-photo-error">{error} <button type="button" onClick={()=>setError('')}>Dismiss file error</button></div>}
    {attempts.filter(item=>item.phase!=='done').map(attempt=><div key={attempt.id} className="product-photo-attempt"><p>{attempt.file.name}</p>{attempt.phase==='uploading'?<><progress aria-label={`Uploading ${attempt.file.name}`} max={100} value={attempt.progress}/><p role="status">{attempt.progress}% uploaded · verifying photo</p></>:<><p role="alert">{attempt.message}</p><button type="button" className="product-secondary" disabled={disabled} onClick={()=>void run(attempt)}>Retry {attempt.file.name}</button><button type="button" className="product-secondary" disabled={disabled} onClick={()=>setAttempts(old=>old.filter(item=>item.id!==attempt.id))}>Dismiss upload</button></>}</div>)}
    <ol className="product-photo-grid">{images.map((image,index)=><li key={image.mediaId} className="product-photo" data-cover={cover===image.mediaId} draggable={!disabled} onDragStart={()=>{dragged.current=image.mediaId;}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const from=images.findIndex(i=>i.mediaId===dragged.current);if(from>=0)reorder(from,index);dragged.current=null;}}>
      <img src={image.url} alt={image.alt||'Uploaded product preview'}/>{cover===image.mediaId&&<span className="product-cover-label">Cover Photo</span>}
      <div className="product-photo-tools"><label title="Choose cover"><input type="radio" aria-label={`Cover image ${index+1}`} name="cover" disabled={disabled} checked={cover===image.mediaId} onChange={()=>onChange(images,image.mediaId)}/><Star size={14} fill={cover===image.mediaId?'currentColor':'none'}/></label><button type="button" aria-label={`Move image ${index+1} earlier`} disabled={disabled||index===0} onClick={()=>reorder(index,index-1)}><ArrowLeft size={14}/></button><button type="button" aria-label={`Move image ${index+1} later`} disabled={disabled||index===images.length-1} onClick={()=>reorder(index,index+1)}><ArrowRight size={14}/></button><label title="Replace photo"><input aria-label={`Replace photo ${index+1}`} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled||working.current.size>0} onChange={e=>{select(e.target.files,image.mediaId);e.target.value='';}}/><RefreshCw size={14}/></label><button type="button" aria-label={`Remove image ${index+1}`} disabled={disabled} onClick={()=>{const next=images.filter(item=>item.mediaId!==image.mediaId);onChange(next,cover===image.mediaId?next[0]?.mediaId||'':cover);}}><Trash2 size={14}/></button></div>
      <label className="product-photo-alt">Photo {index+1} description<input aria-label={`Photo ${index+1} description`} disabled={disabled} maxLength={200} value={image.alt} onChange={e=>onChange(images.map(item=>item.mediaId===image.mediaId?{...item,alt:e.target.value}:item),cover)}/></label>
    </li>)}</ol><p className="product-hint">Choose a cover and arrange the rest. Photo descriptions are required to publish. Removing a photograph from this listing keeps the stored original.</p></div>
  </section>;
}
