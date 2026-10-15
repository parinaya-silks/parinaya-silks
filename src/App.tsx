/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { demoEnabled } from './config/runtime.ts';
import { normalizePath } from './utils/routing.ts';
import { storeService } from './services/storeService.ts';
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
import { ProductDetailView } from './views/ProductDetailView.tsx';
import { WishlistView } from './views/WishlistView.tsx';
import { BagView } from './views/BagView.tsx';
import { CheckoutView } from './views/CheckoutView.tsx';
import { OrderResultView } from './views/OrderResultView.tsx';
import { AccountView } from './views/AccountView.tsx';
import { OrderTrackingView } from './views/OrderTrackingView.tsx';
import { LoginView } from './views/LoginView.tsx';
import { RegisterView } from './views/RegisterView.tsx';
import { ForgotPasswordView } from './views/ForgotPasswordView.tsx';
import { VerifyEmailView } from './views/VerifyEmailView.tsx';
import { ContactView } from './views/ContactView.tsx';
import { AboutView } from './views/AboutView.tsx';
import { PoliciesView } from './views/PoliciesView.tsx';

// Admin Shell & Views
import { AdminLayout } from './admin/AdminLayout.tsx';
import { AdminDashboard } from './admin/AdminDashboard.tsx';
import { AdminOrders } from './admin/AdminOrders.tsx';
import { AdminOrderDetail } from './admin/AdminOrderDetail.tsx';
import { AdminProducts } from './admin/AdminProducts.tsx';
import { AdminProductForm } from './admin/AdminProductForm.tsx';
import { AdminCustomers } from './admin/AdminCustomers.tsx';
import { AdminCoupons } from './admin/AdminCoupons.tsx';
import { AdminSettings } from './admin/AdminSettings.tsx';

export default function App() {
  if (!demoEnabled) {
    return <div className="min-h-screen bg-[#FBF7F0] text-[#231919] grid place-items-center px-6">
      <main className="max-w-lg text-center space-y-4">
        <h1 className="font-serif text-3xl text-[#780D24]">PARINAYA SILKS</h1>
        <p>Our online store is being prepared. Online checkout and account access are not available yet.</p>
        <p>Hyderabad, India</p>
        <p><a className="underline" href="https://wa.me/918367383073">WhatsApp +91 8367383073</a></p>
        <p><a className="underline break-all" href="mailto:parinayasilks.in@gmail.com">parinayasilks.in@gmail.com</a></p>
      </main>
    </div>;
  }
  return <><div role="note" className="bg-[#231919] text-white text-center px-4 py-2 text-xs">
    Local demo — sample products, customers and orders. Login and payments are simulated. Use test details only.
  </div><DemoApp /></>;
}

