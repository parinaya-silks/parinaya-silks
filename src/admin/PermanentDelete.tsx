import './coupons/coupons.css';
import React,{useRef,useState} from 'react';
import {catalogAction,newOperation} from '../products/client.ts';
import {CouponDialog} from './coupons/CouponDialog.tsx';
import {useAdminWritePermission} from './permission.tsx';
export function PermanentDelete({kind,id,label,revision,onDeleted}:{kind:'categories'|'products'|'coupons'|'campaigns';id:string;label:string;revision:number;onDeleted:()=>void}){
 const allowed=useAdminWritePermission(),[open,setOpen]=useState(false),[text,setText]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),lock=useRef(false),operation=useRef('');
 async function remove(){if(text!=='DELETE'||!allowed||lock.current)return;lock.current=true;setBusy(true);setError('');operation.current||=newOperation();try{await catalogAction({action:'records:delete',kind,id,expectedRevision:revision,confirmation:text,operationId:operation.current});setOpen(false);onDeleted();}catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}}
 return <><button type="button" disabled={!allowed} onClick={()=>{setOpen(true);setText('');setError('');}}>Delete permanently</button>{open&&<CouponDialog title="Permanently delete this record?" subtitle={label} confirm busy={busy} onClose={()=>{if(!busy)setOpen(false);}} footer={<><button disabled={busy} onClick={()=>setOpen(false)}>Cancel</button><button disabled={!allowed||busy||text!=='DELETE'} onClick={()=>void remove()}>Delete permanently</button></>}><p>This cannot be undone. The server will block deletion if business dependencies or historical references exist. Archive or disable the record when deletion is unsafe.</p><p>Record: {label}</p><label>Type DELETE to confirm<input autoComplete="off" aria-label="Type DELETE to confirm" value={text} onChange={e=>setText(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}</CouponDialog>}</>;
}
