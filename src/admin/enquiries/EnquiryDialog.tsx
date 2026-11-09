import {openModal,closeModal} from '../../components/modalLayer.ts';
import React,{useEffect,useRef} from 'react';
import {X} from 'lucide-react';
import {trapDialogFocus} from '../dialog.ts';
import {InlineLoader} from '../../loading/Loading.tsx';
export function EnquiryDialog({title,children,footer,onClose,busy=false,confirm=false}:{title:string;children:React.ReactNode;footer?:React.ReactNode;onClose:()=>void;busy?:boolean;confirm?:boolean}){
 const ref=useRef<HTMLDialogElement>(null),state=useRef({busy,onClose});state.current={busy,onClose};
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;openModal(ref.current);return()=>{closeModal(ref.current);if(previous?.isConnected)previous.focus();else document.querySelector<HTMLElement>('.enquiries-heading h1')?.focus();};},[]);
 return <dialog ref={ref} className={'enquiry-dialog'+(confirm?' enquiry-confirm':'')} aria-label={title} aria-busy={busy} onKeyDown={trapDialogFocus} onCancel={e=>{e.preventDefault();if(!state.current.busy)state.current.onClose();}}><header><h2>{title}</h2><button aria-label={'Close '+title} disabled={busy} onClick={onClose}><X size={20}/></button></header><div className="enquiry-dialog-content">{children}{busy&&<InlineLoader label="Updating enquiry…" announce/>}</div>{footer&&<footer>{footer}</footer>}</dialog>;
}
