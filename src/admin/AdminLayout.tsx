import React, { useState } from 'react';
import {AdminNotificationBell} from '../orders/AdminBusiness.tsx';

interface AdminLayoutProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
  email: string;
  onSignOut: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentPath,
  onNavigate,
  children,
  email,
  onSignOut,
}) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const navItems: Array<{ path: string; label: string; icon: string; badge?: string }> = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/admin/orders', label: 'Orders', icon: 'local_mall' },
    { path: '/admin/products', label: 'Products & Inventory', icon: 'inventory_2' },
    { path: '/admin/categories', label: 'Categories', icon: 'category' },
    { path: '/admin/customers', label: 'Customers', icon: 'group' },
    { path: '/admin/coupons', label: 'Coupons', icon: 'loyalty' },
    { path: '/admin/settings', label: 'Store Settings', icon: 'settings' },
  ];

  return (
    <div className="min-h-screen bg-[#FBF7F0] flex flex-col md:flex-row text-[#231919] font-sans antialiased">
      {/* 240px Fixed Architectural Desktop Sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 h-screen w-60 flex-col justify-between bg-white border-r border-[#E8DDD6] z-30">
        <div className="flex flex-col w-full">
          {/* Brand Masthead */}
          <div className="h-20 flex items-center gap-3 px-4 border-b border-[#E8DDD6]">
            <div className="w-10 h-10 rounded-full border border-[#B88A44] bg-[#F4EEE5] flex items-center justify-center text-[#780D24] font-serif text-[16px] font-bold shrink-0 shadow-xs">
              PS
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-serif text-[15px] font-semibold text-[#780D24] tracking-wide truncate">
                PARINAYA SILKS
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] uppercase tracking-widest text-[#5F5552] font-semibold">
                  Admin Console
                </span>
                <span className="bg-[#B88A44]/20 text-[#780D24] text-[9px] font-bold px-1 rounded border border-[#B88A44]/40">
                  ADMIN
                </span>
              </div>
            </div>
          </div>

          {/* Nav Links */}
          <nav aria-label="Admin Navigation" className="flex flex-col py-3 w-full font-sans text-[13px]">
            {navItems.map((item) => {
              const isActive =
                currentPath === item.path ||
                (item.path === '/admin/dashboard' && currentPath === '/admin') ||
                (item.path === '/admin/orders' && currentPath.startsWith('/admin/orders')) ||
                (item.path === '/admin/products' && currentPath.startsWith('/admin/products'));

              return (
                <button
                  key={item.path}
                  onClick={() => onNavigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left font-medium ${
                    isActive
                      ? 'text-[#780D24] bg-[#F4EEE5] border-l-4 border-[#780D24] font-semibold'
                      : 'text-[#5F5552] hover:bg-[#FBF7F0] hover:text-[#231919]'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      isActive ? 'fill text-[#780D24]' : ''
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-[#780D24] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-[#E8DDD6] p-3 space-y-1.5">
          <button
            onClick={() => onNavigate('/')}
            className="w-full flex items-center justify-between px-3 py-2 text-[#5F5552] hover:text-[#780D24] hover:bg-[#F4EEE5] rounded text-[13px] font-medium transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">storefront</span>
              <span>View Public Store</span>
            </span>
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          </button>

          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-[#BA1A1A] hover:bg-red-50 rounded text-[13px] font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Sign Out</span>
          </button>

          <div className="p-2.5 bg-[#F4EEE5] border border-[#E8DDD6] rounded flex items-center gap-2">
            <span className="material-symbols-outlined text-[#B88A44] text-[18px]">verified</span>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-[#780D24] tracking-wider">
                Administrator access
              </span>
              <span className="text-[9px] text-[#5F5552]">Firebase Authentication</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-72 max-w-[85%] h-full bg-white flex flex-col justify-between p-4 border-r border-[#E8DDD6] shadow-2xl z-10">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#E8DDD6]">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-[#780D24] text-white font-serif flex items-center justify-center text-[12px] font-bold">
                    PS
                  </span>
                  <div>
                    <h3 className="font-serif text-[15px] font-bold text-[#780D24]">PARINAYA SILKS</h3>
                    <p className="text-[9px] uppercase tracking-wider text-[#5F5552]">Admin Console</p>
                  </div>
                </div>
                <button aria-label="Close admin menu" className="min-w-11 min-h-11" onClick={() => setMobileDrawerOpen(false)}>
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <nav className="py-4 space-y-1 font-sans text-[13px]">
                {navItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => {
                      onNavigate(item.path);
                      setMobileDrawerOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded text-left font-medium text-[#231919] hover:bg-[#F4EEE5]"
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#780D24]">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="border-t border-[#E8DDD6] pt-3 space-y-2 font-sans text-[13px]">
              <button
                onClick={() => {
                  onNavigate('/');
                  setMobileDrawerOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[#5F5552]"
              >
                <span className="material-symbols-outlined text-[18px]">storefront</span>
                <span>View Public Store</span>
              </button>
              <button
                onClick={() => {
                  onSignOut();
                  setMobileDrawerOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[#BA1A1A]"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Administrative Canvas */}
      <div className="flex-1 min-w-0 md:ml-60 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E8DDD6] h-16 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              aria-label="Open admin menu" onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden min-w-11 min-h-11 p-2 text-[#231919] hover:text-[#780D24]"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="font-serif text-[16px] sm:text-[20px] font-semibold text-[#780D24] truncate">
                Administration
              </span>
              <span className="hidden lg:inline text-[12px] font-sans text-[#5F5552]">
                | Hyderabad, India
              </span>
            </div>
          </div>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2.5"><AdminNotificationBell onNavigate={onNavigate}/>
            <span className="hidden sm:inline text-xs text-[#5F5552] truncate max-w-[110px] sm:max-w-[200px]" title={email}>{email}</span>
            <button onClick={onSignOut} className="min-h-11 px-2 text-xs text-[#780D24] underline md:hidden">Sign out</button>

          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1 max-w-[1440px] w-full mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
