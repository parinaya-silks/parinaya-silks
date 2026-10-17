import React from 'react';
import type { Customer, Order, Address } from '../types/index.ts';
interface AccountViewProps {
  customer: Customer;
  orders: Order[];
  onNavigate: (path: string) => void;
  onUpdateProfile: (updates: Partial<Customer>) => void;
  onAddAddress: (address: Omit<Address, 'id'>) => void;
  onRemoveAddress: (id: string) => void;
}
export const AccountView: React.FC<AccountViewProps> = ({ onNavigate }) => (
  <div className="pb-28 max-w-4xl mx-auto px-4 py-4 space-y-5">
        <div className="max-w-md mx-auto bg-white border border-[#E8DDD6] rounded-xl p-6 sm:p-8 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#780D24] border-2 border-[#B88A44] flex items-center justify-center text-white font-serif text-[22px] font-bold shadow-inner">
            PS
          </div>
          <div>
            <h1 className="font-serif text-[22px] text-[#231919] font-semibold">
              Sign In to Your Account
            </h1>
            <p className="font-sans text-[13px] text-[#5F5552] mt-1">
              Customer accounts are not available yet. You can continue browsing or contact us for assistance.
            </p>
          </div>
          <div className="space-y-3 text-left font-sans">
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#231919] mb-1">
                Mobile Number or Email
              </label>
              <input disabled
                type="text"
                placeholder="Your email or mobile number"
                className="w-full h-11 px-3.5 border border-[#E8DDD6] rounded-md text-[14px]"
              />
            </div>
            <button
              onClick={() => onNavigate('/login')}
              className="w-full py-3 bg-[#780D24] hover:bg-[#5E091B] text-white font-sans text-[13px] font-bold uppercase tracking-wider rounded-lg shadow-sm"
            >
              Sign In / Register
            </button>
          </div>
          <div className="pt-2">
            <button
              onClick={() => onNavigate('/')}
              className="text-[13px] font-sans text-[#780D24] hover:underline"
            >
              Continue Shopping →
            </button>
          </div>
        </div>
  </div>
);
