import React from 'react';
import {useAddressBook} from './useAddressBook.ts';
import {AddressManager} from './AddressManager.tsx';
export function AddressesView({onNavigate}:{onNavigate:(path:string)=>void}){
  const book=useAddressBook();
  return <div className="max-w-3xl mx-auto px-4 py-6 pb-28 space-y-5"><button onClick={()=>onNavigate('/account')} className="min-h-11 text-[#780D24] underline">Back to My Account</button><h1 className="font-serif text-3xl text-[#780D24]">My Addresses</h1><AddressManager key={book.uid} book={book}/></div>;
}
