import React,{useRef,useState} from 'react';
import { catalogAction,newOperation,uploadImage } from '../products/client.ts';
import { MAX_IMAGES,MAX_IMAGE_BYTES,type ProductImage } from '../products/model.ts';
export const productButton='min-h-11 px-4 border border-[#B88A44] rounded-lg text-sm text-[#780D24] disabled:opacity-50';
interface Attempt {id:string;file:File;progress:number;phase:'uploading'|'failed'|'done';message:string;attempted:boolean}
export function ProductImages({productId,images,cover,onChange,onBusy,disabled}:{productId:string;images:ProductImage[];cover:string;onChange:(images:ProductImage[],cover:string)=>void;onBusy:(value:boolean)=>void;disabled:boolean}) {
  const [attempts,setAttempts]=useState<Attempt[]>([]),[error,setError]=useState('');
  const working=useRef(new Set<string>()),current=useRef(images);current.current=images;
  const coverRef=useRef(cover);coverRef.current=cover;
  const update=(id:string,fields:Partial<Attempt>)=>setAttempts(old=>old.map(item=>item.id===id?{...item,...fields}:item));
  async function run(attempt:Attempt) {
    if(working.current.has(attempt.id))return;working.current.add(attempt.id);onBusy(true);update(attempt.id,{phase:'uploading',message:''});
    try {
      let result:ProductImage|undefined;
      if(attempt.attempted){try{result=await catalogAction<ProductImage>({action:'verify',productId,mediaId:attempt.id});}catch{/* A missing upload may safely retry its fixed non-overwriting public ID. */}}
      update(attempt.id,{attempted:true});
      result ||= await uploadImage(attempt.file,productId,attempt.id,progress=>update(attempt.id,{progress}));
      const latest=current.current;
      if(!latest.some(item=>item.mediaId===result.mediaId)){const next=[...latest,{...result,alt:''}];current.current=next;onChange(next,coverRef.current||result.mediaId);}
      update(attempt.id,{phase:'done',progress:100});
    } catch(failure){update(attempt.id,{phase:'failed',message:failure instanceof Error?failure.message:'Upload failed. Retry.'});}
    finally{working.current.delete(attempt.id);onBusy(working.current.size>0);}
  }
  function select(files:FileList|null) {
    if(!files)return;setError('');const selected=Array.from(files);
    if(current.current.length+attempts.filter(item=>item.phase!=='done').length+selected.length>MAX_IMAGES){setError('A product can have at most eight images, including pending uploads.');return;}
    if(selected.some(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size<=0||file.size>MAX_IMAGE_BYTES)){setError('Choose JPEG, PNG or WebP files up to 10 MiB each.');return;}
    const added=selected.map(file=>({id:newOperation(),file,progress:0,phase:'uploading' as const,message:'',attempted:false}));setAttempts(old=>[...old,...added]);for(const attempt of added)void run(attempt);
  }
  return <section className="bg-white border border-[#E8DDD6] rounded-xl p-5 space-y-4">
    <h2 className="font-serif text-lg">Product Imagery</h2>
    <p className="text-xs text-[#5F5552]">Up to eight JPEG, PNG or WebP images, 10 MiB each. Removing an image detaches it; uploaded assets are retained.</p>
    <label className="block text-sm">Select images<input aria-label="Select images" disabled={disabled||working.current.size>0} className="block mt-2 max-w-full text-sm" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event=>{select(event.target.files);event.target.value='';}} /></label>
    {error&&<p role="alert" className="text-sm text-red-800">{error}</p>}
    {attempts.filter(item=>item.phase!=='done').map(attempt=><div key={attempt.id} className="border rounded-lg p-3 text-sm space-y-2"><p className="break-all">{attempt.file.name}</p>{attempt.phase==='uploading'?<><progress aria-label={`Uploading ${attempt.file.name}`} max={100} value={attempt.progress} className="w-full"/><p role="status">{attempt.progress}% uploaded · verifying before use</p></>:<><p role="alert">{attempt.message}</p><button type="button" className={productButton} disabled={disabled} onClick={()=>void run(attempt)}>Retry {attempt.file.name}</button><button type="button" className={productButton} disabled={disabled} onClick={()=>setAttempts(old=>old.filter(item=>item.id!==attempt.id))}>Dismiss upload</button></>}</div>)}
    <ol className="space-y-4">{images.map((image,index)=><li key={image.mediaId} className="border border-[#E8DDD6] rounded-lg p-3 grid sm:grid-cols-[100px_1fr] gap-3 min-w-0">
      <img src={image.url} alt={image.alt||'Uploaded product preview'} className="w-full h-40 sm:w-24 object-contain bg-[#FBF7F0] rounded" />
      <div className="space-y-2 min-w-0"><label className="block text-sm">Image {index+1} alt text<input aria-label={`Image ${index+1} alt text`} disabled={disabled} maxLength={200} className="w-full min-h-11 border rounded-lg px-3" value={image.alt} onChange={event=>onChange(images.map(item=>item.mediaId===image.mediaId?{...item,alt:event.target.value}:item),cover)} /></label>
      <label className="flex gap-2 items-center min-h-11 text-sm"><input type="radio" name="cover" disabled={disabled} checked={cover===image.mediaId} onChange={()=>onChange(images,image.mediaId)}/>Cover image {index+1}</label>
      <div className="flex flex-wrap gap-2"><button type="button" className={productButton} disabled={disabled||index===0} onClick={()=>{const next=[...images];[next[index-1],next[index]]=[next[index],next[index-1]];onChange(next,cover);}}>Move image {index+1} earlier</button><button type="button" className={productButton} disabled={disabled||index===images.length-1} onClick={()=>{const next=[...images];[next[index],next[index+1]]=[next[index+1],next[index]];onChange(next,cover);}}>Move image {index+1} later</button><button type="button" className={productButton} disabled={disabled} onClick={()=>{const next=images.filter(item=>item.mediaId!==image.mediaId);onChange(next,cover===image.mediaId?next[0]?.mediaId||'':cover);}}>Remove image {index+1}</button></div></div>
    </li>)}</ol>
  </section>;
}
