import {useEffect,useRef,useState} from 'react';
import {catalogAction,newOperation} from '../../products/client.ts';
import {ProductError} from '../../products/model.ts';
import {getAdminClients} from '../../services/firebase/adminAuth.ts';
import {useAdminWritePermission} from '../permission.tsx';
import {commonCommands,bulkEligible} from '../dashboard/model.ts';
import {trapDialogFocus} from '../dialog.ts';
import type {OrderListItem} from './model.ts';

type Request={action:string;id:string;expectedRevision:number;operationId:string;command:string;note:string};
type Failure={request:Request;reference:string;message:string;uncertain:boolean};
export function useOrderSelection(items:OrderListItem[],context:string){
 const [selected,setSelected]=useState<string[]>([]);
 useEffect(()=>setSelected([]),[context]);
 useEffect(()=>setSelected(old=>old.filter(id=>items.some(item=>item.id===id&&bulkEligible(item)))),[items]);
 const eligible=items.filter(bulkEligible),rows=items.filter(item=>selected.includes(item.id)),all=eligible.length>0&&eligible.every(item=>selected.includes(item.id));
 return {rows,all,eligible,toggle:(item:OrderListItem)=>setSelected(old=>old.includes(item.id)?old.filter(id=>id!==item.id):[...old,item.id]),toggleAll:()=>setSelected(all?[]:eligible.map(item=>item.id)),clear:()=>setSelected([]),remove:(ids:string[])=>setSelected(old=>old.filter(id=>!ids.includes(id)))};
}
export function BulkActions({rows,items,context,refreshing,onClear,onSuccess,onRetry,onBusy}:{rows:OrderListItem[];items:OrderListItem[];context:string;refreshing:boolean;onClear:()=>void;onSuccess:(ids:string[])=>void;onRetry:()=>void;onBusy:(value:boolean)=>void}){
 const allowed=useAdminWritePermission(),uid=getAdminClients().auth.currentUser?.uid||'',commands=commonCommands(rows);
 const [command,setCommand]=useState(''),[plan,setPlan]=useState<Request[]|null>(null),[busy,setBusy]=useState(false),[result,setResult]=useState<{success:string[];failures:Failure[];labels:Record<string,string>}|null>(null);
 const lock=useRef(false),active=useRef(true),dialog=useRef<HTMLDialogElement>(null),cancel=useRef<HTMLButtonElement>(null),focus=useRef<HTMLElement|null>(null),current=useRef(items);current.current=items;
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 useEffect(()=>{setPlan(null);setResult(null);setCommand('');},[context]);
 useEffect(()=>{if(!commands.includes(command as never))setCommand('');},[commands.join(','),command]);
 useEffect(()=>{if(plan&&plan.some(request=>!items.some(item=>item.id===request.id)))setPlan(null);},[items,plan]);
 useEffect(()=>{if(!plan)return;focus.current=document.activeElement as HTMLElement;dialog.current?.showModal();cancel.current?.focus();const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{dialog.current?.close();document.body.style.overflow=previous;focus.current?.focus();};},[plan]);
 async function run(requests:Request[]){
  if(lock.current||!allowed)return;lock.current=true;setBusy(true);onBusy(true);setPlan(null);
  const success:string[]=[],failures:Failure[]=[],labels:Record<string,string>={};
  try{for(const request of requests){
   if(!active.current||getAdminClients().auth.currentUser?.uid!==uid)break;
   const item=current.current.find(item=>item.id===request.id);
   if(!item){failures.push({request,reference:request.id,message:'Order is no longer on this page. No request sent.',uncertain:false});continue;}
   labels[request.id]=item.reference;
   try{await catalogAction(request);success.push(request.id);}catch(error){
    const code=error instanceof ProductError?error.code:'unavailable';
    failures.push({request,reference:item.reference,message:code==='conflict'?'Order changed. Review its current state before applying a new action.':error instanceof Error?error.message:'Unable to confirm this change.',uncertain:!['conflict','invalid','permission','unauthorized','not-found'].includes(code)});
    if(['permission','unauthorized'].includes(code)){window.dispatchEvent(new CustomEvent('parinaya:admin-api-denied',{detail:uid}));break;}
   }
  }
  if(active.current){onSuccess(success);setResult({success,failures,labels});onRetry();}
  }finally{lock.current=false;if(active.current){setBusy(false);onBusy(false);}}
 }
 return <>
  {rows.length>0&&<div className="orders-bulk" role="region" aria-label="Bulk order actions"><strong>{rows.length} selected</strong>{commands.length?<><select aria-label="Bulk action" value={command} disabled={busy||!allowed} onChange={event=>setCommand(event.target.value)}><option value="">Choose action</option>{commands.map(value=><option key={value} value={value}>{value==='Confirmed'?'Confirm orders':'Start processing'}</option>)}</select><button className="admin-primary" disabled={!command||busy||!allowed||refreshing} onClick={()=>setPlan(rows.map(item=>({action:'adminOrders:update',id:item.id,expectedRevision:item.revision,operationId:newOperation(),command,note:'Orders list bulk action'})))}>Apply</button></>:<p>Select orders in the same workflow state to apply a shared action.</p>}<button className="orders-link" disabled={busy} onClick={onClear}>Clear selection</button><span>Displayed eligible orders only.</span></div>}
  {busy&&<p role="status">Updating selected orders…</p>}
  {result&&<div className="orders-feedback" role="status"><p>{result.success.length} orders updated. {result.failures.length} failed.</p>{result.success.length>0&&<details><summary>Updated orders ({result.success.length})</summary>{result.success.map(id=><p key={id}>{result.labels[id]||id}: Updated.</p>)}</details>}{result.failures.map(failure=><p key={failure.request.id}>{failure.reference}: {failure.message}</p>)}{result.failures.some(failure=>failure.uncertain&&items.some(item=>item.id===failure.request.id))&&<button className="admin-secondary" disabled={!allowed||busy||refreshing} onClick={()=>void run(result.failures.filter(failure=>failure.uncertain&&items.some(item=>item.id===failure.request.id)).map(failure=>failure.request))}>Retry uncertain actions safely</button>}<button aria-label="Dismiss bulk results" className="orders-link" disabled={busy} onClick={()=>setResult(null)}>Dismiss</button></div>}
  {plan&&<dialog ref={dialog} className="orders-dialog" aria-labelledby="orders-bulk-title" onKeyDown={trapDialogFocus} onCancel={event=>{event.preventDefault();setPlan(null);}}><h2 id="orders-bulk-title">Confirm order changes</h2><p>{plan.length} orders will move to {plan[0].command}. Current revisions and transitions are checked by the server. Changed orders will be reported individually.</p><footer><button ref={cancel} className="admin-secondary" onClick={()=>setPlan(null)}>Cancel</button><button className="admin-primary" disabled={!allowed||busy} onClick={()=>void run(plan)}>Confirm &amp; Apply</button></footer></dialog>}
 </>;
}
