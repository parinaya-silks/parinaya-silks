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
  Order,
  Customer,
  Coupon,
  StoreSettings,
} from './types/index.ts';

// Customer Shell Components
import {Seo} from './content/Seo.tsx';
import {StoreContentProvider} from './content/public.tsx';
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
import {CustomerAuthProvider,useCustomerAuth} from './customer/CustomerAuth.tsx';
import {useShopping} from './shopping/useShopping.ts';
import {CustomerOrders} from './orders/ui.tsx';
import {CheckoutView} from './views/CheckoutView.tsx';
import {AddressesView} from './delivery/AddressesView.tsx';
import {CustomerGate} from './delivery/CustomerGate.tsx';
import {safeCustomerReturn} from './customer/policy.ts';
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

function Storefront() {return <CustomerAuthProvider><StoreContentProvider><StorefrontContent/></StoreContentProvider></CustomerAuthProvider>;}

function StorefrontContent() {
  const session=useCustomerAuth();
  // Navigation State (Simple client-side routing)
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return customerLocation();
  });

  // Reactive Data State from StoreService
  const catalog = usePublicCatalog({},!/^\/(?:shop|collections|sale|search)(?:[/?]|$)/.test(currentPath));
  const products = catalog.items.map(storefrontProduct);
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
    if((path==='/account'||path==='/login')&&session.status!=='signed-in'){
      const previous=safeCustomerReturn(currentPath);
      if(previous!=='/account')path='/login?returnTo='+encodeURIComponent(previous);
    }
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [currentPath,session.status]);

  const authRoute=currentPath.split('?')[0];
  const authExperience=['/login','/register','/forgot-password','/verify-email','/account'].includes(authRoute);

  const shopping=useShopping(currentPath,navigate);
  const isWishlisted=shopping.isWishlisted;
  const handleAddToCart=shopping.add, handleToggleWishlist=shopping.toggle;
  const cartCount=shopping.bag.reduce((sum,item)=>sum+item.quantity,0);
  const wishlistCount=shopping.wishlist.length;

  // Render Customer Storefront Views
  let customerView: React.ReactNode = null;

  if (/^\/(?:order-result|order-confirmed|order-tracking)\//.test(authRoute)) {
    const id=authRoute.split('/')[2];customerView=<CustomerGate path={authRoute} onNavigate={navigate}><CustomerOrders id={id} confirmed={authRoute.startsWith('/order-confirmed/')} onNavigate={navigate}/></CustomerGate>;
  } else if (authRoute === '/account/orders') {
    customerView=<CustomerGate path={authRoute} onNavigate={navigate}><CustomerOrders onNavigate={navigate}/></CustomerGate>;
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

    customerView = (
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
      <WishlistView shopping={shopping} onNavigate={navigate}/>
    );
  } else if (currentPath === '/bag') {
    customerView = (
      <BagView shopping={shopping} onNavigate={navigate}/>
    );
  } else if (authRoute === '/checkout') {
    customerView = <CustomerGate path="/checkout" onNavigate={navigate}><CheckoutView shopping={shopping} onNavigate={navigate}/></CustomerGate>;
  } else if (authRoute === '/account/addresses') {
    customerView = <CustomerGate path="/account/addresses" onNavigate={navigate}><AddressesView onNavigate={navigate}/></CustomerGate>;
  } else if (authRoute === '/account') {
    customerView = <AccountView currentPath={currentPath} onNavigate={navigate}/>;
  } else if (authRoute === '/login') {
    customerView = <LoginView currentPath={currentPath} onNavigate={navigate}/>;
  } else if (authRoute === '/register') {
    customerView = <RegisterView currentPath={currentPath} onNavigate={navigate}/>;
  } else if (authRoute === '/forgot-password') {
    customerView = <ForgotPasswordView currentPath={currentPath} onNavigate={navigate}/>;
  } else if (authRoute === '/verify-email') {
    customerView = <VerifyEmailView currentPath={currentPath} onNavigate={navigate}/>;
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
    <div data-shopping-status={shopping.signedIn?shopping.status:session.status} className={"min-h-screen bg-[#FBF7F0] text-[#231919] font-sans antialiased flex flex-col selection:bg-[#780D24] selection:text-white"+(authExperience?" customer-auth-shell":"")}>
      <Seo path={currentPath}/>
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
        authLayout={authExperience}
        currentPath={currentPath}
        onNavigate={navigate}
        cartCount={cartCount}
        wishlistCount={wishlistCount}
      />

      {shopping.notice&&<div className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-auto md:w-96 z-50 bg-white border border-[#B88A44] rounded-xl shadow-lg p-4 text-sm" role={shopping.notice.error?'alert':'status'}>
        <p>{shopping.notice.message}</p><div className="flex flex-wrap gap-4 mt-2">{shopping.notice.error&&<button className="min-h-11 underline text-[#780D24]" onClick={shopping.retryChange}>Retry change</button>}{shopping.signedIn&&<button className="min-h-11 underline text-[#780D24]" onClick={()=>navigate('/bag')}>View bag</button>}<button className="min-h-11 underline" onClick={shopping.dismiss}>Dismiss</button></div>
      </div>}
      {/* Main Page View */}
      <main className="flex-1 w-full">
        {customerView}
        {!authExperience && catalog.state === 'ready' && catalog.hasMore && currentPath==='/' && <div className="text-center p-4"><p className="text-xs text-[#5F5552] mb-2">Showing loaded products. Load more to expand search and filters.</p><button className="min-h-11 px-5 border rounded-lg" disabled={catalog.busy} onClick={catalog.loadMore}>Load more products</button></div>}
      </main>

      {/* Storefront Footer */}
      {!authExperience&&<Footer onNavigate={navigate} />}

      {/* Approved 5-Tab Mobile Bottom Navigation (Home · Shop · Wishlist · Bag · Account) */}
      <MobileBottomNav
        authLayout={authExperience}
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
