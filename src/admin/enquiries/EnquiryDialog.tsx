import React,{useEffect,useRef} from 'react';
import {X} from 'lucide-react';
import {trapDialogFocus} from '../dialog.ts';
export function EnquiryDialog({title,children,footer,onClose,busy=false,confirm=false}:{title:string;children:React.ReactNode;footer?:React.ReactNode;onClose:()=>void;busy?:boolean;confirm?:boolean}){
 const ref=useRef<HTMLDialogElement>(null),state=useRef({busy,onClose});state.current={busy,onClose};
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;document.body.style.overflow='hidden';ref.current?.showModal();return()=>{ref.current?.close();document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();else document.querySelector<HTMLElement>('.enquiries-heading h1')?.focus();};},[]);
 return <dialog ref={ref} className={'enquiry-dialog'+(confirm?' enquiry-confirm':'')} aria-label={title} onKeyDown={trapDialogFocus} onCancel={e=>{e.preventDefault();if(!state.current.busy)state.current.onClose();}}><header><h2>{title}</h2><button aria-label={'Close '+title} disabled={busy} onClick={onClose}><X size={20}/></button></header><div className="enquiry-dialog-content">{children}</div>{footer&&<footer>{footer}</footer>}</dialog>;
}
