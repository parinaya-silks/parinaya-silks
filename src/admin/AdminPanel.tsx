import {OrdersList} from './orders/OrdersList.tsx';
import {initialOrderList} from './orders/model.ts';
import React,{useState} from 'react';
import {AdminDashboard} from './AdminDashboard.tsx';
import {DashboardDates} from './dashboard/Dates.tsx';
import {periodRange} from './dashboard/model.ts';
import {AdminContent} from '../content/AdminContent.tsx';
import { AdminLayout } from './AdminLayout.tsx';
import {AdminCoupons,AdminCustomerDirectory,AdminReports,AdminInventory} from '../orders/AdminBusiness.tsx';
import {OrderDetails} from './orders/OrderDetails.tsx';
import { ProductManager } from './ProductManager.tsx';
import {AdminShippingSettings} from '../shipping/AdminShippingSettings.tsx';
import {AdminLoginAppearance} from '../appearance/AdminLoginAppearance.tsx';
import { AdminCategories } from './AdminCategories.tsx';
import { safeAdminDestination } from './accessPolicy.ts';

function unavailableWrite(): never { throw new Error('This module is not connected. No live changes were saved.'); }

export function AdminPanel({ path, email, onSignOut }: { path: string; email: string; onSignOut: () => void }) {
  const [customerUid,setCustomerUid]=useState('');
  const [ordersState,setOrdersState]=useState(initialOrderList);
  const [range,setRange]=useState(()=>periodRange('month'));
  const navigate = (destination: string) => {
    if (!window.dispatchEvent(new Event('parinaya:before-admin-navigation', { cancelable: true }))) return;
    const next = destination === '/' ? '/' : safeAdminDestination(destination);
    window.history.pushState(null, '', next);
    window.dispatchEvent(new PopStateEvent('popstate', { state: { skipUnsaved: true } }));
    window.scrollTo(0, 0);
  };
  let content: React.ReactNode;
  if (path === '/admin' || path === '/admin/dashboard' || path === '/admin/login') {
    content = <AdminDashboard range={range} onNavigate={navigate}/>;
  } else if (path === '/admin/categories') {
    content = <AdminCategories onNavigate={navigate} />;
  } else if (path === '/admin/orders'||path.startsWith('/admin/orders/')) {
    content = path==='/admin/orders'?<OrdersList state={ordersState} onState={setOrdersState} onNavigate={navigate}/>:<OrderDetails id={path.split('/')[3]} onNavigate={navigate} onCustomer={uid=>{setCustomerUid(uid);navigate('/admin/customers');}}/>;
  } else if (path.startsWith('/admin/products')) {
    content = <ProductManager key={path} path={path} onNavigate={navigate} />;
  } else if (path === '/admin/settings') {
    content = <div className="space-y-8"><AdminLoginAppearance/><AdminShippingSettings/></div>;
  } else if (path === '/admin/customers') {
    content = <AdminCustomerDirectory onNavigate={navigate} initialCustomerUid={customerUid}/>;
  } else if(path==='/admin/coupons'||path==='/admin/marketing'){content=<AdminCoupons/>;
  } else if(path==='/admin/inventory'){content=<AdminInventory/>;
  } else if(path==='/admin/banners'){content=<AdminContent section="banners"/>;
  } else if(path==='/admin/website-content'){content=<AdminContent section="website"/>;
  } else if(path==='/admin/contact-information'){content=<AdminContent section="contact"/>;
  } else if(path==='/admin/about'){content=<ModuleUnavailable title="About Us"/>;
  } else if(path==='/admin/enquiries'){content=<ModuleUnavailable title="Customer Enquiries"/>;
  } else {
    const title = path.startsWith('/admin/orders/') ? 'Order Details' : path === '/admin/products/new' ? 'Add Product' : path.startsWith('/admin/products/edit/') ? 'Edit Product' : path === '/admin/coupons' ? 'Coupons & Loyalty' : 'Store Settings';
    content = <ModuleUnavailable title={title} />;
  }
  return <AdminLayout currentPath={path} onNavigate={navigate} onSignOut={onSignOut} email={email} headerActions={['/admin','/admin/dashboard','/admin/login'].includes(path)?<DashboardDates value={range} onChange={setRange}/>:undefined}>
    <div key={path}>{content}</div>
  </AdminLayout>;
}

export function ModuleUnavailable({ title }: { title: string }) {
  return <section className="space-y-5">
    <header className="pb-4 border-b border-[#E8DDD6]"><h1 className="font-serif text-2xl sm:text-[28px] font-semibold">{title}</h1></header>
    <div className="rounded-xl border border-[#E8DDD6] bg-white p-6 text-sm text-[#5F5552]">This section is not implemented. No live action is available.</div>
  </section>;
}
