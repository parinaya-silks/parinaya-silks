import React,{useEffect,useRef,useState} from 'react';
import {catalogAction,newOperation,uploadSignedImage} from '../products/client.ts';
import {MAX_IMAGE_BYTES} from '../products/model.ts';
import {useAdminWritePermission} from '../admin/permission.tsx';
import {appearanceInput,emptyAppearance,type Appearance,type Device,type LoginImage} from './model.ts';

type Upload={file:File;id:string;progress:number;state:'selected'|'uploading'|'error';error?:string};
const fallback='/assets/customer-auth-portrait.jpg';
export function AdminLoginAppearance(){
  const [saved,setSaved]=useState<Appearance>(emptyAppearance),[draft,setDraft]=useState<Appearance>(emptyAppearance),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[uploads,setUploads]=useState<Partial<Record<Device,Upload>>>({}),[busy,setBusy]=useState(false),[ready,setReady]=useState(false);
  const allowed=useAdminWritePermission(),mounted=useRef(true),lock=useRef(false),operation=useRef(newOperation()),generation=useRef(0);
  const dirty=JSON.stringify(draft)!==JSON.stringify(saved)||Object.keys(uploads).length>0;
  const uploading=Object.values(uploads).some(upload=>upload?.state==='uploading');
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;generation.current++;};},[]);
  async function load(){if(lock.current)return;setLoading(true);setReady(false);setError('');const current=++generation.current;try{const value=await catalogAction<Appearance>({action:'appearance:get'});if(mounted.current&&current===generation.current){setSaved(value);setDraft(value);setReady(true);setUploads({});operation.current=newOperation();}}catch{if(mounted.current)setError('Unable to load login appearance. Please retry.');}finally{if(mounted.current)setLoading(false);}}
  useEffect(()=>{void load();},[]);
  useEffect(()=>{
    const protect=(event:Event)=>{if(dirty&&!window.confirm('Discard unsaved login appearance changes?'))event.preventDefault();};
    const unload=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue='';}};
    window.addEventListener('parinaya:before-admin-navigation',protect);window.addEventListener('beforeunload',unload);return()=>{window.removeEventListener('parinaya:before-admin-navigation',protect);window.removeEventListener('beforeunload',unload);};
  },[dirty]);
  function edit(device:Device,value:LoginImage|null){setDraft(previous=>({...previous,[device]:value}));setNotice('');operation.current=newOperation();}
  async function upload(device:Device,verifyOnly=false){
    const selected=uploads[device];if(!selected||selected.state==='uploading'||!allowed)return;const current=generation.current;
    const id=verifyOnly?selected.id:newOperation();
    const update=(patch:Partial<Upload>)=>{if(mounted.current&&current===generation.current)setUploads(previous=>({...previous,[device]:{...selected,id,...patch}}));};
    update({state:'uploading',progress:0,error:undefined});
    try{
      if(!verifyOnly){const params=await catalogAction<Record<string,string>>({action:'appearance:sign',device,mediaId:id,type:selected.file.type,size:selected.file.size});await uploadSignedImage(selected.file,params,progress=>update({state:'uploading',progress}));}
      const image=await catalogAction<LoginImage>({action:'appearance:verify',device,mediaId:id});
      if(mounted.current&&current===generation.current){edit(device,image);setUploads(previous=>{const next={...previous};delete next[device];return next;});}
    }catch{update({state:'error',error:'Upload or verification was not confirmed. Retry verification first, or upload again. Your saved appearance has not changed.'});}
  }
  async function save(){
    if(lock.current||!allowed||uploading||Object.keys(uploads).length||!dirty)return;lock.current=true;setBusy(true);setError('');setNotice('');
    try{const value=await catalogAction<Appearance>({action:'appearance:save',appearance:appearanceInput(draft),expectedRevision:saved.revision,operationId:operation.current});if(mounted.current){setSaved(value);setDraft(value);operation.current=newOperation();setNotice('Login page appearance saved. Refresh the customer page to see it immediately.');}}
    catch{if(mounted.current)setError('Appearance was not confirmed saved. Retry with your edits kept. If another administrator saved changes, Cancel to reload the saved version.');}
    finally{lock.current=false;if(mounted.current)setBusy(false);}
  }
  return <section className="max-w-5xl space-y-5">
    <header><h1 className="font-serif text-2xl">Store Settings</h1><h2 className="font-serif text-xl mt-5">Login Page Appearance</h2><p className="text-sm text-[#5F5552] mt-2">Choose separate photos for the tall desktop portrait and shallow mobile banner. Uploading only prepares an image; Save applies it to the customer pages. Other store settings remain unavailable.</p></header>
    {loading?<p role="status">Loading login appearance...</p>:<>
      {error&&<div role="alert" className="p-3 bg-red-50 border rounded-lg"><p>{error}</p><button className="min-h-11 underline" onClick={()=>void load()}>Retry loading saved appearance</button></div>}
      {notice&&<p role="status" className="p-3 bg-green-50 border rounded-lg">{notice}</p>}
      <fieldset disabled={!allowed||busy||!ready} className="grid md:grid-cols-2 gap-5 min-w-0">
        {(['desktop','mobile'] as const).map(device=><ImageEditor key={device} device={device} value={draft[device]} upload={uploads[device]} disabled={uploading} onEdit={value=>edit(device,value)} onSelect={file=>{
          setNotice('');if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size<=0||file.size>MAX_IMAGE_BYTES){setError('Use JPEG, PNG or WebP images up to 10 MiB.');return;}
          setError('');setUploads(previous=>({...previous,[device]:{file,id:newOperation(),progress:0,state:'selected'}}));
        }} onUpload={verifyOnly=>void upload(device,verifyOnly)} onClear={()=>{edit(device,null);setUploads(previous=>{const next={...previous};delete next[device];return next;});}}/>)}
      </fieldset>
      <div className="flex gap-3 flex-wrap"><button className="min-h-11 px-5 rounded-lg bg-[#780D24] text-white disabled:opacity-50" disabled={!allowed||busy||!ready||uploading||!dirty||Object.keys(uploads).length>0} onClick={()=>void save()}>{busy?'Saving...':'Save login appearance'}</button><button className="min-h-11 px-5 border rounded-lg" disabled={busy||uploading} onClick={()=>{setNotice('');void load();}}>Cancel</button></div>
      <p className="text-xs text-[#5F5552]">JPEG, PNG or WebP, up to 10 MiB. No existing media is deleted. Resetting an image uses the approved fallback after Save. Customer pages refresh settings within 30 seconds while visible, or immediately on refresh/revisit.</p>
    </>}
  </section>;
}
function ImageEditor({device,value,upload,disabled,onSelect,onEdit,onUpload,onClear}:{device:Device;value:LoginImage|null;upload?:Upload;disabled:boolean;onSelect:(file:File)=>void;onEdit:(value:LoginImage)=>void;onUpload:(verifyOnly:boolean)=>void;onClear:()=>void}){
  const [preview,setPreview]=useState('');
  useEffect(()=>{if(!upload){setPreview('');return;}const url=URL.createObjectURL(upload.file);setPreview(url);return()=>URL.revokeObjectURL(url);},[upload?.file]);
  const label=device==='desktop'?'Desktop login image':'Mobile login image';
  return <section className="p-4 bg-white border rounded-xl min-w-0 space-y-3" aria-label={label}>
    <h3 className="font-semibold">{label}</h3><p className="text-xs text-[#5F5552]">{device==='desktop'?'Tall portrait: recommend 1200 x 1500 px (4:5). Keep the face near the centre.':'Shallow banner: recommend 1600 x 700 px (16:7). Keep the face within the central area; tablet banners can be wider.'}</p>
    <div className={'overflow-hidden bg-[#FBF7F0] rounded-lg '+(device==='desktop'?'aspect-[4/5] max-h-80':'aspect-[16/7]')}><img alt={value?.alt||label+' preview'} src={preview||value?.url||fallback} className="w-full h-full object-cover" style={{objectPosition:value?`${value.focalX}% ${value.focalY}%`:device==='mobile'?'50% 0%':'50% 50%'}}/></div>
    <label className="block text-sm font-semibold">Replace {device} image<input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} className="block w-full text-sm mt-2" onChange={event=>{const file=event.target.files?.[0];if(file)onSelect(file);event.target.value='';}}/></label>
    {upload&&<div className="text-sm space-y-2"><p>{upload.file.name}</p>{upload.state==='uploading'?<><progress className="w-full" max="100" value={upload.progress} aria-label={`${device} upload progress`}/><p role="status">Uploading and verifying... {upload.progress}%</p></>:<><button type="button" className="min-h-11 underline mr-4" disabled={disabled} onClick={()=>onUpload(false)}>{upload.state==='error'?'Upload again':'Upload selected image'}</button>{upload.state==='error'&&<button type="button" className="min-h-11 underline" disabled={disabled} onClick={()=>onUpload(true)}>Retry verification</button>}</>}{upload.error&&<p role="alert">{upload.error}</p>}</div>}
    {value&&!upload&&<><label className="block text-sm">Alt text (optional)<input className="w-full border rounded p-2 mt-1" value={value.alt} maxLength={200} onChange={event=>onEdit({...value,alt:event.target.value})}/></label>{(['focalX','focalY'] as const).map((key,index)=><label key={key} className="block text-sm">{index===0?'Horizontal':'Vertical'} focal point: {value[key]}%<input className="w-full" type="range" min="0" max="100" value={value[key]} onChange={event=>onEdit({...value,[key]:Number(event.target.value)})}/></label>)}</>}
    <button type="button" className="min-h-11 text-sm underline" disabled={disabled||(!value&&!upload)} onClick={onClear}>Use approved fallback</button>
  </section>;
}
