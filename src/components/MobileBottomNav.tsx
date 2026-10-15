import React from 'react';

interface MobileBottomNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  cartCount: number;
  wishlistCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentPath,
  onNavigate,
  cartCount,
  wishlistCount,
}) => {
  // Determine active tab
  // Strictly: Home, Shop, Wishlist, Bag, Account
  // Information and policy pages must NOT falsely highlight an unrelated tab!
  const isHome = currentPath === '/';
  const isShop = currentPath.startsWith('/shop') || currentPath.startsWith('/product');
  const isWishlist = currentPath === '/wishlist';
  const isBag = currentPath === '/bag';
  const isAccount = currentPath.startsWith('/account') || currentPath === '/login' || currentPath === '/register';

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 w-full z-40 flex justify-around items-center px-2 pb-safe h-[calc(4rem+env(safe-area-inset-bottom))] bg-white border-t border-[#E8DDD6] shadow-[0_-2px_10px_rgba(35,25,25,0.06)]"
    >
      {/* 1. Home */}
      <button
        type="button"
        onClick={() => onNavigate('/')}
        className={`flex flex-col items-center justify-center py-1 min-w-[56px] min-h-[44px] transition-colors ${
          isHome ? 'text-[#780D24] font-semibold' : 'text-[#5F5552] hover:text-[#231919]'
        }`}
      >
        <span
          className={`material-symbols-outlined text-[22px] ${isHome ? 'fill' : ''}`}
        >
          home
        </span>
        <span className={`text-[10px] mt-0.5 tracking-tight ${isHome ? 'font-bold' : 'font-normal'}`}>
          Home
        </span>
        {isHome && <span className="w-1.5 h-1.5 bg-[#780D24] rounded-full mt-0.5"></span>}
      </button>

      {/* 2. Shop */}
      <button
        type="button"
        onClick={() => onNavigate('/shop')}
        className={`flex flex-col items-center justify-center py-1 min-w-[56px] min-h-[44px] transition-colors ${
          isShop ? 'text-[#780D24] font-semibold' : 'text-[#5F5552] hover:text-[#231919]'
        }`}
      >
        <span
          className={`material-symbols-outlined text-[22px] ${isShop ? 'fill' : ''}`}
        >
          grid_view
        </span>
        <span className={`text-[10px] mt-0.5 tracking-tight ${isShop ? 'font-bold' : 'font-normal'}`}>
          Shop
        </span>
        {isShop && <span className="w-1.5 h-1.5 bg-[#780D24] rounded-full mt-0.5"></span>}
      </button>

      {/* 3. Wishlist */}
      <button
        type="button"
        onClick={() => onNavigate('/wishlist')}
        className={`relative flex flex-col items-center justify-center py-1 min-w-[56px] min-h-[44px] transition-colors ${
          isWishlist ? 'text-[#780D24] font-semibold' : 'text-[#5F5552] hover:text-[#231919]'
        }`}
      >
        <div className="relative">
          <span
            className={`material-symbols-outlined text-[22px] ${isWishlist ? 'fill' : ''}`}
          >
            favorite
          </span>
          {wishlistCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-[#B88A44] text-[#231919] font-sans text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              {wishlistCount}
            </span>
          )}
        </div>
        <span className={`text-[10px] mt-0.5 tracking-tight ${isWishlist ? 'font-bold' : 'font-normal'}`}>
          Wishlist
        </span>
        {isWishlist && <span className="w-1.5 h-1.5 bg-[#780D24] rounded-full mt-0.5"></span>}
      </button>

      {/* 4. Bag */}
      <button
        type="button"
        onClick={() => onNavigate('/bag')}
        className={`relative flex flex-col items-center justify-center py-1 min-w-[56px] min-h-[44px] transition-colors ${
          isBag ? 'text-[#780D24] font-semibold' : 'text-[#5F5552] hover:text-[#231919]'
        }`}
      >
        <div className="relative">
          <span
            className={`material-symbols-outlined text-[22px] ${isBag ? 'fill' : ''}`}
          >
            shopping_bag
          </span>
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-[#780D24] text-white font-sans text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              {cartCount}
            </span>
          )}
        </div>
        <span className={`text-[10px] mt-0.5 tracking-tight ${isBag ? 'font-bold' : 'font-normal'}`}>
          Bag
        </span>
        {isBag && <span className="w-1.5 h-1.5 bg-[#780D24] rounded-full mt-0.5"></span>}
      </button>

      {/* 5. Account */}
      <button
        type="button"
        onClick={() => onNavigate('/account')}
        className={`flex flex-col items-center justify-center py-1 min-w-[56px] min-h-[44px] transition-colors ${
          isAccount ? 'text-[#780D24] font-semibold' : 'text-[#5F5552] hover:text-[#231919]'
        }`}
      >
        <span
          className={`material-symbols-outlined text-[22px] ${isAccount ? 'fill' : ''}`}
        >
          person
        </span>
        <span className={`text-[10px] mt-0.5 tracking-tight ${isAccount ? 'font-bold' : 'font-normal'}`}>
          Account
        </span>
        {isAccount && <span className="w-1.5 h-1.5 bg-[#780D24] rounded-full mt-0.5"></span>}
      </button>
    </nav>
  );
};
