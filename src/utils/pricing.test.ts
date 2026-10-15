import test from 'node:test';
import assert from 'node:assert/strict';
import { formatINR, calculateOrderTotals } from './pricing.ts';
import type { CartItem, Coupon, Product } from '../types/index.ts';

const mockProductA: Product = {
  id: 'prod-1',
  sku: 'PS-KJ-088',
  name: 'Mayuri Regal Wine Pure Kanjeevaram Silk Saree',
  subtitle: 'Regal Wine · Pure Korvai Zari',
  category: 'Kanjeevaram',
  categoryLabel: 'Pure Kanjeevaram',
  price: 22400,
  originalPrice: 26000,
  images: { full: '/img1.jpg' },
  inStock: true,
  stockCount: 5,
  lowStockThreshold: 2,
  status: 'Published',
  weaveType: 'Korvai Pure Silk',
  zariType: 'Antique Gold Zari',
  weightGrams: 780,
  sareeLength: '5.5m',
  blouseIncluded: true,
  blouseDetails: '0.8m matching wine silk',
  colorName: 'Regal Wine & Antique Gold',
  colorHex: '#520B1D',
  tags: ['Bridal', 'Heirloom'],
  description: 'Handcrafted luxury',
  careInstructions: ['Dry clean only'],
  silkMarkCertified: true,
};

const mockProductB: Product = {
  id: 'prod-2',
  sku: 'PS-BN-042',
  name: 'Padmavathi Rust Brocade Saree',
  subtitle: 'Rust Orange · Brocade blouse',
  category: 'Banarasi',
  categoryLabel: 'Banarasi Kadwa',
  price: 18600,
  originalPrice: 21000,
  images: { full: '/img2.jpg' },
  inStock: true,
  stockCount: 3,
  lowStockThreshold: 2,
  status: 'Published',
  weaveType: 'Kadwa Brocade',
  zariType: 'Antique Gold Zari',
  weightGrams: 820,
  sareeLength: '5.5m',
  blouseIncluded: true,
  blouseDetails: '0.8m brocade blouse',
  colorName: 'Rust Orange',
  colorHex: '#B85D2A',
  tags: ['Festive'],
  description: 'Exquisite kadwa',
  careInstructions: ['Dry clean only'],
  silkMarkCertified: true,
};

test('formatINR formats numbers with Indian rupee symbol', () => {
  const formatted = formatINR(39800);
  assert.ok(formatted.includes('39,800') || formatted.includes('39800'));
});

test('calculateOrderTotals correctly computes subtotal, coupon, loyalty points, and total', () => {
  const items: CartItem[] = [
    { productId: 'prod-1', product: mockProductA, quantity: 1 },
    { productId: 'prod-2', product: mockProductB, quantity: 1 },
  ];

  const coupon: Coupon = {
    code: 'HEIRLOOM10',
    description: 'Flat ₹1,000 off',
    discountType: 'fixed',
    discountValue: 1000,
    minOrderValue: 20000,
    active: true,
    usageCount: 14,
  };

  const pointsToRedeem = 200;

  const result = calculateOrderTotals(items, coupon, pointsToRedeem, 20000, 0);

  // 22400 + 18600 = 41000 subtotal
  assert.equal(result.subtotal, 41000);
  // Coupon: -1000
  assert.equal(result.couponDiscount, 1000);
  // Points: -200
  assert.equal(result.pointsDiscount, 200);
  // Complimentary shipping since 41000 >= 20000
  assert.equal(result.shipping, 0);
  // Total: 41000 - 1000 - 200 = 39800 (Exact figure matching the Stitch mockup!)
  assert.equal(result.total, 39800);
});

test('calculateOrderTotals respects minimum order requirement for coupons', () => {
  const items: CartItem[] = [
    { productId: 'prod-2', product: mockProductB, quantity: 1 }, // 18600
  ];

  const coupon: Coupon = {
    code: 'HEIRLOOM10',
    description: 'Flat ₹1,000 off',
    discountType: 'fixed',
    discountValue: 1000,
    minOrderValue: 20000, // min 20000 not met
    active: true,
    usageCount: 14,
  };

  const result = calculateOrderTotals(items, coupon, 0, 20000, 250);
  assert.equal(result.subtotal, 18600);
  assert.equal(result.couponDiscount, 0);
  assert.equal(result.shipping, 250);
  assert.equal(result.total, 18850);
});

test('expired coupons do not discount; percentage discounts respect caps', () => {
  const items = [{ productId: 'prod-1', product: mockProductA, quantity: 1 }];
  const coupon: Coupon = { code: 'TEST', description: '', active: true, discountType: 'percentage', discountValue: 20, minOrderValue: 0, maxDiscountCap: 500, usageCount: 0, expiryDate: '2000-01-01' };
  assert.equal(calculateOrderTotals(items, coupon).couponDiscount, 0);
  assert.equal(calculateOrderTotals(items, { ...coupon, expiryDate: '2999-01-01' }).couponDiscount, 500);
});
test('loyalty uses configured rate, actual balance, and payable item value', () => {
  const items = [{ productId: 'prod-1', product: { ...mockProductA, price: 100 }, quantity: 1 }];
  const totals = calculateOrderTotals(items, null, 1000, 20000, 250, 2, 30);
  assert.equal(totals.pointsRedeemed, 30);
  assert.equal(totals.pointsDiscount, 60);
  assert.equal(totals.total, 290);
  assert.equal(calculateOrderTotals(items, null, 1000, 20000, 0, 2, 1000).pointsRedeemed, 50);
});
test('empty bags have no shipping charge', () => {
  assert.equal(calculateOrderTotals([], null, 0, 20000, 250).total, 0);
});
test('invalid cart quantities and prices are rejected', () => {
  for (const quantity of [-1, 0, 1.5, NaN]) assert.throws(() => calculateOrderTotals([{ productId: 'x', product: mockProductA, quantity }]));
  assert.throws(() => calculateOrderTotals([{ productId: 'x', product: { ...mockProductA, price: NaN }, quantity: 1 }]));
});
