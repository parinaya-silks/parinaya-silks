import React,{useEffect,useRef,useState} from 'react';
import {catalogAction,newOperation} from '../products/client.ts';
import {appearanceInput} from '../appearance/model.ts';
import {blankContent,type StoreContent,validateContent} from './model.ts';
import {useAdminWritePermission} from '../admin/permission.tsx';
import {button,input,DataState,useBusinessData} from '../orders/ui.tsx';
export function AdminContent({section='contact'}:{section?:'contact'}){
 const resource=useBusinessData<StoreContent>({action:'content:get'}),allowed=useAdminWritePermission(),[draft,setDraft]=useState(blankContent),[baseline,setBaseline]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),op=useRef(newOperation());
 useEffect(()=>{if(resource.data){setDraft(resource.data);setBaseline(JSON.stringify(resource.data));op.current=newOperation();}},[resource.data]);
 const dirty=JSON.stringify(draft)!==baseline;
 useEffect(()=>{const protect=(event:Event)=>{if(dirty&&baseline&&!confirm('Discard unsaved store content?'))event.preventDefault();};window.addEventListener('parinaya:before-admin-navigation',protect);return()=>window.removeEventListener('parinaya:before-admin-navigation',protect);},[dirty,baseline]);
 function edit(next:StoreContent){setDraft(next);op.current=newOperation();setNotice('');}
 async function save(event:React.FormEvent){event.preventDefault();if(busy||!allowed||!resource.data)return;setBusy(true);setError('');try{const {revision,...value}=draft;const content=validateContent({...value,banners:value.banners.map(banner=>({...banner,images:appearanceInput(banner.images)}))});const saved=await catalogAction<StoreContent>({action:'content:save',content,expectedRevision:resource.data.revision,operationId:op.current});setDraft(saved);setBaseline(JSON.stringify(saved));setNotice('Store content saved. Refresh the storefront to see saved content immediately.');resource.retry();}catch(failure){setError(failure instanceof Error?failure.message:'Unable to save content.');}finally{setBusy(false);}}
 return <section className="space-y-5 max-w-5xl"><h2 className="font-serif text-2xl text-[#780D24]">Contact Information</h2><p>Only save owner-approved contact information. Save applies your changes. Visible storefront pages refresh within 15 seconds or on revisit/refresh.</p><DataState {...resource}/>{resource.data&&<form className="space-y-5" onSubmit={save}><fieldset disabled={!allowed||busy} className="space-y-5 min-w-0">
 {section==='contact'&&<section className="space-y-3"><h3 className="font-serif text-xl">Approved public contact</h3>{(['email','mobile','address','instagram'] as const).map(key=><label className="block" key={key}>{key==='mobile'?'Mobile (+ country code)':key}<input className={input} value={draft.contact[key]} onChange={event=>edit({...draft,contact:{...draft.contact,[key]:event.target.value}})}/></label>)}</section>}
</fieldset>{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}<div className="flex gap-3"><button className={button} disabled={!allowed||busy||!dirty}>Save store content</button><button type="button" className={button} disabled={busy} onClick={()=>{setError('');setNotice('');resource.retry();}}>Cancel store content</button></div></form>}</section>;
}
