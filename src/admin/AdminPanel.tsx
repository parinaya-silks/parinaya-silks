import {EnquiriesPage} from './enquiries/EnquiriesPage.tsx';
import {StoreSettingsPage} from './settings/StoreSettingsPage.tsx';
import {AboutEditor} from './about/AboutEditor.tsx';
import {CampaignManager} from './campaigns/CampaignManager.tsx';
import {CustomersList} from './customers/CustomersList.tsx';
import {CustomerDetails} from './customers/CustomerDetails.tsx';
import {initialCustomers,restoreCustomers,customerPath,customerUid} from './customers/model.ts';
import {getAdminClients} from '../services/firebase/adminAuth.ts';
import {OrdersList} from './orders/OrdersList.tsx';
import {initialOrderList} from './orders/model.ts';
import React,{useState} from 'react';
import {AdminDashboard} from './AdminDashboard.tsx';
import {DashboardDates} from './dashboard/Dates.tsx';
import {periodRange} from './dashboard/model.ts';
import {BannersPage} from './banners/BannersPage.tsx';
import {WebsiteContent} from './website/WebsiteContent.tsx';
import {ContactInformation} from './contact/ContactInformation.tsx';
import { AdminLayout } from './AdminLayout.tsx';
import {AdminReports} from '../orders/AdminBusiness.tsx';
import {CouponsPage} from './coupons/CouponsPage.tsx';
import {InventoryOverview} from './inventory/InventoryOverview.tsx';
import {OrderDetails} from './orders/OrderDetails.tsx';
import { ProductManager } from './ProductManager.tsx';
import { AdminCategories } from './AdminCategories.tsx';
import { safeAdminDestination } from './accessPolicy.ts';

function unavailableWrite(): never { throw new Error('This module is not connected. No live changes were saved.'); }

export function AdminPanel({ path, email, onSignOut }: { path: string; email: string; onSignOut: () => void }) {
  const [customersState,setCustomersState]=useState(()=>restoreCustomers(window.history.state,getAdminClients().auth.currentUser?.uid||''));
  const [ordersState,setOrdersState]=useState(initialOrderList);
  const [navigationVersion,refreshNavigation]=useState(0);
  const [range,setRange]=useState(()=>periodRange('month'));
  const navigate = (destination: string) => {
    if (!window.dispatchEvent(new Event('parinaya:before-admin-navigation', { cancelable: true }))) return;
    const target=new URL(destination,window.location.origin),status=target.searchParams.get('status'),reset=target.searchParams.get('reset')==='1';
    if(reset&&target.pathname==='/admin/customers')setCustomersState(initialCustomers());
    if(target.pathname==='/admin/orders'){if(['Placed','Confirmed','Processing','Shipped','Delivered'].includes(status||''))setOrdersState({...initialOrderList(),filters:{...initialOrderList().filters,statuses:[status as any]}});else if(reset||path==='/admin/orders'||!path.startsWith('/admin/orders/'))setOrdersState(initialOrderList());}
    const next = destination === '/' ? '/' : safeAdminDestination(target.pathname);
    window.history.pushState({attentionQuery:target.search,productsContext:reset&&target.pathname==='/admin/products'?undefined:window.history.state?.productsContext,customersContext:{uid:getAdminClients().auth.currentUser?.uid,state:reset&&target.pathname==='/admin/customers'?initialCustomers():path==='/admin/customers'?{...customersState,scroll:window.scrollY}:customersState}}, '', next);
    window.dispatchEvent(new PopStateEvent('popstate', { state: { skipUnsaved: true } }));
    refreshNavigation(n=>n+1);
    window.scrollTo(0, 0);
  };
  let content: React.ReactNode;
  if (path === '/admin' || path === '/admin/dashboard' || path === '/admin/login') {
    content = <AdminDashboard range={range} onNavigate={navigate}/>;
  } else if (path === '/admin/categories') {
    content = <AdminCategories onNavigate={navigate} />;
  } else if (path === '/admin/orders'||path.startsWith('/admin/orders/')) {
    content = path==='/admin/orders'?<OrdersList state={ordersState} onState={setOrdersState} onNavigate={navigate}/>:<OrderDetails id={path.split('/')[3]} onNavigate={navigate} onCustomer={uid=>navigate(customerPath(uid))}/>;
  } else if (path.startsWith('/admin/products')) {
    content = <ProductManager key={path} path={path} onNavigate={navigate} />;
  } else if (path === '/admin/settings') {
    content = <StoreSettingsPage/>;
  } else if (path === '/admin/customers') {
    content = <CustomersList state={customersState} onState={setCustomersState} onNavigate={navigate}/>;
  } else if (path.startsWith('/admin/customers/')) {
    let uid='';try{uid=customerUid(decodeURIComponent(path.slice('/admin/customers/'.length)));}catch{}
    content=uid?<CustomerDetails uid={uid} onNavigate={navigate}/>:<section><h1>Customer not found</h1><button onClick={()=>navigate('/admin/customers')}>Back to Customers</button></section>;
  } else if(path==='/admin/coupons'){content=<CouponsPage/>;
  } else if(path==='/admin/marketing'||path.startsWith('/admin/marketing/')){content=<CampaignManager key={path} path={path} onNavigate={navigate}/>;
  } else if(path==='/admin/inventory'){content=<InventoryOverview key={window.history.state?.attentionQuery||'all'} initialAlerts={window.history.state?.attentionQuery==='?stock=alerts'} onNavigate={navigate}/>;
  } else if(path==='/admin/banners'){content=<BannersPage/>;
  } else if(path==='/admin/website-content'||path.startsWith('/admin/website-content/')){content=<WebsiteContent path={path} onNavigate={navigate}/>;
  } else if(path==='/admin/contact-information'){content=<ContactInformation/>;
  } else if(path==='/admin/about'){content=<AboutEditor/>;
  } else if(path==='/admin/enquiries'){content=<EnquiriesPage key={window.history.state?.attentionQuery||'all'} initialStatus={window.history.state?.attentionQuery==='?status=New'?'New':'All'}/>;
  } else {
    const title = path.startsWith('/admin/orders/') ? 'Order Details' : path === '/admin/products/new' ? 'Add Product' : path.startsWith('/admin/products/edit/') ? 'Edit Product' : path === '/admin/coupons' ? 'Coupons & Loyalty' : 'Store Settings';
    content = <ModuleUnavailable title={title} />;
  }
  return <AdminLayout currentPath={path} onNavigate={navigate} onSignOut={onSignOut} email={email} headerActions={['/admin','/admin/dashboard','/admin/login'].includes(path)?<DashboardDates value={range} onChange={setRange}/>:undefined}>
    <div key={path+':'+navigationVersion}>{content}</div>
  </AdminLayout>;
}

export function ModuleUnavailable({ title }: { title: string }) {
  return <section className="space-y-5">
    <header className="pb-4 border-b border-[#E8DDD6]"><h1 className="font-serif text-2xl sm:text-[28px] font-semibold">{title}</h1></header>
    <div className="rounded-xl border border-[#E8DDD6] bg-white p-6 text-sm text-[#5F5552]">This section is not implemented. No live action is available.</div>
  </section>;
}