function DemoApp() {
  // Navigation State (Simple client-side routing)
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return normalizePath(window.location.hash.replace(/^#/, '') || '/');
  });

  // Reactive Data State from StoreService
  const [products, setProducts] = useState<Product[]>(() => storeService.getProducts());
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
      setProducts(storeService.getProducts());
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
      const hashPath = normalizePath(window.location.hash.replace(/^#/, '') || '/');
      setCurrentPath(hashPath);
      window.scrollTo(0, 0);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback((path: string) => {
    path = normalizePath(path);
    window.location.hash = path;
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

  // Order Placement
  const handlePlaceOrder = useCallback(
    (orderData: any): Order => {
      const newOrder = storeService.createOrder(orderData);
      setAppliedCoupon(null);
      setPointsToRedeem(0);
      return newOrder;
    },
    []
  );

  // Derived Counts
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const wishlistCount = wishlist.length;

  const isAdminRoute = currentPath.startsWith('/admin');

  // Render Admin Layout and Views
  if (isAdminRoute) {
    let adminContent: React.ReactNode = null;

    if (currentPath === '/admin' || currentPath === '/admin/dashboard') {
      adminContent = (
        <AdminDashboard
          orders={orders}
          products={products}
          onNavigate={navigate}
          onAdjustStock={(product, delta) => {
            storeService.updateProductStock(product.id, product.stockCount + delta);
          }}
        />
      );
    } else if (currentPath === '/admin/orders') {
      adminContent = (
        <AdminOrders
          orders={orders}
          onNavigate={navigate}
          onUpdateStatus={(orderId, status, courier, tracking) => {
            storeService.updateOrderFulfilment(orderId, status, courier, tracking);
          }}
          onBulkUpdateStatus={(orderIds, status) => {
            return storeService.bulkUpdateFulfilment(orderIds, status);
          }}
        />
      );
    } else if (currentPath.startsWith('/admin/orders/')) {
      const orderId = currentPath.replace('/admin/orders/', '');
      const order = orders.find((o) => o.id === orderId);
      adminContent = (
        <AdminOrderDetail
          order={order}
          onNavigate={navigate}
          onUpdateOrder={(orderId, status, courier, tracking, notes) => {
            storeService.updateOrderFulfilment(orderId, status, courier, tracking, notes);
          }}
        />
      );
    } else if (currentPath === '/admin/products') {
      adminContent = (
        <AdminProducts
          products={products}
          onNavigate={navigate}
          onAdjustStock={(product, delta) => {
            storeService.updateProductStock(product.id, product.stockCount + delta);
          }}
          onToggleStatus={(product) => {
            const nextStatus = product.status === 'Published' ? 'Draft' : 'Published';
            storeService.updateProductStatus(product.id, nextStatus);
          }}
        />
      );
    } else if (currentPath === '/admin/products/new') {
      adminContent = (
        <AdminProductForm
          onNavigate={navigate}
          onSave={(newProduct) => storeService.saveProduct(newProduct)}
        />
      );
    } else if (currentPath.startsWith('/admin/products/edit/')) {
      const prodId = currentPath.replace('/admin/products/edit/', '');
      const productToEdit = products.find((p) => p.id === prodId);
      adminContent = (
        <AdminProductForm
          product={productToEdit}
          onNavigate={navigate}
          onSave={(updatedProduct) => storeService.saveProduct(updatedProduct)}
        />
      );
    } else if (currentPath === '/admin/customers') {
      adminContent = (
        <AdminCustomers
          customers={customersList}
          orders={orders}
          onNavigate={navigate}
        />
      );
    } else if (currentPath === '/admin/coupons') {
      adminContent = (
        <AdminCoupons
          coupons={coupons}
          onSaveCoupon={(coupon) => storeService.saveCoupon(coupon)}
          onToggleStatus={(code) => storeService.toggleCouponStatus(code)}
        />
      );
    } else if (currentPath === '/admin/settings') {
      adminContent = (
        <AdminSettings
          settings={settings}
          onUpdateSettings={(newSettings) => storeService.updateSettings(newSettings)}
          onResetDemo={() => storeService.resetToDefaultDemo()}
        />
      );
    } else {
      adminContent = (
        <AdminDashboard
          orders={orders}
          products={products}
          onNavigate={navigate}
          onAdjustStock={(product, delta) => {
            storeService.updateProductStock(product.id, product.stockCount + delta);
          }}
        />
      );
    }

    return (
      <AdminLayout key={currentPath} currentPath={currentPath} onNavigate={navigate}>
        {adminContent}
      </AdminLayout>
    );
  }

  // Render Customer Storefront Views
  let customerView: React.ReactNode = null;

  if (currentPath === '/' || currentPath === '') {
    customerView = (
      <HomeView
        products={products.filter(p => p.status === 'Published')}
        onNavigate={navigate}
        onAddToCart={handleAddToCart}
        onToggleWishlist={handleToggleWishlist}
        isWishlisted={isWishlisted}
      />
    );
  } else if (currentPath === '/shop' || currentPath.startsWith('/shop?')) {
    const urlParams = new URLSearchParams(currentPath.includes('?') ? currentPath.split('?')[1] : '');
    const categoryParam = urlParams.get('category') || undefined;
    const searchParam = urlParams.get('search') || undefined;

    customerView = (
      <ShopView
        key={currentPath}
        products={products}
        initialCategory={categoryParam}
        initialSearch={searchParam}
        onNavigate={navigate}
        onAddToCart={handleAddToCart}
        onToggleWishlist={handleToggleWishlist}
        isWishlisted={isWishlisted}
      />
    );
  } else if (currentPath.startsWith('/product/')) {
    const prodId = currentPath.replace('/product/', '').split('?')[0];
    const product = products.find((p) => p.id === prodId && p.status === 'Published');
    if (!product) {
      customerView = <MissingRecord label="Product" onNavigate={navigate} />;
    } else {

    customerView = (
      <ProductDetailView
        key={product.id}
        product={product}
        allProducts={products}
        onNavigate={navigate}
        onAddToCart={handleAddToCart}
        onToggleWishlist={handleToggleWishlist}
        isWishlisted={isWishlisted}
      />
    );
    }
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
  } else if (currentPath === '/checkout') {
    customerView = (
      <CheckoutView
        settings={settings}
        cart={cart}
        appliedCoupon={appliedCoupon}
        pointsToRedeem={pointsToRedeem}
        customer={customer}
        onNavigate={navigate}
        onCreateOrder={handlePlaceOrder}
        onClearCart={() => storeService.clearCart()}
      />
    );
  } else if (currentPath.startsWith('/order-result') || currentPath.startsWith('/order-confirmed')) {
    const cleanPath = currentPath.split('?')[0];
    const pathOrderId = cleanPath
      .replace('/order-result/', '')
      .replace('/order-result', '')
      .replace('/order-confirmed/', '')
      .replace('/order-confirmed', '');
    const urlParams = new URLSearchParams(currentPath.includes('?') ? currentPath.split('?')[1] : '');
    const queryOrderId = urlParams.get('orderId');
    const targetId = pathOrderId || queryOrderId;
    const targetOrder = targetId
      ? orders.filter(o => o.customerEmail === customer.email).find(
          (o) =>
            o.id === targetId ||
            o.referenceId.replace(/[^a-zA-Z0-9]/g, '') === targetId.replace(/[^a-zA-Z0-9]/g, '')
        )
      : undefined;

    customerView = (
      targetOrder ? <OrderResultView
        key={targetOrder.id}
        order={targetOrder}
        onNavigate={navigate}
      /> : <MissingRecord label="Order" onNavigate={navigate} />
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
  } else if (currentPath.startsWith('/order-tracking')) {
    const orderId = currentPath.replace('/order-tracking/', '').replace('/order-tracking', '');
    const targetOrder = orders.find((o) => o.id === orderId && o.customerEmail === customer.email);

    customerView = (
      targetOrder ? <OrderTrackingView
        key={targetOrder.id}
        order={targetOrder}
        onNavigate={navigate}
      /> : <MissingRecord label="Order" onNavigate={navigate} />
    );
  } else if (currentPath === '/login') {
    customerView = (
      <LoginView
        onNavigate={navigate}
        onLoginSuccess={(email) => {
          storeService.updateCustomerProfile({ email });
          navigate('/account');
        }}
      />
    );
  } else if (currentPath === '/register') {
    customerView = (
      <RegisterView
        onNavigate={navigate}
        onRegisterSuccess={(name, email) => {
          storeService.updateCustomerProfile({ name, email });
          navigate('/verify-email');
        }}
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
      </main>

      {/* Floating Mode Switcher (Seamless evaluation between Storefront and Admin Console) */}
      {!['/bag', '/checkout'].includes(currentPath) && !currentPath.startsWith('/product/') && <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="group flex items-center gap-2 bg-[#231919] hover:bg-[#780D24] text-white px-3.5 py-2.5 rounded-full shadow-lg border border-[#B88A44] transition-all hover:scale-105"
          title="Open Parinaya Silks Demo Admin Console"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-sans text-[12px] font-bold tracking-wide">
            Demo Admin
          </span>
          <span className="material-symbols-outlined text-[16px] text-[#B88A44] group-hover:translate-x-0.5 transition-transform">
            arrow_forward
          </span>
        </button>
      </div>

      }
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
