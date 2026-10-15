import { applyFulfilment, fulfilmentError } from '../utils/fulfilment.ts';
import { demoEnabled } from '../config/runtime.ts';
import {
  Product,
  CartItem,
  WishlistItem,
  Order,
  Customer,
  Coupon,
  StoreSettings,
  Address,
  FulfilmentStatus,
} from '../types/index.ts';
import {
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_CUSTOMER,
  INITIAL_CUSTOMERS,
  INITIAL_COUPONS,
  INITIAL_SETTINGS,
} from '../data/mockData.ts';

const STORAGE_KEY_PRODUCTS = 'parinaya_products_demo_v2';
const STORAGE_KEY_CART = 'parinaya_cart_demo_v2';
const STORAGE_KEY_WISHLIST = 'parinaya_wishlist_demo_v2';
const STORAGE_KEY_ORDERS = 'parinaya_orders_demo_v2';
const STORAGE_KEY_CUSTOMER = 'parinaya_customer_demo_v2';
const STORAGE_KEY_CUSTOMERS = 'parinaya_customers_list_demo_v2';
const STORAGE_KEY_COUPONS = 'parinaya_coupons_demo_v2';
const STORAGE_KEY_SETTINGS = 'parinaya_settings_demo_v2';

function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return structuredClone(defaultValue);
    const parsed = JSON.parse(saved);
    if (parsed === null || Array.isArray(parsed) !== Array.isArray(defaultValue) || typeof parsed !== typeof defaultValue) return structuredClone(defaultValue);
    return parsed as T;
  } catch {
    return structuredClone(defaultValue);
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Storage write error', err);
  }
}

// Initial default cart matching the Stitch mockup
const DEFAULT_CART: CartItem[] = [
  {
    productId: 'prod-mayuri-wine',
    product: INITIAL_PRODUCTS[0],
    quantity: 1,
    selectedColor: 'Regal Wine & Antique Gold',
  },
  {
    productId: 'prod-padmavathi-rust',
    product: INITIAL_PRODUCTS[1],
    quantity: 1,
    selectedColor: 'Mustard Rust & Gold',
  },
];

// Initial default wishlist matching the Stitch mockup (4 items)
const DEFAULT_WISHLIST: WishlistItem[] = [
  { productId: 'prod-mayuri-wine', product: INITIAL_PRODUCTS[0], addedAt: '2025-10-24' },
  { productId: 'prod-padmavathi-rust', product: INITIAL_PRODUCTS[1], addedAt: '2025-10-24' },
  { productId: 'prod-swarna-mustard', product: INITIAL_PRODUCTS[2], addedAt: '2025-10-24' },
  { productId: 'prod-chandrakala-blue', product: INITIAL_PRODUCTS[3], addedAt: '2025-10-24' },
];

class StoreService {
  private subscribers: Array<() => void> = [];

  public subscribe(callback: () => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    this.subscribers.forEach((cb) => cb());
  }

  // PRODUCTS
  public getProducts(): Product[] {
    return getStorage<Product[]>(STORAGE_KEY_PRODUCTS, INITIAL_PRODUCTS);
  }

  public getProductById(id: string): Product | undefined {
    return this.getProducts().find((p) => p.id === id);
  }

  public updateProductStock(id: string, newStock: number): void {
    if (!Number.isSafeInteger(newStock)) throw new Error('Stock must be a whole number.');
    const products = this.getProducts().map((p) => {
      if (p.id === id) {
        return {
          ...p,
          stockCount: Math.max(0, newStock),
          inStock: newStock > 0,
        };
      }
      return p;
    });
    setStorage(STORAGE_KEY_PRODUCTS, products);
    this.notify();
  }

  public updateProductStatus(id: string, status: 'Published' | 'Draft' | 'Archived'): void {
    const products = this.getProducts().map((p) => {
      if (p.id === id) {
        return { ...p, status };
      }
      return p;
    });
    setStorage(STORAGE_KEY_PRODUCTS, products);
    this.notify();
  }

