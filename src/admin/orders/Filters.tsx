import {useEffect,useRef,useState} from 'react';
import {SlidersHorizontal,X} from 'lucide-react';
import {orderStatuses} from '../../orders/model.ts';
import {trapDialogFocus} from '../dialog.ts';
import {blankFilters,orderQuery,periods,type OrderFilters} from './model.ts';

export function OrderFiltersControl({value,disabled,onApply}:{value:OrderFilters;disabled:boolean;onApply:(filters:OrderFilters)=>void}){
 const [open,setOpen]=useState(false),[draft,setDraft]=useState(value),[error,setError]=useState(''),dialog=useRef<HTMLDialogElement>(null),first=useRef<HTMLSelectElement>(null),trigger=useRef<HTMLButtonElement>(null),lastFocus=useRef<HTMLElement|null>(null);
 useEffect(()=>{if(!open)return;dialog.current?.showModal();first.current?.focus();const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{dialog.current?.close();document.body.style.overflow=previous;lastFocus.current?.focus();};},[open]);
 function edit(){lastFocus.current=document.activeElement as HTMLElement;setDraft(value);setError('');setOpen(true);}
 function apply(event:React.FormEvent){event.preventDefault();try{orderQuery(draft);onApply(draft);setOpen(false);}catch(error){setError(error instanceof Error?error.message:'Choose valid filters.');}}
 const count=Number(value.statuses.length>0)+Number(!!value.paymentStatus)+Number(value.period!=='all');
 return <>
  <label className="orders-desktop-filter"><span className="sr-only">Order date period</span><select aria-label="Order date period" disabled={disabled} value={value.period} onChange={event=>{if(event.target.value==='custom'){edit();setDraft({...value,period:'custom'});}else onApply({...value,period:event.target.value});}}>{periods.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
  <label className="orders-desktop-filter"><span className="sr-only">COD collection filter</span><select aria-label="COD collection filter" disabled={disabled} value={value.paymentStatus} onChange={event=>onApply({...value,paymentStatus:event.target.value})}><option value="">All COD statuses</option><option value="due">COD — Due</option><option value="collected">COD — Collected</option></select></label>
  <button ref={trigger} className="admin-secondary orders-filter-trigger" disabled={disabled} onClick={edit}><SlidersHorizontal size={15} aria-hidden="true"/>Filters{count>0&&<span className="orders-filter-count">{count}</span>}</button>
  {open&&<dialog ref={dialog} className="orders-dialog orders-filter-sheet" aria-labelledby="orders-filter-title" onKeyDown={trapDialogFocus} onCancel={event=>{event.preventDefault();setOpen(false);}}><header><h2 id="orders-filter-title">Filter orders</h2><button className="admin-secondary" aria-label="Close order filters" onClick={()=>setOpen(false)}><X size={16}/></button></header><form onSubmit={apply}>
   <label>Date range<select aria-label="Date range" ref={first} value={draft.period} onChange={event=>setDraft({...draft,period:event.target.value})}>{periods.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
   {draft.period==='custom'&&<div className="orders-date-fields"><label>From<input type="date" required value={draft.start} onChange={event=>setDraft({...draft,start:event.target.value})}/></label><label>Through<input type="date" required value={draft.end} onChange={event=>setDraft({...draft,end:event.target.value})}/></label><p>Order creation dates in Asia/Kolkata, including the entire end date.</p></div>}
   <fieldset><legend>Order status</legend><div className="orders-status-options">{orderStatuses.map(status=><label key={status}><input type="checkbox" checked={draft.statuses.includes(status)} onChange={event=>setDraft({...draft,statuses:event.target.checked?[...draft.statuses,status]:draft.statuses.filter(value=>value!==status)})}/>{status}</label>)}</div></fieldset>
   <label>Payment / collection status<select aria-label="Payment / collection status" value={draft.paymentStatus} onChange={event=>setDraft({...draft,paymentStatus:event.target.value})}><option value="">All COD statuses</option><option value="due">COD — Due (includes part collected)</option><option value="collected">COD — Collected</option></select></label>
   {error&&<p role="alert">{error}</p>}<footer><button type="button" className="orders-link" onClick={()=>{setDraft({...blankFilters(),search:value.search});setError('');}}>Reset filters</button><button type="button" className="admin-secondary" onClick={()=>setOpen(false)}>Cancel</button><button className="admin-primary">Apply filters</button></footer>
  </form></dialog>}
 </>;
}
