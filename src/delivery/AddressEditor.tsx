import React,{useEffect,useRef,useState} from 'react';
import {ProductError} from '../products/model.ts';
import {blankAddress,indiaStates,validateAddress,type AddressInput,type DeliveryAddress} from './model.ts';
import {deliveryOperation} from './client.ts';
import type {AddressBookState} from './useAddressBook.ts';

export function AddressEditor({book,address,onClose,onSaved}:{book:AddressBookState;address:DeliveryAddress|null;onClose:()=>void;onSaved:(id:string,revision:number)=>void}){
  const dialog=useRef<HTMLDialogElement>(null),form=useRef<HTMLFormElement>(null),lock=useRef(false),mounted=useRef(true);
  const touched=useRef(new Set<string>());
  const [value,setValue]=useState<AddressInput>(()=>address?Object.fromEntries(Object.keys(blankAddress()).map(key=>[key,address[key as keyof AddressInput]])) as unknown as AddressInput:{...blankAddress(),recipientName:book.prefill.name,mobileNumber:book.prefill.mobile});
  const [error,setError]=useState(''),[fields,setFields]=useState<Record<string,string>>({}),[saving,setSaving]=useState(false);
  const identity=useRef({id:address?.id||deliveryOperation(),operationId:deliveryOperation(),signature:''});
  const revision=useRef(address?.revision||0);
  useEffect(()=>{if(!address)setValue(previous=>({...previous,...(!touched.current.has('recipientName')?{recipientName:book.prefill.name}:{}),...(!touched.current.has('mobileNumber')?{mobileNumber:book.prefill.mobile}:{})}));},[address,book.prefill.name,book.prefill.mobile]);
  useEffect(()=>{mounted.current=true;const previous=document.activeElement as HTMLElement|null;dialog.current?.showModal();form.current?.querySelector<HTMLInputElement>('input')?.focus();return()=>{mounted.current=false;dialog.current?.close();if(previous?.isConnected)previous.focus();};},[]);
  async function submit(event:React.FormEvent){
    event.preventDefault();if(lock.current)return;setError('');setFields({});
    let clean:AddressInput;
    try{clean=validateAddress(value);}catch(error){const invalid=error instanceof ProductError?error.fields:{};setFields(invalid);setError('Please check the address fields.');requestAnimationFrame(()=>form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());return;}
    const signature=JSON.stringify(clean);if(identity.current.signature&&identity.current.signature!==signature)identity.current.operationId=deliveryOperation();identity.current.signature=signature;
    lock.current=true;setSaving(true);
    try{const result=await book.mutate({action:'addresses:save',id:identity.current.id,expectedRevision:revision.current,operationId:identity.current.operationId,address:clean});if(mounted.current)onSaved(result.id,result.bookRevision);}
    catch(error){if(mounted.current){setError(error instanceof Error?error.message:'Unable to save. Please retry.');setFields(error instanceof ProductError?error.fields:{});}}
    finally{lock.current=false;if(mounted.current)setSaving(false);}
  }
  const input=(key:Exclude<keyof AddressInput,'country'|'state'>,label:string,options:React.InputHTMLAttributes<HTMLInputElement>={})=><div><label htmlFor={'delivery-'+key} className="block text-sm font-medium mb-1">{label}</label><input id={'delivery-'+key} value={value[key]} onChange={event=>{touched.current.add(key);setValue(previous=>({...previous,[key]:event.target.value}));}} disabled={saving} required={!['landmark','label'].includes(key)} className="w-full min-h-12 rounded border border-[#BDB6AE] p-3 bg-white text-base" aria-invalid={!!fields[key]} aria-describedby={fields[key]?'error-'+key:undefined} {...options}/>{fields[key]&&<p id={'error-'+key} className="text-sm text-[#780D24] mt-1">{fields[key]}</p>}</div>;
  return <dialog ref={dialog} aria-labelledby="address-editor-title" onCancel={event=>{event.preventDefault();if(!saving)onClose();}} className="m-auto w-[calc(100%_-_2rem)] max-w-xl max-h-[85dvh] overflow-y-auto rounded-xl border border-[#E8DDD6] bg-[#FBF7F0] p-5 backdrop:bg-black/50">
    <h2 id="address-editor-title" className="font-serif text-2xl text-[#780D24] mb-5">{address?'Edit delivery address':'Add delivery address'}</h2>
    <form ref={form} onSubmit={submit} noValidate className="space-y-4" aria-label="Delivery address">
      {error&&<div role="alert" className="border border-[#780D24] rounded p-3 text-sm text-[#780D24]">{error}</div>}
      {error&&address&&<div className="text-sm"><p>Reloading replaces this form with the latest saved version.</p><button type="button" disabled={saving} className="min-h-11 underline text-[#780D24]" onClick={async()=>{const fresh=await book.reload();const latest=fresh?.addresses.find(item=>item.id===address.id);if(!mounted.current)return;if(latest){setValue(Object.fromEntries(Object.keys(blankAddress()).map(key=>[key,latest[key as keyof AddressInput]])) as unknown as AddressInput);revision.current=latest.revision;identity.current.operationId=deliveryOperation();identity.current.signature='';setError('');setFields({});}else if(fresh)onClose();}}>Reload saved address</button></div>}
      {input('recipientName','Recipient full name',{autoComplete:'shipping name',maxLength:100})}
      {input('mobileNumber','Mobile number',{type:'tel',autoComplete:'shipping tel',maxLength:40,placeholder:'+91 98765 43210'})}
      <p className="text-xs text-[#5F5552]">Default country code: +91. Include the country code for other numbers.</p>
      {input('pinCode','PIN code',{inputMode:'numeric',autoComplete:'shipping postal-code',maxLength:6})}
      {input('line1','House, building and street',{autoComplete:'shipping address-line1',maxLength:180})}
      {input('locality','Area / locality',{autoComplete:'shipping address-line2',maxLength:100})}
      <div className="grid sm:grid-cols-2 gap-4">{input('city','City / town',{autoComplete:'shipping address-level2',maxLength:100})}<div><label htmlFor="delivery-state" className="block text-sm font-medium mb-1">State / Union Territory</label><select id="delivery-state" autoComplete="shipping address-level1" required disabled={saving} value={value.state} onChange={event=>setValue(previous=>({...previous,state:event.target.value}))} className="w-full min-h-12 max-w-full rounded border border-[#BDB6AE] p-3 bg-white text-base" aria-invalid={!!fields.state} aria-describedby={fields.state?'error-state':undefined}><option value="">Select state or UT</option>{indiaStates.map(state=><option key={state}>{state}</option>)}</select>{fields.state&&<p id="error-state" className="text-sm text-[#780D24]">{fields.state}</p>}</div></div>
      {input('landmark','Landmark (optional)',{maxLength:160})}{input('label','Label (optional)',{maxLength:30,placeholder:'Home, Work or Other'})}
      <p className="text-sm">Country: India</p><p className="text-xs text-[#5F5552]">PIN format does not confirm delivery availability. Recipient details do not change your account profile.</p>
      <div className="flex gap-3 flex-wrap pt-2"><button type="submit" disabled={saving} className="min-h-12 px-5 rounded bg-[#780D24] text-white disabled:opacity-50">{saving?'Saving…':'Save address'}</button><button type="button" disabled={saving} onClick={onClose} className="min-h-12 px-5 rounded border border-[#780D24] text-[#780D24]">Cancel</button></div>
    </form>
  </dialog>;
}