  public saveProduct(product: Product): void {
    const products = this.getProducts();
    const existingIndex = products.findIndex((p) => p.id === product.id);
    if (existingIndex >= 0) {
      products[existingIndex] = product;
    } else {
      products.unshift(product);
    }
    setStorage(STORAGE_KEY_PRODUCTS, products);
    this.notify();
  }

  // CART
  public getCart(): CartItem[] {
    const products = this.getProducts();
    return getStorage<CartItem[]>(STORAGE_KEY_CART, DEFAULT_CART).flatMap(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product || product.status !== 'Published' || !product.inStock || product.stockCount < 1 || !Number.isSafeInteger(item.quantity) || item.quantity < 1) return [];
      return [{ ...item, product, quantity: Math.min(item.quantity, product.stockCount) }];
    });
  }

  public addToCart(product: Product, quantity = 1, selectedColor?: string): void {
    const currentProduct = this.getProductById(product.id);
    if (!currentProduct || currentProduct.status !== 'Published' || !currentProduct.inStock || currentProduct.stockCount < 1 || !Number.isSafeInteger(quantity) || quantity < 1) return;
    product = currentProduct;
    const cart = this.getCart();
    const existingIndex = cart.findIndex((item) => item.productId === product.id);
    if (existingIndex >= 0) {
      const newQty = cart[existingIndex].quantity + quantity;
      // respect stock limit
      cart[existingIndex].quantity = Math.min(newQty, product.stockCount);
      if (selectedColor) cart[existingIndex].selectedColor = selectedColor;
    } else {
      cart.push({
        productId: product.id,
        product,
        quantity: Math.min(quantity, Math.max(1, product.stockCount)),
        selectedColor: selectedColor || product.colorName,
      });
    }
    setStorage(STORAGE_KEY_CART, cart);
    this.notify();
  }

  public updateCartQuantity(productId: string, quantity: number): void {
    const cart = this.getCart();
    const item = cart.find((i) => i.productId === productId);
    if (!item) return;

    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }

    const product = this.getProductById(productId);
    if (!Number.isSafeInteger(quantity)) return;
    if (!product || product.status !== 'Published' || !product.inStock || product.stockCount < 1) {
      this.removeFromCart(productId);
      return;
    }
    item.product = product;
    item.quantity = Math.min(quantity, product.stockCount);
    setStorage(STORAGE_KEY_CART, cart);
    this.notify();
  }

  public removeFromCart(productId: string): CartItem | undefined {
    const cart = this.getCart();
    const removedItem = cart.find((i) => i.productId === productId);
    const updated = cart.filter((i) => i.productId !== productId);
    setStorage(STORAGE_KEY_CART, updated);
    this.notify();
    return removedItem;
  }

  public clearCart(): void {
    setStorage(STORAGE_KEY_CART, []);
    this.notify();
  }

  // WISHLIST
  public getWishlist(): WishlistItem[] {
    return getStorage<WishlistItem[]>(STORAGE_KEY_WISHLIST, DEFAULT_WISHLIST);
  }

  public isInWishlist(productId: string): boolean {
    return this.getWishlist().some((item) => item.productId === productId);
  }

  public toggleWishlist(product: Product): boolean {
    const wishlist = this.getWishlist();
    const existingIndex = wishlist.findIndex((item) => item.productId === product.id);
    let isSaved = false;

    if (existingIndex >= 0) {
      wishlist.splice(existingIndex, 1);
      isSaved = false;
    } else {
      wishlist.unshift({
        productId: product.id,
        product,
        addedAt: new Date().toISOString(),
      });
      isSaved = true;
    }
    setStorage(STORAGE_KEY_WISHLIST, wishlist);
    this.notify();
    return isSaved;
  }

  public removeFromWishlist(productId: string): WishlistItem | undefined {
    const wishlist = this.getWishlist();
    const item = wishlist.find((w) => w.productId === productId);
    const updated = wishlist.filter((w) => w.productId !== productId);
    setStorage(STORAGE_KEY_WISHLIST, updated);
    this.notify();
    return item;
  }

  // ORDERS
  public getOrders(): Order[] {
    return getStorage<Order[]>(STORAGE_KEY_ORDERS, INITIAL_ORDERS);
  }

  public getOrderById(id: string): Order | undefined {
    return this.getOrders().find(
      (o) => o.id === id || o.referenceId.replace(/[^a-zA-Z0-9]/g, '') === id.replace(/[^a-zA-Z0-9]/g, '')
    );
  }

  public createOrder(orderData: Omit<Order, 'id' | 'referenceId' | 'createdAt' | 'timeline'>): Order {
    if (!demoEnabled) throw new Error('Live checkout is not connected.');
    if (!orderData.items.length || !orderData.shippingAddress) throw new Error('A bag and delivery address are required.');
    for (const item of orderData.items) {
      const product = this.getProductById(item.productId);
      if (!product || product.status !== 'Published' || !product.inStock || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > product.stockCount) throw new Error('An item is unavailable. Review your bag.');
    }
    const orders = this.getOrders();
    const randNum = Math.floor(100000 + Math.random() * 900000);
    const newOrder: Order = {
      ...orderData,
      id: `ord-${randNum}`,
      referenceId: `#PS ${randNum}`,
      createdAt: 'Just now',
      timeline: [
        {
          step: 1,
          title: 'Confirmed',
          description: 'Order placed & payment verified',
          timestamp: 'Just now',
          completed: true,
          active: true,
        },
        {
          step: 2,
          title: 'Processing',
          description: 'Fabric & pure zari assay verified',
          timestamp: 'Upcoming',
          completed: false,
        },
        {
          step: 3,
          title: 'Packed',
          description: 'Wrapped in muslin & signature box',
          timestamp: 'Upcoming',
          completed: false,
        },
        {
          step: 4,
          title: 'Shipped',
          description: 'Handoff to express courier',
          timestamp: 'Upcoming',
          completed: false,
        },
        {
          step: 5,
          title: 'Out for Delivery',
          description: 'Courier handover scheduled',
          timestamp: 'Upcoming',
          completed: false,
        },
        {
          step: 6,
          title: 'Delivered',
          description: 'Handover with signature acknowledgment',
          timestamp: 'Expected in 3-4 days',
          completed: false,
        },
      ],
    };

    orders.unshift(newOrder);
    setStorage(STORAGE_KEY_ORDERS, orders);

    // deduct stock count for ordered items
    const products = this.getProducts();
    newOrder.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stockCount = Math.max(0, prod.stockCount - item.quantity);
        prod.inStock = prod.stockCount > 0;
      }
    });
    setStorage(STORAGE_KEY_PRODUCTS, products);

    // reward loyalty points: 1 pt per 100 spent
    const customer = this.getCustomer();
    const pointsEarned = Math.floor(newOrder.totalAmount / 100);
    customer.pointsBalance = customer.pointsBalance - newOrder.pointsRedeemed + pointsEarned;
    customer.totalOrdersCount += 1;
    customer.lifetimeSpend += newOrder.totalAmount;
    setStorage(STORAGE_KEY_CUSTOMER, customer);

    this.notify();
    return newOrder;
  }

  public updateOrderFulfilment(
    orderId: string,
    fulfilmentStatus: FulfilmentStatus,
    courierPartner?: string,
    trackingNumber?: string,
    internalNotes?: string
  ): void {
    const orders = this.getOrders();
    const index = orders.findIndex(o => o.id === orderId);
    if (index < 0) throw new Error('Order not found.');
    orders[index] = applyFulfilment(orders[index], fulfilmentStatus, courierPartner, trackingNumber, internalNotes);
    setStorage(STORAGE_KEY_ORDERS, orders);
    this.notify();
  }

  public bulkUpdateFulfilment(
    orderIds: string[],
    fulfilmentStatus: FulfilmentStatus,
    courierPartnerMap?: Record<string, string>,
    trackingNumberMap?: Record<string, string>
  ): { successCount: number; ineligibleOrders: Order[] } {
    const orders = this.getOrders();
    const selected = orders.filter(o => orderIds.includes(o.id));
    const ineligibleOrders = selected.filter(o => fulfilmentError(o, fulfilmentStatus, courierPartnerMap?.[o.id], trackingNumberMap?.[o.id]));
    const eligible = selected.filter(o => !ineligibleOrders.includes(o));
    const updated = orders.map(o => eligible.includes(o) ? applyFulfilment(o, fulfilmentStatus, courierPartnerMap?.[o.id], trackingNumberMap?.[o.id]) : o);
    setStorage(STORAGE_KEY_ORDERS, updated);
    this.notify();
    return { successCount: eligible.length, ineligibleOrders };
  }

  // CUSTOMER
  public getCustomer(): Customer {
    return getStorage<Customer>(STORAGE_KEY_CUSTOMER, INITIAL_CUSTOMER);
  }

  public getCustomersList(): Customer[] {
    return getStorage<Customer[]>(STORAGE_KEY_CUSTOMERS, INITIAL_CUSTOMERS);
  }

  public updateCustomerProfile(updates: Partial<Customer>): Customer {
    const current = this.getCustomer();
    const updated = { ...current, ...updates };
    setStorage(STORAGE_KEY_CUSTOMER, updated);

    // sync into customers list too
    const list = this.getCustomersList();
    const idx = list.findIndex((c) => c.id === current.id);
    if (idx >= 0) {
      list[idx] = updated;
      setStorage(STORAGE_KEY_CUSTOMERS, list);
    }

    this.notify();
    return updated;
  }

  public addCustomerAddress(address: Omit<Address, 'id'>): Address {
    const customer = this.getCustomer();
    const newAddress: Address = {
      ...address,
      id: `addr-${Date.now()}`,
    };
    if (newAddress.isDefault) {
      customer.addresses.forEach((a) => (a.isDefault = false));
    }
    customer.addresses.unshift(newAddress);
    setStorage(STORAGE_KEY_CUSTOMER, customer);
    this.notify();
    return newAddress;
  }

  public removeCustomerAddress(addressId: string): void {
    const customer = this.getCustomer();
    customer.addresses = customer.addresses.filter((a) => a.id !== addressId);
    setStorage(STORAGE_KEY_CUSTOMER, customer);
    this.notify();
  }

  // COUPONS
  public getCoupons(): Coupon[] {
    return getStorage<Coupon[]>(STORAGE_KEY_COUPONS, INITIAL_COUPONS);
  }

  public findCoupon(code: string): Coupon | undefined {
    return this.getCoupons().find((c) => c.code.toUpperCase() === code.toUpperCase() && c.active);
  }

  public saveCoupon(coupon: Coupon): void {
    const coupons = this.getCoupons();
    const existingIndex = coupons.findIndex((c) => c.code === coupon.code);
    if (existingIndex >= 0) {
      coupons[existingIndex] = coupon;
    } else {
      coupons.push(coupon);
    }
    setStorage(STORAGE_KEY_COUPONS, coupons);
    this.notify();
  }

  public toggleCouponStatus(code: string): void {
    const coupons = this.getCoupons().map((c) => {
      if (c.code === code) {
        return { ...c, active: !c.active };
      }
      return c;
    });
    setStorage(STORAGE_KEY_COUPONS, coupons);
    this.notify();
  }

  // SETTINGS
  public getSettings(): StoreSettings {
    return getStorage<StoreSettings>(STORAGE_KEY_SETTINGS, INITIAL_SETTINGS);
  }

  public updateSettings(updates: Partial<StoreSettings>): StoreSettings {
    const current = this.getSettings();
    const updated = { ...current, ...updates };
    setStorage(STORAGE_KEY_SETTINGS, updated);
    this.notify();
    return updated;
  }

  // RESET DEMO
  public resetToDefaultDemo(): void {
    localStorage.removeItem(STORAGE_KEY_PRODUCTS);
    localStorage.removeItem(STORAGE_KEY_CART);
    localStorage.removeItem(STORAGE_KEY_WISHLIST);
    localStorage.removeItem(STORAGE_KEY_ORDERS);
    localStorage.removeItem(STORAGE_KEY_CUSTOMER);
    localStorage.removeItem(STORAGE_KEY_CUSTOMERS);
    localStorage.removeItem(STORAGE_KEY_COUPONS);
    localStorage.removeItem(STORAGE_KEY_SETTINGS);
    this.notify();
  }
}

export const storeService = new StoreService();
