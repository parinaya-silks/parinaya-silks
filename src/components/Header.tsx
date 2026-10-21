import React, { useEffect,useRef,useState } from 'react';
import { CartItem, WishlistItem } from '../types/index.ts';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  cartCount: number;
  wishlistCount: number;
  authLayout?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentPath,
  onNavigate,
  cartCount,
  wishlistCount,
  authLayout=false,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuTrigger=useRef<HTMLButtonElement>(null),drawer=useRef<HTMLElement>(null);
  const closeDrawer=()=>{menuTrigger.current?.focus();setDrawerOpen(false);};
  useEffect(()=>{
    if(!drawerOpen)return;
    const controls=()=>Array.from(drawer.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled])')||[]);
    controls()[0]?.focus();
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();closeDrawer();}
      if(event.key==='Tab'){const items=controls(),first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
    };
    document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);
  },[drawerOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

  return (
    <>

      {/* Approved Top App Bar (Deep Maroon #780D24, Single Row) */}
      <header className={'sticky top-0 z-40 bg-[#780D24] text-white shadow-md'+(authLayout?' customer-auth-header':'')}>
        <div className="flex justify-between items-center w-full px-4 h-16 max-w-7xl mx-auto">
          {/* Leading Menu Trigger */}
          <div className="flex items-center gap-2">
            <button
              aria-label="Open Navigation Drawer"
              ref={menuTrigger}
              aria-expanded={drawerOpen}
              aria-controls="storefront-navigation-drawer"
              className="p-2 -ml-2 text-white hover:text-[#F2BE72] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95"
              onClick={() => setDrawerOpen(true)}
              type="button"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>

            {/* Brand Logo: Circular PS Badge + PARINAYA SILKS on ONE LINE */}
            <button
              onClick={() => onNavigate('/')}
              className={'flex items-center gap-2.5 hover:opacity-95 transition-opacity text-left'+(authLayout?' auth-brand':'')}
              type="button"
            >
              <span className="w-8 h-8 rounded-full border border-[#B88A44]/80 bg-[#5E091B] flex items-center justify-center font-serif text-[13px] font-bold text-[#F2BE72] tracking-wider shrink-0 shadow-inner">
                PS
              </span>
              <span className="font-serif text-[16px] min-[390px]:text-[18px] sm:text-[20px] tracking-[0.10em] sm:tracking-[0.14em] uppercase font-medium text-white whitespace-nowrap">
                PARINAYA SILKS
              </span>
            </button>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden xl:flex items-center gap-6 text-[13px] font-medium tracking-wider uppercase text-[#FBF7F0]/90">
            <button
              onClick={() => onNavigate('/')}
              className={`hover:text-[#F2BE72] transition-colors py-1 ${currentPath === '/' ? 'text-[#F2BE72] font-semibold border-b border-[#F2BE72]' : ''}`}
            >
              Home
            </button>
            <button
              onClick={() => onNavigate('/shop')}
              className={`hover:text-[#F2BE72] transition-colors py-1 ${currentPath.startsWith('/shop') ? 'text-[#F2BE72] font-semibold border-b border-[#F2BE72]' : ''}`}
            >
              Shop Sarees
            </button>
            <button
              onClick={() => onNavigate('/about')}
              className={`hover:text-[#F2BE72] transition-colors py-1 ${currentPath === '/about' ? 'text-[#F2BE72] font-semibold border-b border-[#F2BE72]' : ''}`}
            >
              About Us
            </button>
            <button
              onClick={() => onNavigate('/contact')}
              className={`hover:text-[#F2BE72] transition-colors py-1 ${currentPath === '/contact' ? 'text-[#F2BE72] font-semibold border-b border-[#F2BE72]' : ''}`}
            >
              Contact Us
            </button>
            <button
              onClick={() => onNavigate('/policies')}
              className={`hover:text-[#F2BE72] transition-colors py-1 ${currentPath === '/policies' ? 'text-[#F2BE72] font-semibold border-b border-[#F2BE72]' : ''}`}
            >
              Policies
            </button>
          </nav>

          {/* Trailing Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Search Trigger */}
            <button
              aria-label="Search Catalog"
              className="p-2 text-white hover:text-[#F2BE72] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95"
              onClick={() => setSearchOpen(!searchOpen)}
              type="button"
            >
              <span className="material-symbols-outlined text-[22px]">search</span>
            </button>

            {/* Desktop Wishlist Link */}
            <div className={authLayout?'auth-extra':'contents'}>
            <button
              aria-label="Wishlist"
              className="hidden sm:flex relative p-2 text-white hover:text-[#F2BE72] transition-colors min-w-[44px] min-h-[44px] items-center justify-center active:scale-95"
              onClick={() => onNavigate('/wishlist')}
              type="button"
            >
              <span className="material-symbols-outlined text-[22px]">favorite</span>
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#B88A44] text-[#231919] font-sans text-[10px] font-bold flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Desktop Bag Link */}
            <button
              aria-label="Shopping Bag"
              className="hidden sm:flex relative p-2 text-white hover:text-[#F2BE72] transition-colors min-w-[44px] min-h-[44px] items-center justify-center active:scale-95"
              onClick={() => onNavigate('/bag')}
              type="button"
            >
              <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#F2BE72] text-[#5E091B] font-sans text-[10px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
            </div>
          </div>
        </div>

        {/* Collapsible Search Bar */}
        {searchOpen && (
          <div className="bg-[#5E091B] px-4 py-3 border-t border-[#B88A44]/30 shadow-inner">
            <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto flex items-center gap-2">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/70 text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search pure silk sarees, Kanjeevaram, Brocade, zari..."
                  className="w-full h-11 pl-10 pr-4 bg-white/10 text-white placeholder-white/60 border border-[#B88A44]/40 rounded-lg text-[14px] focus:outline-none focus:border-[#F2BE72] focus:ring-1 focus:ring-[#F2BE72]"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="h-11 px-5 bg-[#B88A44] hover:bg-[#d4a856] text-[#231919] font-sans text-[13px] font-semibold uppercase tracking-wider rounded-lg transition-colors"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="h-11 px-3 text-white/80 hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Slide-out Navigation Drawer & Backdrop */}
      <div
        className={`fixed inset-0 bg-[#231919]/60 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
        onClick={closeDrawer}
      />

      <aside
        ref={drawer}
        id="storefront-navigation-drawer"
        role="dialog"
        aria-label="Store navigation"
        aria-modal={drawerOpen||undefined}
        aria-hidden={!drawerOpen||undefined}
        inert={!drawerOpen||undefined}
        className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-[#FBF7F0] border-r border-[#E8DDD6] shadow-2xl z-50 transform transition-transform duration-300 flex flex-col p-5 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-[#E8DDD6]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#780D24] text-[#F2BE72] font-serif flex items-center justify-center text-[12px] font-bold border border-[#B88A44]/60">
              PS
            </span>
            <h2 className="font-serif text-[16px] text-[#780D24] uppercase tracking-wider font-semibold">
              PARINAYA SILKS
            </h2>
          </div>
          <button
            aria-label="Close Navigation Drawer"
            className="p-2 text-[#5F5552] hover:text-[#780D24] min-w-[44px] min-h-[44px] flex items-center justify-center"
            onClick={closeDrawer}
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex-1 space-y-1 text-sm font-medium">
          <button
            onClick={() => {
              onNavigate('/');
              closeDrawer();
            }}
            className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded hover:bg-[#F4EEE5] text-[#231919]"
          >
            <span className="material-symbols-outlined text-[#B88A44] text-[20px]">home</span>
            <span>Home</span>
          </button>
          <button
            onClick={() => {
              onNavigate('/shop');
              closeDrawer();
            }}
            className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded hover:bg-[#F4EEE5] text-[#231919]"
          >
            <span className="material-symbols-outlined text-[#B88A44] text-[20px]">styler</span>
            <span>Shop Sarees</span>
          </button>
          <button
            onClick={() => {
              onNavigate('/wishlist');
              closeDrawer();
            }}
            className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded hover:bg-[#F4EEE5] text-[#231919]"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#B88A44] text-[20px]">favorite</span>
              <span>My Wishlist</span>
            </div>
            {wishlistCount > 0 && (
              <span className="bg-[#B88A44] text-[#231919] text-[11px] font-bold px-2 py-0.5 rounded-full">
                {wishlistCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              onNavigate('/bag');
              closeDrawer();
            }}
            className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded hover:bg-[#F4EEE5] text-[#231919]"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#B88A44] text-[20px]">shopping_bag</span>
              <span>My Bag</span>
            </div>
            {cartCount > 0 && (
              <span className="bg-[#780D24] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                {cartCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              onNavigate('/account');
              closeDrawer();
            }}
            className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded hover:bg-[#F4EEE5] text-[#231919]"
          >
            <span className="material-symbols-outlined text-[#B88A44] text-[20px]">person</span>
            <span>My Account & Orders</span>
          </button>
          <button
            onClick={() => {
              onNavigate('/about');
              closeDrawer();
            }}
            className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded hover:bg-[#F4EEE5] text-[#231919]"
          >
            <span className="material-symbols-outlined text-[#B88A44] text-[20px]">info</span>
            <span>About Us</span>
          </button>
          <button
            onClick={() => {
              onNavigate('/contact');
              closeDrawer();
            }}
            className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded hover:bg-[#F4EEE5] text-[#231919]"
          >
            <span className="material-symbols-outlined text-[#B88A44] text-[20px]">chat</span>
            <span>Contact Us</span>
          </button>

          <div className="pt-4 mt-4 border-t border-[#E8DDD6]">
            <span className="px-3 text-[11px] font-semibold text-[#5F5552] uppercase tracking-widest block mb-2">
              Policies & Terms
            </span>
            <button
              onClick={() => {
                onNavigate('/policies?tab=shipping');
                closeDrawer();
              }}
              className="w-full text-left px-3 py-2 rounded text-[#231919] hover:bg-[#F4EEE5] flex items-center justify-between"
            >
              <span>Shipping Policy</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
            <button
              onClick={() => {
                onNavigate('/policies?tab=returns');
                closeDrawer();
              }}
              className="w-full text-left px-3 py-2 rounded text-[#231919] hover:bg-[#F4EEE5] flex items-center justify-between mt-1"
            >
              <span>Returns & Exchanges</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
            <button
              onClick={() => {
                onNavigate('/policies?tab=privacy');
                closeDrawer();
              }}
              className="w-full text-left px-3 py-2 rounded text-[#231919] hover:bg-[#F4EEE5] flex items-center justify-between mt-1"
            >
              <span>Privacy Policy</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
            <button
              onClick={() => {
                onNavigate('/policies?tab=terms');
                closeDrawer();
              }}
              className="w-full text-left px-3 py-2 rounded text-[#231919] hover:bg-[#F4EEE5] flex items-center justify-between mt-1"
            >
              <span>Terms & Conditions</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>


        </nav>

        <div className="pt-4 border-t border-[#E8DDD6] text-center text-[12px] text-[#5F5552]">
          Hyderabad, India
        </div>
      </aside>
    </>
  );
};
