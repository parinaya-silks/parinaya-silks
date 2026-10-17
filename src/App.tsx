/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { demoEnabled } from './config/runtime.ts';
import { normalizePath } from './utils/routing.ts';
import { storeService } from './services/storeService.ts';
import { usePublicCatalog } from './products/hooks.ts';
import { storefrontProduct } from './products/adapter.ts';
import { PublicProduct } from './products/PublicProduct.tsx';
import {
  Product,
  CartItem,
  WishlistItem,
  Order,
  Customer,
  Coupon,
  StoreSettings,
} from './types/index.ts';

// Customer Shell Components
import { Header } from './components/Header.tsx';
import { Footer } from './components/Footer.tsx';
import { MobileBottomNav } from './components/MobileBottomNav.tsx';

// Customer Views
import { HomeView } from './views/HomeView.tsx';
import { ShopView } from './views/ShopView.tsx';
import { WishlistView } from './views/WishlistView.tsx';
import { BagView } from './views/BagView.tsx';
import { AccountView } from './views/AccountView.tsx';
import { LoginView } from './views/LoginView.tsx';
import { RegisterView } from './views/RegisterView.tsx';
import { ForgotPasswordView } from './views/ForgotPasswordView.tsx';
import { VerifyEmailView } from './views/VerifyEmailView.tsx';
import { ContactView } from './views/ContactView.tsx';
import { AboutView } from './views/AboutView.tsx';
import { PoliciesView } from './views/PoliciesView.tsx';
import { FeatureUnavailable } from './components/FeatureUnavailable.tsx';

import { isAdminLocation, safeAdminDestination } from './admin/accessPolicy.ts';
const SecureAdmin = React.lazy(() => import('./admin/AdminAccess.tsx'));

