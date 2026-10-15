import type { CartItem, Coupon } from '../types/index.ts';

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateOrderTotals(
  items: CartItem[],
  coupon: Coupon | null = null,
  pointsToRedeem: number = 0,
  complimentaryThreshold: number = 20000,
  standardShippingFee: number = 0
) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  let couponDiscount = 0;
  if (coupon && coupon.active && subtotal >= coupon.minOrderValue) {
    if (coupon.discountType === 'fixed') {
      couponDiscount = Math.min(coupon.discountValue, subtotal);
    } else {
      couponDiscount = Math.round((subtotal * coupon.discountValue) / 100);
    }
  }

  // 1 point = 1 INR
  const pointsDiscount = Math.min(Math.max(0, pointsToRedeem), Math.max(0, subtotal - couponDiscount));

  const shipping = subtotal >= complimentaryThreshold ? 0 : standardShippingFee;
  const total = Math.max(0, subtotal - couponDiscount - pointsDiscount + shipping);

  return {
    subtotal,
    couponDiscount,
    pointsDiscount,
    shipping,
    total,
  };
}
