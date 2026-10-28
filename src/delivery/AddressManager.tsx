import React,{useEffect,useRef,useState} from 'react';
import type {DeliveryAddress} from './model.ts';
import {ADDRESS_LIMIT} from './model.ts';
import type {AddressBookState} from './useAddressBook.ts';
import {deliveryOperation} from './client.ts';
import {AddressEditor} from './AddressEditor.tsx';

export function AddressManager({book,selected,onSelect,onSaved,checkout=false,profile=false}:{book:AddressBookState;selected?:string;onSelect?:(id:string)=>void;onSaved?:(id:string,revision:number)=>void;checkout?:boolean;profile?:boolean}){
  const [editor,setEditor]=useState<DeliveryAddress|null|undefined>(undefined),[deleting,setDeleting]=useState<DeliveryAddress|null>(null),[error,setError]=useState('');
  const attempt=useRef<{signature:string;operationId:string}|null>(null),lock=useRef(false),active=useRef(true);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  async function change(action:string,address:DeliveryAddress){
    if(lock.current)return;lock.current=true;setError('');const signature=action+address.id+address.revision;
    if(attempt.current?.signature!==signature)attempt.current={signature,operationId:deliveryOperation()};
    try{await book.mutate({action,id:address.id,expectedRevision:address.revision,operationId:attempt.current.operationId});if(active.current){setDeleting(null);attempt.current=null;}}
    catch(error){if(active.current)setError(error instanceof Error?error.message:'Unable to update your addresses. Please retry.');}
    finally{lock.current=false;}
  }
  return <section aria-label="Saved delivery addresses" className={profile?"profile-card profile-addresses":checkout?"checkout-address-list":"space-y-4"}>
    {!checkout&&<div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-serif text-xl">{profile?'Saved Addresses':'Delivery address'}</h2>{profile&&book.status==='ready'&&<span className="profile-address-count">{book.addresses.length} of {ADDRESS_LIMIT} saved</span>}<button disabled={book.status!=='ready'||book.busy||book.addresses.length>=ADDRESS_LIMIT} onClick={()=>{setError('');setEditor(null);}} className="min-h-11 px-4 border border-[#780D24] text-[#780D24] rounded disabled:opacity-50">Add address</button></div>}
    {checkout&&<header><h2>Saved addresses ({book.status==='ready'?book.addresses.length:'...'})</h2><span>Choose a delivery address</span></header>}
    {book.status==='loading'&&<p role="status">Loading your addresses…</p>}
    {book.status==='error'&&<div role="alert" className="space-y-2"><p>Unable to load your addresses.</p><button className="min-h-11 underline text-[#780D24]" onClick={book.reload}>Retry addresses</button></div>}
    {error&&<div role="alert"><p className="text-sm text-[#780D24]">{error}</p><button className="min-h-11 underline" onClick={book.reload}>Reload addresses</button></div>}
    {book.status==='ready'&&!book.addresses.length&&<p className="text-sm text-[#5F5552]">No saved addresses yet. Add your first delivery address.</p>}
    {book.status==='ready'&&book.addresses.map(address=><article key={address.id} data-address-id={address.id} data-default={book.defaultAddressId===address.id} className={(profile?'profile-address-card ':'')+'rounded-xl border p-4 bg-white space-y-2 break-words '+(selected===address.id?'border-[#780D24]':'border-[#E8DDD6]')}>
      {onSelect?<label className="flex gap-3 items-center min-h-11 font-semibold"><input type="radio" name="delivery-address" value={address.id} checked={selected===address.id} onChange={()=>onSelect(address.id)} className="w-5 h-5 accent-[#780D24]"/>{address.recipientName}{address.label&&' — '+address.label}</label>:<h3 className="font-semibold">{address.recipientName}{address.label&&' — '+address.label}</h3>}
      {book.defaultAddressId===address.id&&<p className="text-xs text-[#780D24]">Default delivery address</p>}
      <p className="text-sm">{address.line1}, {address.locality}<br/>{address.city}, {address.state} {address.pinCode}<br/>India{address.landmark&&<><br/>Landmark: {address.landmark}</>}</p><p className="text-sm">{address.mobileNumber}</p>
      <div className="flex flex-wrap gap-x-5"><button disabled={book.busy} onClick={()=>{setError('');setEditor(address);}} className="min-h-11 text-sm underline text-[#780D24]">Edit address</button>{book.defaultAddressId!==address.id&&<button disabled={book.busy} onClick={()=>void change('addresses:default',address)} className="min-h-11 text-sm underline text-[#780D24]">Set as default</button>}<button disabled={book.busy} onClick={()=>{setError('');setDeleting(address);}} className="min-h-11 text-sm underline text-[#780D24]">Delete address</button></div>
    </article>)}
    {book.status==='ready'&&(checkout?<button className="checkout-add-address" disabled={book.busy||book.addresses.length>=ADDRESS_LIMIT} onClick={()=>{setError('');setEditor(null);}}>+ Add address</button>:<p className="text-xs text-[#5F5552]">{book.addresses.length} of {ADDRESS_LIMIT} addresses saved.</p>)}
    {book.status==='ready'&&book.addresses.length>=ADDRESS_LIMIT&&<p className="profile-address-limit">You can save up to {ADDRESS_LIMIT} delivery addresses. Edit or remove an existing address before adding another. Existing addresses are kept.</p>}
    {editor!==undefined&&<AddressEditor checkout={checkout} profile={profile} book={book} address={editor} onClose={()=>setEditor(undefined)} onSaved={(id,revision)=>{setEditor(undefined);onSaved?.(id,revision);}}/>}
    {deleting&&<DeleteAddress profile={profile} address={deleting} busy={book.busy} error={error} onCancel={()=>setDeleting(null)} onConfirm={()=>void change('addresses:delete',deleting)}/>}
  </section>;
}
function DeleteAddress({address,busy,error,onCancel,onConfirm,profile=false}:{profile?:boolean;address:DeliveryAddress;busy:boolean;error:string;onCancel:()=>void;onConfirm:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null),cancel=useRef<HTMLButtonElement>(null);
  useEffect(()=>{const previous=document.activeElement as HTMLElement|null,root=dialog.current?.closest('.customer-profile');dialog.current?.showModal();cancel.current?.focus();return()=>{dialog.current?.close();if(previous?.isConnected)previous.focus();else if(root?.isConnected)root.querySelector<HTMLButtonElement>('.profile-addresses button')?.focus();};},[]);
  return <dialog ref={dialog} aria-labelledby="delete-address-title" onCancel={event=>{event.preventDefault();if(!busy)onCancel();}} className={(profile?"profile-dialog profile-delete-dialog ":"")+"m-auto max-w-md w-[calc(100%_-_2rem)] rounded-xl p-5 bg-[#FBF7F0] backdrop:bg-black/50"}><h2 id="delete-address-title" className="font-serif text-2xl">Delete this address?</h2><p className="my-4 text-sm">Remove the saved delivery address for {address.recipientName}? Your Bag will stay unchanged.</p>{error&&<p role="alert" className="text-sm text-[#780D24]">{error}</p>}<div className="flex flex-wrap gap-3"><button ref={cancel} disabled={busy} onClick={onCancel} className="min-h-12 px-5 border rounded">Cancel deletion</button><button disabled={busy} onClick={onConfirm} className="min-h-12 px-5 rounded bg-[#780D24] text-white">{busy?'Deleting…':'Confirm deletion'}</button></div></dialog>;
}
