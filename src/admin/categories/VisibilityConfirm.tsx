import React,{useEffect,useRef,useState} from 'react';
import {EyeOff,X} from 'lucide-react';
import {trapDialogFocus} from '../dialog.ts';
import './categories.css';

export function VisibilityConfirm({name,onClose,onConfirm}:{name:string;onClose:()=>void;onConfirm:()=>Promise<void>}){
 const ref=useRef<HTMLDialogElement>(null),lock=useRef(false),active=useRef(true);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{active.current=true;const previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;document.body.style.overflow='hidden';ref.current?.showModal();return()=>{active.current=false;ref.current?.close();document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();else document.querySelector<HTMLElement>('.categories-heading h1')?.focus();};},[]);
 async function confirm(){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await onConfirm();}catch(failure){if(active.current)setError(failure instanceof Error?failure.message:'Unable to change visibility. Please retry.');}finally{lock.current=false;if(active.current)setBusy(false);}}
 return <dialog ref={ref} className="category-confirm" aria-labelledby="category-disable-title" onKeyDown={trapDialogFocus} onCancel={event=>{event.preventDefault();if(!lock.current)onClose();}}>
  <header><EyeOff size={21}/><h2 id="category-disable-title">Disable category?</h2><button type="button" aria-label="Close disable confirmation" disabled={busy} onClick={onClose}><X size={18}/></button></header>
  <p className="category-confirm-name">{name}</p><p>Customers will no longer see this category or its products in the shop. You can enable it again later.</p><p className="category-muted">Product draft/publish states, stock and assignments stay unchanged.</p>
  {error&&<p role="alert" className="category-error">{error}</p>}
  <footer><button autoFocus type="button" className="category-secondary" disabled={busy} onClick={onClose}>Keep Enabled</button><button type="button" className="category-primary" disabled={busy} onClick={()=>void confirm()}>{busy?'Saving...':'Disable Category'}</button></footer>
 </dialog>;
}
