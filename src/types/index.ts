export type FulfilmentStatus =
  | 'Unfulfilled'
  | 'Processing'
  | 'Packed'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export type PaymentStatus = 'Paid' | 'Pending' | 'Failed' | 'Refunded';

export interface Product {
  // Future product persistence will use this stable reference, not a category name.
  categoryId?: string;
  id: string;
  sku: string;
  name: string;
  subtitle: string;
  category: 'Kanjeevaram' | 'Banarasi' | 'Mangalagiri' | 'Tussar' | 'Organza' | 'Ikat';
  categoryLabel: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  images: {
    full: string;
    pallu?: string;
    border?: string;
    blouse?: string;
  };
  inStock: boolean;
  stockCount: number;
  lowStockThreshold: number;
  status: 'Published' | 'Draft' | 'Archived';
  weaveType: string;
  zariType: string;
  weightGrams: number;
  sareeLength: string;
  blouseIncluded: boolean;
  blouseDetails: string;
  colorName: string;
  colorHex: string;
  tags: string[];
  description: string;
  careInstructions: string[];
  origin?: string;
  silkMarkCertified: boolean;
}

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  selectedColor?: string;
}

export interface WishlistItem {
  productId: string;
  product: Product;
  addedAt: string;
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  line1: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  type: 'HOME' | 'WORK' | 'OTHER';
  isDefault?: boolean;
}

export interface OrderItem {
  productId: string;
  productName: string;
  subtitle: string;
  sku: string;
  price: number;
  quantity: number;
  image: string;
  category: string;
  blouseDetails?: string;
}

export interface TrackingMilestone {
  step: number;
  title: string;
  description: string;
  timestamp: string;
  completed: boolean;
  active?: boolean;
}

export interface CourierLog {
  timestamp: string;
  event: string;
  location: string;
}

export interface Order {
  id: string;
  referenceId: string; // e.g. "#PS-1089"
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: Address;
  items: OrderItem[];
  subtotal: number;
  couponCode?: string;
  couponDiscount: number;
  pointsRedeemed: number;
  pointsDiscount: number;
  shippingFee: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: 'UPI' | 'Card' | 'NetBanking';
  paymentGatewayRef?: string;
  fulfilmentStatus: FulfilmentStatus;
  courierPartner?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  latestStatusNote?: string;
  latestStatusTime?: string;
  timeline: TrackingMilestone[];
  courierLogs?: CourierLog[];
  internalNotes?: string;
  isBespokeBridal?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  addresses: Address[];
  lifetimeSpend: number;
  totalOrdersCount: number;
  pointsBalance: number;
  vipTier: 'Bridal Patron' | 'Heirloom Patron' | 'Club Member';
  registeredDate: string;
  whatsappOptIn: boolean;
}

export interface Coupon {
  maxDiscountCap?: number;
  code: string;
  description: string;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  minOrderValue: number;
  active: boolean;
  expiryDate?: string;
  usageCount: number;
}

export interface StoreSettings {
  gstin?: string;
  storeName: string;
  whatsapp: string;
  email: string;
  instagram: string;
  location: string;
  complimentaryShippingThreshold: number;
  standardShippingFee: number;
  loyaltyPointsEarnRate: number; // e.g. 1 point per 100 spent
  loyaltyPointsRedeemRate: number; // e.g. 1 point = 1 INR
  announcementBarText: string;
  announcementBarActive: boolean;
}