function currentAdminPath() {
  if (isAdminLocation(window.location.pathname)) {
    if (window.location.pathname === '/admin/login') return safeAdminDestination(new URLSearchParams(window.location.search).get('returnTo') || '/admin/dashboard');
    return window.location.pathname;
  }
  const hashPath = window.location.hash.replace(/^#/, '').split('?')[0];
  return isAdminLocation(hashPath) ? safeAdminDestination(hashPath) : '';
}

export default function App() {
  const [adminPath, setAdminPath] = useState(currentAdminPath);
  useEffect(() => {
    let previous = window.location.pathname + window.location.search;
    const update = (event?: Event) => {
      const next = window.location.pathname + window.location.search;
      if (next !== previous && !(event instanceof PopStateEvent && event.state?.skipUnsaved) && !window.dispatchEvent(new Event('parinaya:before-admin-navigation', { cancelable: true }))) {
        window.history.pushState(null, '', previous); return;
      }
      previous = next; setAdminPath(currentAdminPath());
    };
    window.addEventListener('popstate', update);
    window.addEventListener('hashchange', update);
    const legacy = window.location.hash.replace(/^#/, '').split('?')[0];
    if (!isAdminLocation(window.location.pathname) && isAdminLocation(legacy)) {
      window.history.replaceState(null, '', safeAdminDestination(legacy));
      update();
    }
    return () => { window.removeEventListener('popstate', update); window.removeEventListener('hashchange', update); };
  }, []);
  if (adminPath) return <React.Suspense fallback={<main className="min-h-screen bg-[#FBF7F0] p-8" role="status">Loading administrator access…</main>}><SecureAdmin requestedPath={adminPath} /></React.Suspense>;

  return <Storefront />;
}

function customerLocation() {
  return normalizePath(window.location.hash.startsWith('#/') ? window.location.hash.slice(1) : window.location.pathname + window.location.search);
}

function Storefront() {
  // Navigation State (Simple client-side routing)
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return customerLocation();
  });

  // Reactive Data State from StoreService
  const catalog = usePublicCatalog();
  const products = catalog.items.map(storefrontProduct);
  const [cart, setCart] = useState<CartItem[]>(() => storeService.getCart());
  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => storeService.getWishlist());
  const [orders, setOrders] = useState<Order[]>(() => storeService.getOrders());
  const [customer, setCustomer] = useState<Customer>(() => storeService.getCustomer());
  const [customersList, setCustomersList] = useState<Customer[]>(() => storeService.getCustomersList());
  const [coupons, setCoupons] = useState<Coupon[]>(() => storeService.getCoupons());
  const [settings, setSettings] = useState<StoreSettings>(() => storeService.getSettings());

  // Applied Coupon & Loyalty Redemption
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);

  // Sync with storeService subscription
  useEffect(() => {
    const unsubscribe = storeService.subscribe(() => {
      setCart(storeService.getCart());
      setWishlist(storeService.getWishlist());
      setOrders(storeService.getOrders());
      setCustomer(storeService.getCustomer());
      setCustomersList(storeService.getCustomersList());
      setCoupons(storeService.getCoupons());
      setSettings(storeService.getSettings());
    });
    return () => unsubscribe();
  }, []);

  // Sync hash changes with state
  useEffect(() => {
    const handleHashChange = () => {
      const hashPath = customerLocation();
      setCurrentPath(hashPath);
      window.scrollTo(0, 0);
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => { window.removeEventListener('hashchange', handleHashChange); window.removeEventListener('popstate', handleHashChange); };
  }, []);

  const navigate = useCallback((path: string) => {
    path = normalizePath(path);
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Helpers
  const isWishlisted = useCallback(
    (productId: string) => {
      return wishlist.some((w) => w.productId === productId);
    },
    [wishlist]
  );

  const isInCart = useCallback(
    (productId: string) => {
      return cart.some((i) => i.productId === productId);
    },
    [cart]
  );

  // Cart & Wishlist Actions
  const handleAddToCart = useCallback((product: Product, quantity = 1, selectedColor?: string) => {
    storeService.addToCart(product, quantity, selectedColor);
  }, []);

  const handleUpdateCartQuantity = useCallback((productId: string, quantity: number) => {
    storeService.updateCartQuantity(productId, quantity);
  }, []);

  const handleRemoveFromCart = useCallback((productId: string) => {
    return storeService.removeFromCart(productId);
  }, []);

  const handleToggleWishlist = useCallback((product: Product) => {
    return storeService.toggleWishlist(product);
  }, []);

  const handleRemoveFromWishlist = useCallback((productId: string) => {
    return storeService.removeFromWishlist(productId);
  }, []);

  // Derived Counts
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const wishlistCount = wishlist.length;

  // Render Customer Storefront Views
  let customerView: React.ReactNode = null;

  const unavailable = !demoEnabled && (
    currentPath === '/checkout' ? ['Checkout unavailable', 'Online checkout is not available yet. Please contact us for assistance.'] :
    /^\/(?:order-result|order-confirmed|order-tracking)(?:\/|\?|$)/.test(currentPath) ? ['Orders unavailable', 'Online order history and tracking are not available yet. Please contact us for assistance.'] : null
  );

  if (unavailable) {
    customerView = <FeatureUnavailable title={unavailable[0]} onNavigate={navigate}>{unavailable[1]}</FeatureUnavailable>;
  } else if (currentPath === '/' || currentPath === '') {
    customerView = (
      <HomeView
        products={products.filter(p => p.status === 'Published')}
        onNavigate={navigate}
        onAddToCart={handleAddToCart}
        onToggleWishlist={handleToggleWishlist}
        isWishlisted={isWishlisted}
        catalogState={catalog.state}
        onRetry={catalog.retry}
      />
    );
  } else if (currentPath === '/shop' || currentPath.startsWith('/shop?') || currentPath === '/collections' || currentPath.startsWith('/collections/') || currentPath === '/sale' || currentPath === '/search' || currentPath.startsWith('/search?')) {
    const urlParams = new URLSearchParams(currentPath.includes('?') ? currentPath.split('?')[1] : '');
    const categoryParam = urlParams.get('category') || undefined;
    const searchParam = urlParams.get('search') || undefined;

    customerView = catalog.state !== 'ready' ? <section className="p-8 text-center space-y-4"><h1 className="font-serif text-2xl">{catalog.state === 'loading' ? 'Loading products…' : 'Products unavailable'}</h1>{catalog.state === 'error' && <button className="min-h-11 px-5 underline" onClick={catalog.retry}>Retry products</button>}</section> : (
      <ShopView
        key={currentPath}
        products={products}
        initialCategory={categoryParam}
        initialSearch={searchParam}
        categorySlug={currentPath.startsWith('/collections/') ? currentPath.slice('/collections/'.length).split('?')[0] : undefined}
        saleOnly={currentPath === '/sale'}
        onNavigate={navigate}
        onAddToCart={handleAddToCart}
        onToggleWishlist={handleToggleWishlist}
        isWishlisted={isWishlisted}
      />
    );
  } else if (currentPath.startsWith('/product/')) {
    const slug = currentPath.replace('/product/', '').split('?')[0];
    customerView = <PublicProduct key={slug} slug={slug} products={products} onNavigate={navigate} onAddToCart={handleAddToCart} onToggleWishlist={handleToggleWishlist} isWishlisted={isWishlisted} />;
  } else if (currentPath === '/wishlist') {
    customerView = (
      <WishlistView
        wishlist={wishlist}
        onNavigate={navigate}
        onAddToCart={handleAddToCart}
        onRemoveFromWishlist={handleRemoveFromWishlist}
        isInCart={isInCart}
      />
    );
  } else if (currentPath === '/bag') {
    customerView = (
      <BagView
        settings={settings}
        cart={cart}
        appliedCoupon={appliedCoupon}
        onApplyCoupon={(coupon) => setAppliedCoupon(coupon)}
        availableCoupons={coupons}
        pointsToRedeem={pointsToRedeem}
        onTogglePoints={(redeem) =>
          setPointsToRedeem(redeem ? Math.min(customer.pointsBalance, 2500) : 0)
        }
        customerPoints={customer.pointsBalance}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveFromCart}
        onMoveToWishlist={(prod) => {
          storeService.removeFromCart(prod.id);
          storeService.toggleWishlist(prod);
        }}
        onNavigate={navigate}
      />
    );
  } else if (currentPath === '/account' || currentPath === '/account/orders') {
    customerView = (
      <AccountView
        customer={customer}
        orders={orders.filter(o => o.customerEmail === customer.email)}
        onNavigate={navigate}
        onUpdateProfile={(updates) => storeService.updateCustomerProfile(updates)}
        onAddAddress={(addr) => storeService.addCustomerAddress(addr)}
        onRemoveAddress={(id) => storeService.removeCustomerAddress(id)}
      />
    );
  } else if (currentPath === '/login') {
    customerView = (
      <LoginView
        onNavigate={navigate}
        onLoginSuccess={() => {}}
      />
    );
  } else if (currentPath === '/register') {
    customerView = (
      <RegisterView
        onNavigate={navigate}
        onRegisterSuccess={() => {}}
      />
    );
  } else if (currentPath === '/forgot-password') {
    customerView = (
      <ForgotPasswordView
        onNavigate={navigate}
      />
    );
  } else if (currentPath === '/verify-email') {
    customerView = (
      <VerifyEmailView
        initialEmail={customer.email}
        onNavigate={navigate}
      />
    );
  } else if (currentPath === '/about') {
    customerView = (
      <AboutView
        onNavigate={navigate}
      />
    );
  } else if (currentPath === '/contact') {
    customerView = (
      <ContactView
        onNavigate={navigate}
      />
    );
  } else if (currentPath === '/shipping-policy') {
    customerView = (
      <PoliciesView
        initialTab="shipping"
        onNavigate={navigate}
      />
    );
  } else if (currentPath === '/returns-policy') {
    customerView = (
      <PoliciesView
        initialTab="returns"
        onNavigate={navigate}
      />
    );
  } else if (currentPath === '/privacy-policy') {
    customerView = (
      <PoliciesView
        initialTab="privacy"
        onNavigate={navigate}
      />
    );
  } else if (currentPath === '/terms-conditions') {
    customerView = (
      <PoliciesView
        initialTab="terms"
        onNavigate={navigate}
      />
    );
  } else {
    customerView = <MissingRecord label="Page" onNavigate={navigate} />;
  }

  return (
    <div className="min-h-screen bg-[#FBF7F0] text-[#231919] font-sans antialiased flex flex-col selection:bg-[#780D24] selection:text-white">
      {/* Top Store Announcement Banner */}
      {settings.announcementBarActive && settings.announcementBarText && (
        <div className="bg-[#780D24] text-[#FBF7F0] text-[11px] sm:text-[12px] font-sans font-medium py-2 px-4 text-center tracking-wide border-b border-[#B88A44]/30 flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[15px] text-[#B88A44]">sparkles</span>
          <span>{settings.announcementBarText}</span>
          <button
            onClick={() => navigate('/shop')}
            className="underline underline-offset-2 ml-1 text-[#F4EEE5] hover:text-white font-semibold"
          >
            Explore
          </button>
        </div>
      )}

      {/* Main Storefront Header */}
      <Header
        currentPath={currentPath}
        onNavigate={navigate}
        cartCount={cartCount}
        wishlistCount={wishlistCount}
      />

      {/* Main Page View */}
      <main className="flex-1 w-full">
        {customerView}
        {catalog.state === 'ready' && catalog.hasMore && !currentPath.startsWith('/product/') && <div className="text-center p-4"><p className="text-xs text-[#5F5552] mb-2">Showing loaded products. Load more to expand search and filters.</p><button className="min-h-11 px-5 border rounded-lg" disabled={catalog.busy} onClick={catalog.loadMore}>Load more products</button></div>}
      </main>

      {/* Storefront Footer */}
      <Footer onNavigate={navigate} />

      {/* Approved 5-Tab Mobile Bottom Navigation (Home · Shop · Wishlist · Bag · Account) */}
      <MobileBottomNav
        currentPath={currentPath}
        onNavigate={navigate}
        cartCount={cartCount}
        wishlistCount={wishlistCount}
      />
    </div>
  );
}

function MissingRecord({ label, onNavigate }: { label: string; onNavigate: (path: string) => void }) {
  return <section className="p-8 text-center space-y-4">
    <h1 className="font-serif text-2xl">{label} not found</h1>
    <p>The requested {label.toLowerCase()} is unavailable.</p>
    <button className="min-h-11 px-5 bg-[#780D24] text-white rounded" onClick={() => onNavigate('/shop')}>Continue shopping</button>
  </section>;
}
