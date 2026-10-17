import React from 'react';
import { AdminLayout } from './AdminLayout.tsx';
import { AdminDashboard } from './AdminDashboard.tsx';
import { AdminOrders } from './AdminOrders.tsx';
import { AdminProducts } from './AdminProducts.tsx';
import { AdminCustomers } from './AdminCustomers.tsx';
import { safeAdminDestination } from './accessPolicy.ts';

function unavailableWrite(): never { throw new Error('This module is not connected. No live changes were saved.'); }

export function AdminPanel({ path, email, onSignOut }: { path: string; email: string; onSignOut: () => void }) {
  const navigate = (destination: string) => {
    const next = destination === '/' ? '/' : safeAdminDestination(destination);
    window.history.pushState(null, '', next);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo(0, 0);
  };
  let content: React.ReactNode;
  if (path === '/admin' || path === '/admin/dashboard' || path === '/admin/login') {
    content = <AdminDashboard unavailable orders={[]} products={[]} onNavigate={navigate} onAdjustStock={unavailableWrite} />;
  } else if (path === '/admin/orders') {
    content = <fieldset disabled className="min-w-0"><AdminOrders unavailable orders={[]} onNavigate={navigate} onUpdateStatus={unavailableWrite} onBulkUpdateStatus={unavailableWrite} /></fieldset>;
  } else if (path === '/admin/products') {
    content = <><button className="min-h-11 px-4 mb-4 rounded-lg border border-[#B88A44] text-[#780D24]" onClick={() => navigate('/admin/products/new')}>Open product editor</button><fieldset disabled className="min-w-0"><AdminProducts unavailable products={[]} onNavigate={navigate} onAdjustStock={unavailableWrite} onToggleStatus={unavailableWrite} /></fieldset></>;
  } else if (path === '/admin/customers') {
    content = <fieldset disabled className="min-w-0"><AdminCustomers unavailable customers={[]} orders={[]} onNavigate={navigate} /></fieldset>;
  } else {
    const title = path.startsWith('/admin/orders/') ? 'Order Details' : path === '/admin/products/new' ? 'Add Product' : path.startsWith('/admin/products/edit/') ? 'Edit Product' : path === '/admin/coupons' ? 'Coupons & Loyalty' : 'Store Settings';
    content = <ModuleUnavailable title={title} />;
  }
  return <AdminLayout currentPath={path} onNavigate={navigate} onSignOut={onSignOut} email={email}>
    <div role="note" className="mb-5 rounded-lg border border-[#B88A44]/40 bg-[#F4EEE5] p-4 text-sm text-[#5F5552]">Administrator access is active. Business modules are not connected yet. No live records are displayed and no changes can be saved.</div>
    <div key={path}>{content}</div>
  </AdminLayout>;
}

export function ModuleUnavailable({ title }: { title: string }) {
  return <section className="space-y-5">
    <header className="pb-4 border-b border-[#E8DDD6]"><h1 className="font-serif text-2xl sm:text-[28px] font-semibold">{title}</h1></header>
    <div className="rounded-xl border border-[#E8DDD6] bg-white p-6 text-sm text-[#5F5552]">This module is not connected to production data. Its existing editor will be enabled when this module is connected and tested. No live action is available.</div>
  </section>;
}
