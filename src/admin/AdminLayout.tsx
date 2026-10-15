import React, { useState } from 'react';

interface AdminLayoutProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentPath,
  onNavigate,
  children,
}) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isAdminRole, setIsAdminRole] = useState(true);
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);

  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/admin/orders', label: 'Orders', icon: 'local_mall', badge: '46' },
    { path: '/admin/products', label: 'Products & Inventory', icon: 'inventory_2' },
    { path: '/admin/customers', label: 'Customers', icon: 'group' },
    { path: '/admin/coupons', label: 'Coupons & Loyalty', icon: 'loyalty' },
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
                  Atelier Console
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
            onClick={() => onNavigate('/login')}
            className="w-full flex items-center gap-2 px-3 py-2 text-[#BA1A1A] hover:bg-red-50 rounded text-[13px] font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Sign Out</span>
          </button>

          <div className="p-2.5 bg-[#F4EEE5] border border-[#E8DDD6] rounded flex items-center gap-2">
            <span className="material-symbols-outlined text-[#B88A44] text-[18px]">verified</span>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-[#780D24] tracking-wider">
                100% Heirloom Silks
              </span>
              <span className="text-[9px] text-[#5F5552]">Silk Mark Certified Registry</span>
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
                    <p className="text-[9px] uppercase tracking-wider text-[#5F5552]">Atelier Console</p>
                  </div>
                </div>
                <button onClick={() => setMobileDrawerOpen(false)}>
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
                  onNavigate('/login');
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
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E8DDD6] h-16 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden p-2 text-[#231919] hover:text-[#780D24]"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-[18px] sm:text-[20px] font-semibold text-[#780D24]">
                Atelier Administration
              </span>
              <span className="hidden lg:inline text-[12px] font-sans text-[#5F5552]">
                | Hyderabad Central Loom
              </span>
            </div>
          </div>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2.5">
            {/* Access Role Toggle Button */}
            <button
              onClick={() => setIsAdminRole(!isAdminRole)}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-[#E8DDD6] rounded bg-[#FBF7F0] text-[#231919] text-[12px] font-sans font-medium hover:border-[#B88A44] transition-colors"
              title="Toggle View Simulation"
            >
              <span
                className={`w-2 h-2 rounded-full ${isAdminRole ? 'bg-emerald-600' : 'bg-amber-500'}`}
              />
              <span>{isAdminRole ? 'Admin View' : 'Restricted View'}</span>
              <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
            </button>

            {/* Date Range Selector */}
            <div className="relative">
              <button
                onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
                className="h-9 px-3 flex items-center gap-1.5 border border-[#E8DDD6] bg-white rounded text-[12px] font-sans font-medium hover:border-[#B88A44] transition-colors"
              >
                <span className="material-symbols-outlined text-[16px] text-[#B88A44]">
                  calendar_today
                </span>
                <span className="hidden sm:inline">{dateRange}</span>
                <span className="material-symbols-outlined text-[16px]">expand_more</span>
              </button>

              {dateDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-[#E8DDD6] shadow-lg rounded-lg py-1 z-50 text-[12px] font-sans">
                  {['Today', 'This Week', 'This Month', 'Last 30 Days'].map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        setDateRange(d);
                        setDateDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 hover:bg-[#F4EEE5] ${
                        dateRange === d ? 'text-[#780D24] font-bold bg-[#F4EEE5]' : 'text-[#231919]'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => alert('Atelier Notification: 3 new bridal orders waiting for packaging verification.')}
              className="w-9 h-9 flex items-center justify-center rounded border border-[#E8DDD6] hover:bg-[#F4EEE5] text-[#231919] relative"
              title="Notifications"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#780D24]" />
            </button>

            {/* Admin Avatar Pill */}
            <div className="flex items-center pl-2 border-l border-[#E8DDD6] gap-2">
              <div className="w-8 h-8 rounded-full border border-[#B88A44] bg-[#F4EEE5] text-[#780D24] font-serif font-bold text-[12px] flex items-center justify-center shrink-0">
                GV
              </div>
              <div className="hidden xl:flex flex-col text-left font-sans leading-none">
                <span className="text-[13px] font-semibold text-[#231919]">Gayatri V.</span>
                <span className="text-[10px] text-[#5F5552] mt-0.5">Store Manager</span>
              </div>
            </div>
          </div>
        </header>

        {/* Restricted View Notice Banner if active */}
        {!isAdminRole && (
          <div className="bg-amber-50 border-b border-amber-300 p-3 px-6 flex items-center justify-between text-[13px] font-sans text-amber-900">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-700">lock</span>
              <span>
                <strong>Restricted Simulation:</strong> Price editing and dispatch authorizations are locked in this preview mode.
              </span>
            </div>
            <button
              onClick={() => setIsAdminRole(true)}
              className="text-[#780D24] font-bold underline text-[12px]"
            >
              Restore Admin View
            </button>
          </div>
        )}

        {/* Page Content */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1 max-w-[1440px] w-full mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
