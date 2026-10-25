import type { Product, CartItem, WishlistItem, Order, Customer, Coupon, StoreSettings, Address } from '../types/index.ts';

// These business repositories are not connected yet. Empty data is explicit;
// no fixtures, browser records or fallback catalogue are loaded by the app.
const unavailable = (): never => { throw new Error('This feature is not connected.'); };
class StoreService {
  public subscribe(_callback: () => void) { return () => {}; }
  public getProducts(): Product[] { return []; }
  public getProductById(_id: string): Product | undefined { return undefined; }
  public getCart(): CartItem[] { return []; }
  public getWishlist(): WishlistItem[] { return []; }
  public getOrders(): Order[] { return []; }
  public getOrderById(_id: string): Order | undefined { return undefined; }
  public getCustomersList(): Customer[] { return []; }
  public getCoupons(): Coupon[] { return []; }
  public getCustomer(): Customer {
    return { id: '', name: '', email: '', phone: '', addresses: [], lifetimeSpend: 0, totalOrdersCount: 0, pointsBalance: 0, vipTier: 'Club Member', registeredDate: '', whatsappOptIn: false };
  }
  public getSettings(): StoreSettings {
    return { storeName: 'PARINAYA SILKS', whatsapp: '', email: '', instagram: '', location: '', complimentaryShippingThreshold: 0, standardShippingFee: 0, loyaltyPointsEarnRate: 0, loyaltyPointsRedeemRate: 0, announcementBarText: '', announcementBarActive: false };
  }
  public createOrder(_data: unknown): Order { throw new Error('Live checkout is not connected.'); }
  public updateCustomerProfile(_updates: Partial<Customer>): Customer { return unavailable(); }
  public addCustomerAddress(_address: Omit<Address, 'id'>): Address { return unavailable(); }
  public removeCustomerAddress(_id: string): void { unavailable(); }
  public addToCart(_product: Product, _quantity = 1, _color?: string): void { unavailable(); }
  public updateCartQuantity(_id: string, _quantity: number): void { unavailable(); }
  public removeFromCart(_id: string): CartItem | undefined { return undefined; }
  public clearCart(): void { unavailable(); }
  public toggleWishlist(_product: Product): boolean { return unavailable(); }
  public removeFromWishlist(_id: string): WishlistItem | undefined { return undefined; }
}
export const storeService = new StoreService();
