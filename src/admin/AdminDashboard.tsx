import React from 'react';
import { Order, Product } from '../types/index.ts';
import { formatINR } from '../utils/pricing.ts';

interface AdminDashboardProps {
  unavailable?: boolean;
  orders: Order[];
  products: Product[];
  onNavigate: (path: string) => void;
  onAdjustStock: (product: Product, delta: number) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  unavailable,
  orders,
  products,
  onNavigate,
  onAdjustStock,
}) => {
  return <div className="space-y-6">
    <header className="pb-4 border-b border-[#E8DDD6]"><h1 className="font-serif text-[24px] sm:text-[28px] font-semibold">Dashboard</h1><p className="text-sm text-[#5F5552] mt-2">Store reporting is not connected yet.</p></header>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{['Gross Sales', 'Total Orders', 'Awaiting Dispatch', 'Low Stock Sarees'].map(label => <div key={label} className="rounded-xl border border-[#E8DDD6] bg-white p-4 shadow-xs"><p className="text-xs uppercase text-[#5F5552] font-semibold">{label}</p><p className="text-2xl mt-3" aria-label="Unavailable">—</p><p className="text-xs text-[#5F5552] mt-2">Not connected</p></div>)}</div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5"><section className="lg:col-span-2 bg-white border border-[#E8DDD6] rounded-xl p-5 min-h-52"><h2 className="font-serif text-xl">Revenue Progression</h2><p className="mt-8 text-sm text-[#5F5552]">Reporting will appear after orders are connected.</p></section><section className="bg-white border border-[#E8DDD6] rounded-xl p-5"><h2 className="font-serif text-xl">Inventory Summary</h2><p className="mt-8 text-sm text-[#5F5552]">Inventory is not connected.</p></section></div>
    <section className="bg-white border border-[#E8DDD6] rounded-xl p-5"><h2 className="font-serif text-xl">Recent Orders</h2><p className="mt-4 text-sm text-[#5F5552]">Order data is unavailable.</p></section>
  </div>;
};
