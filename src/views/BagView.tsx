import { demoEnabled } from '../config/runtime.ts';
import { FeatureNotice } from '../components/FeatureUnavailable.tsx';
import React, { useState } from 'react';
import { CartItem, Product, Coupon } from '../types/index.ts';
import type { StoreSettings } from '../types/index.ts';
import { formatINR, calculateOrderTotals } from '../utils/pricing.ts';

interface BagViewProps {
  settings: StoreSettings;
  cart: CartItem[];
  appliedCoupon: Coupon | null;
  onApplyCoupon: (coupon: Coupon | null) => void;
  availableCoupons: Coupon[];
  pointsToRedeem: number;
  onTogglePoints: (redeem: boolean) => void;
  customerPoints: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => CartItem | undefined;
  onMoveToWishlist: (product: Product) => void;
  onNavigate: (path: string) => void;
}

export const BagView: React.FC<BagViewProps> = ({
  settings,
  cart,
  appliedCoupon,
  onApplyCoupon,
  availableCoupons,
  pointsToRedeem,
  onTogglePoints,
  customerPoints,
  onUpdateQuantity,
  onRemoveItem,
  onMoveToWishlist,
  onNavigate,
}) => {
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [offersModalOpen, setOffersModalOpen] = useState(false);
  const [undoToast, setUndoToast] = useState<{ id: string; name: string } | null>(null);

  const totals = calculateOrderTotals(
    cart,
    appliedCoupon,
    pointsToRedeem,
    settings.complimentaryShippingThreshold,
    settings.standardShippingFee,
    settings.loyaltyPointsRedeemRate,
    customerPoints
  );

  const handleApplyCoupon = (code: string) => {
    if (!demoEnabled) return;
    const found = availableCoupons.find(
      (c) => c.code.toUpperCase() === code.trim().toUpperCase() && c.active
    );
    if (found) {
      if (totals.subtotal >= found.minOrderValue) {
        onApplyCoupon(found);
        setCouponError(null);
        setOffersModalOpen(false);
        setCouponInput('');
      } else {
        setCouponError(`Requires minimum order value of ${formatINR(found.minOrderValue)}`);
      }
    } else {
      setCouponError('Coupon application is unavailable.');
    }
  };

  const handleRemove = (productId: string, name: string) => {
    onRemoveItem(productId);
    setUndoToast({ id: productId, name });
    setTimeout(() => {
      setUndoToast(null);
    }, 4500);
  };

  const totalQuantity = cart.reduce((sum, i) => sum + i.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-[#F4EEE5] border border-[#B88A44] flex items-center justify-center text-[#780D24]">
          <span className="material-symbols-outlined text-[32px]">shopping_bag</span>
        </div>
        <h2 className="font-serif text-[22px] text-[#231919] font-medium">
          Your bag is empty
        </h2>
        <p className="font-sans text-[14px] text-[#5F5552] leading-relaxed">
          Browse the shop or contact us for assistance.
        </p>
        <div className="pt-2">
          <button
            onClick={() => onNavigate('/shop')}
            className="px-6 py-3 bg-[#780D24] text-white rounded-lg font-sans text-[13px] font-bold uppercase tracking-wider hover:bg-[#5E091B] transition-colors shadow-sm"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md md:max-w-4xl mx-auto px-4 pt-2 pb-44 md:pb-28 space-y-4">
      {/* Sub-header */}
      <div className="bg-white text-[#231919] p-4 rounded-xl border border-[#E8DDD6] flex items-baseline justify-between shadow-xs">
        <h1 className="font-serif text-[20px] font-medium tracking-tight">
          My Bag ({totalQuantity} {totalQuantity === 1 ? 'item' : 'items'})
        </h1>
        <span className="text-[12px] text-[#5F5552] font-sans">
          {demoEnabled ? 'Standard insured shipping' : 'Saved on this device'}
        </span>
      </div>

      {/* Undo Toast Banner */}
      {undoToast && (
        <div className="bg-[#F4EEE5] border-l-4 border-[#780D24] p-3 rounded-r flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#780D24] text-[18px]">
              check_circle
            </span>
            <p className="text-[13px] text-[#231919] font-sans">
              Removed <strong>&apos;{undoToast.name}&apos;</strong>
            </p>
          </div>
          <button
            onClick={() => setUndoToast(null)}
            className="text-[12px] text-[#780D24] font-bold uppercase tracking-wider hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left column: Cart Items */}
        <div className="md:col-span-7 space-y-3.5">
          {cart.map((item) => (
            <article
              key={item.productId}
              className="bg-white rounded-xl border border-[#E8DDD6] p-4 shadow-xs space-y-3"
            >
              <div className="flex gap-3.5">
                {/* 3:4 Thumbnail */}
                <div
                  onClick={() => onNavigate(`/product/${item.product.id}`)}
                  className="w-20 shrink-0 aspect-[3/4] relative bg-[#F4EEE5] overflow-hidden rounded border border-[#E8DDD6] cursor-pointer"
                >
                  <img
                    src={item.product.images.full}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-0 inset-x-0 bg-[#231919]/80 text-[8px] font-medium tracking-widest text-center text-white py-0.5 uppercase font-sans">
                    {item.product.categoryLabel.slice(0, 11)}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h2
                    onClick={() => onNavigate(`/product/${item.product.id}`)}
                    className="font-serif text-[15px] leading-tight text-[#231919] font-medium line-clamp-2 cursor-pointer hover:text-[#780D24]"
                  >
                    {item.product.name}
                  </h2>
                  <p className="text-[12px] text-[#5F5552] mt-1 truncate font-sans">
                    {item.selectedColor || item.product.subtitle}
                  </p>

                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-[17px] font-bold text-[#780D24] font-sans">
                      {formatINR(item.product.price)}
                    </span>
                    {item.product.originalPrice && (
                      <span className="text-[12px] text-[#5F5552] line-through font-sans">
                        {formatINR(item.product.originalPrice)}
                      </span>
                    )}
                    {item.product.discountPercent && (
                      <span className="text-[11px] font-bold text-[#B88A44] font-sans">
                        {item.product.discountPercent}% OFF
                      </span>
                    )}
                  </div>

                  {/* Stock remaining pill */}
                  {item.product.stockCount <= 2 && (
                    <div className="inline-flex items-center gap-1.5 bg-[#FFF0F0] border border-[#FE7582]/40 rounded px-2 py-0.5 mt-2">
                      <span className="material-symbols-outlined text-[#780D24] text-[13px]">
                        alarm
                      </span>
                      <span className="text-[11px] font-medium text-[#780D24] font-sans">
                        Sample stock: {item.product.stockCount} remaining
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Controls & Actions */}
              <div className="pt-2.5 border-t border-[#F4EEE5] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#5F5552] font-sans">Quantity:</span>
                  <div className="flex items-center border border-[#E8DDD6] rounded bg-white">
                    <button
                      onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                      className="w-11 h-11 flex items-center justify-center text-[#231919] hover:bg-[#F4EEE5] active:bg-[#E8DDD6] transition-colors"
                      type="button"
                      aria-label="Decrease quantity"
                    >
                      <span className="material-symbols-outlined text-[16px]">remove</span>
                    </button>
                    <span className="w-8 text-center text-[13px] font-semibold text-[#231919] font-sans">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                      className="w-11 h-11 flex items-center justify-center text-[#231919] hover:bg-[#F4EEE5] active:bg-[#E8DDD6] transition-colors"
                      type="button"
                      aria-label="Increase quantity"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-1 text-[12px] font-sans">
                  <button
                    onClick={() => {
                      onMoveToWishlist(item.product);
                      onRemoveItem(item.productId);
                    }}
                    className="font-medium text-[#B88A44] hover:underline flex items-center py-1"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px] mr-1">favorite</span>
                    Move to Wishlist
                  </button>
                  <span className="text-[#E8DDD6]">|</span>
                  <button
                    onClick={() => handleRemove(item.productId, item.product.name)}
                    className="font-medium text-[#780D24] hover:underline flex items-center py-1"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px] mr-1">delete</span>
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Right column: Coupons, Points & Summary */}
        <div className="md:col-span-5 space-y-4">
          {!demoEnabled && <FeatureNotice>Checkout, coupons and loyalty are unavailable. Sample prices are for review; shipping and the final payable amount are not calculated.</FeatureNotice>}
          {demoEnabled && <>
          {/* Apply Coupon Section */}
          <section className="bg-white rounded-xl border border-[#E8DDD6] p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-serif text-[15px] font-semibold text-[#231919] flex items-center">
                <span className="material-symbols-outlined text-[#B88A44] text-[18px] mr-1.5">
                  sell
                </span>
                Apply Coupon
              </span>
              <button
                onClick={() => setOffersModalOpen(true)}
                className="text-[12px] font-sans font-medium text-[#780D24] hover:underline"
                type="button"
              >
                View Offers
              </button>
            </div>

            {appliedCoupon ? (
              <div className="flex items-center justify-between p-3 bg-[#FBF7F0] border border-[#B88A44]/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#780D24] text-[18px]">
                    verified
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[13px] tracking-wider text-[#231919] font-sans">
                        {appliedCoupon.code}
                      </span>
                      <span className="text-[11px] font-bold text-[#780D24] font-sans">
                        (-{formatINR(totals.couponDiscount)} saved)
                      </span>
                    </div>
                    <span className="text-[10px] text-[#5F5552] font-sans">
                      {appliedCoupon.description}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onApplyCoupon(null)}
                  className="text-[11px] font-sans font-bold text-[#780D24] uppercase tracking-wider hover:underline px-2 py-1"
                  type="button"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Enter coupon code"
                    className="flex-1 min-w-0 h-11 px-3 bg-[#FBF7F0] border border-[#E8DDD6] rounded text-[13px] uppercase tracking-wider font-sans text-[#231919] focus:outline-none focus:border-[#780D24]"
                  />
                  <button
                    onClick={() => handleApplyCoupon(couponInput)}
                    className="h-11 px-5 bg-[#780D24] hover:bg-[#5E091B] text-white font-sans text-[13px] font-semibold uppercase tracking-wider rounded transition-colors"
                    type="button"
                  >
                    Apply
                  </button>
                </div>
                {couponError && (
                  <p className="text-[11px] text-[#BA1A1A] font-sans flex items-center">
                    <span className="material-symbols-outlined text-[14px] mr-1">error</span>
                    {couponError}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Loyalty Points Section */}
          <section className="bg-white rounded-xl border border-[#E8DDD6] p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#B88A44] text-[18px]">
                  workspace_premium
                </span>
                <h3 className="font-serif text-[15px] font-semibold text-[#231919]">
                  Loyalty Points
                </h3>
              </div>
              <span className="text-[12px] font-sans font-semibold text-[#780D24]">
                {customerPoints} pts available
              </span>
            </div>

            <label className="flex items-start gap-3 bg-[#FBF7F0] p-3 rounded-lg border border-[#E8DDD6] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={pointsToRedeem > 0}
                onChange={(e) => onTogglePoints(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-[#780D24] rounded border-[#E8DDD6] focus:ring-[#780D24] accent-[#780D24]"
              />
              <div className="flex-1">
                <div className="flex justify-between items-baseline font-sans">
                  <span className="text-[13px] font-medium text-[#231919]">
                    Redeem 200 points for ₹200 off
                  </span>
                  <span className="text-[13px] font-bold text-[#780D24]">-₹200</span>
                </div>
                <p className="text-[11px] text-[#5F5552] mt-0.5 font-sans">
                  Remaining {Math.max(0, customerPoints - pointsToRedeem)} pts will be preserved for your subsequent purchase.
                </p>
              </div>
            </label>
          </section>

          </>}
          {/* Order Summary */}
          <section className="bg-white rounded-xl border border-[#E8DDD6] p-4 shadow-xs space-y-2.5">
            <h3 className="font-serif text-[16px] text-[#231919] pb-2 border-b border-[#E8DDD6] font-medium">
              Order Summary
            </h3>
            <div className="space-y-2 text-[13px] font-sans text-[#5F5552]">
              <div className="flex justify-between items-center">
                <span>Subtotal ({totalQuantity} {totalQuantity === 1 ? 'item' : 'items'})</span>
                <span className="font-medium text-[#231919]">{formatINR(totals.subtotal)}</span>
              </div>

              {totals.couponDiscount > 0 && (
                <div className="flex justify-between items-center text-[#780D24]">
                  <span className="flex items-center">
                    <span className="material-symbols-outlined text-[15px] mr-1">sell</span>
                    Coupon Discount ({appliedCoupon?.code})
                  </span>
                  <span className="font-medium">-{formatINR(totals.couponDiscount)}</span>
                </div>
              )}

              {totals.pointsDiscount > 0 && (
                <div className="flex justify-between items-center text-[#780D24]">
                  <span className="flex items-center">
                    <span className="material-symbols-outlined text-[15px] mr-1">stars</span>
                    Points Redeemed
                  </span>
                  <span className="font-medium">-{formatINR(totals.pointsDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span>Estimated Shipping</span>
                <span className="text-[12px] text-[#5F5552] italic">
                  {!demoEnabled ? 'Not calculated' : totals.shipping === 0 ? 'Complimentary (FREE)' : formatINR(totals.shipping)}
                </span>
              </div>
            </div>

            <div className="pt-3 mt-2 border-t border-[#E8DDD6] flex justify-between items-baseline">
              <div>
                <span className="font-serif text-[16px] text-[#231919] font-semibold block">
                  {demoEnabled ? 'Estimated Total' : 'Sample subtotal'}
                </span>
                <span className="text-[10px] text-[#5F5552] font-sans">
                  {demoEnabled ? 'Inclusive of handcrafted textile levies' : 'Sample subtotal; not payable'}
                </span>
              </div>
              <span className="font-sans text-[22px] font-bold text-[#780D24]">
                {formatINR(demoEnabled ? totals.total : totals.subtotal)}
              </span>
            </div>
          </section>

          {/* Continue shopping link */}
          <div className="text-center pt-2">
            <button
              onClick={() => onNavigate('/shop')}
              className="text-[12px] font-sans font-bold text-[#780D24] uppercase tracking-wider hover:underline inline-flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Continue Shopping</span>
            </button>
          </div>
        </div>
      </div>

      {/* Available Coupons Modal */}
      {offersModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-xl sm:rounded-xl p-5 space-y-4 max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E8DDD6] pb-3">
              <h4 className="font-serif text-[17px] font-semibold text-[#231919]">
                Available Atelier Coupons
              </h4>
              <button
                onClick={() => setOffersModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#5F5552] hover:text-[#231919]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="space-y-3">
              {availableCoupons.map((coupon) => (
                <div
                  key={coupon.code}
                  className="border border-[#B88A44]/50 rounded-lg p-3.5 bg-[#FBF7F0] space-y-1.5"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[13px] text-[#780D24] tracking-wider font-sans">
                      {coupon.code}
                    </span>
                    <button
                      onClick={() => handleApplyCoupon(coupon.code)}
                      className="text-[11px] font-sans font-bold text-[#780D24] border border-[#780D24] px-3 py-1 rounded hover:bg-[#780D24] hover:text-white transition-colors uppercase"
                    >
                      Apply
                    </button>
                  </div>
                  <p className="text-[13px] font-sans text-[#231919] font-medium">
                    {coupon.description}
                  </p>
                  <p className="text-[11px] font-sans text-[#5F5552]">
                    Requires minimum cart value of {formatINR(coupon.minOrderValue)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Commerce Bar */}
      <aside className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0 inset-x-0 z-40 bg-white border-t border-[#E8DDD6] shadow-[0_-4px_16px_rgba(35,25,25,0.08)]">
        <div className="max-w-md md:max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="w-[42%] flex flex-col justify-center">
            <span className="text-[10px] text-[#5F5552] uppercase tracking-wider font-sans leading-none">
              {demoEnabled ? 'Estimated Total' : 'Sample subtotal'}
            </span>
            <span className="text-[20px] font-bold text-[#780D24] font-sans leading-tight mt-0.5">
              {formatINR(demoEnabled ? totals.total : totals.subtotal)}
            </span>
            <span className="text-[11px] text-[#B88A44] font-medium font-sans leading-none mt-0.5">
              View Breakdown
            </span>
          </div>

          <div className="w-[58%]">
            <button
              disabled={!demoEnabled} onClick={() => { if (demoEnabled) onNavigate('/checkout'); }}
              className="w-full h-12 bg-[#780D24] hover:bg-[#5E091B] text-white rounded-lg font-sans text-[13px] font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <span>{demoEnabled ? 'Proceed to Checkout' : 'Checkout unavailable'}</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
