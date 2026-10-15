import type { CartItem, Coupon } from '../types/index.ts';

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function calculateOrderTotals(
  items: CartItem[],
  coupon: Coupon | null = null,
  pointsToRedeem: number = 0,
  complimentaryThreshold: number = 20000,
  standardShippingFee: number = 0,
  pointsRedeemRate: number = 1,
  availablePoints: number = pointsToRedeem
) {
  if (items.some(i => !Number.isFinite(i.product.price) || i.product.price < 0 || !Number.isSafeInteger(i.quantity) || i.quantity < 1)) {
    throw new Error('Invalid cart price or quantity.');
  }
  if ([pointsToRedeem, complimentaryThreshold, standardShippingFee, pointsRedeemRate, availablePoints].some(n => !Number.isFinite(n) || n < 0)) {
    throw new Error('Invalid pricing settings.');
  }
  const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  let couponDiscount = 0;
  if (coupon && coupon.active && (!coupon.expiryDate || Date.parse(coupon.expiryDate + (/^\d{4}-\d{2}-\d{2}$/.test(coupon.expiryDate) ? 'T23:59:59+05:30' : '')) >= Date.now()) && subtotal >= coupon.minOrderValue && Number.isFinite(coupon.discountValue) && coupon.discountValue >= 0) {
    if (coupon.discountType === 'fixed') {
      couponDiscount = Math.min(coupon.discountValue, subtotal);
    } else {
      couponDiscount = round((subtotal * Math.min(100, coupon.discountValue)) / 100);
    }
    couponDiscount = Math.min(subtotal, couponDiscount, coupon.maxDiscountCap ?? Infinity);
    couponDiscount = round(Math.max(0, couponDiscount));
  }

  // 1 point = 1 INR
  const pointsRedeemed = pointsRedeemRate > 0 ? Math.min(Math.floor(pointsToRedeem), Math.floor(availablePoints), Math.floor(round(subtotal - couponDiscount) / pointsRedeemRate)) : 0;
  const pointsDiscount = round(pointsRedeemed * pointsRedeemRate);

  const shipping = !items.length || subtotal >= complimentaryThreshold ? 0 : standardShippingFee;
  const total = round(Math.max(0, subtotal - couponDiscount - pointsDiscount + shipping));

  return {
    subtotal,
    couponDiscount,
    pointsDiscount,
    pointsRedeemed,
    shipping,
    total,
  };
}
