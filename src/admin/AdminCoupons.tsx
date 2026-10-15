import React, { useState } from 'react';
import { Coupon } from '../types/index.ts';
import { formatINR } from '../utils/pricing.ts';

interface AdminCouponsProps {
  coupons: Coupon[];
  onSaveCoupon: (coupon: Coupon) => void;
  onToggleStatus: (code: string) => void;
}

export const AdminCoupons: React.FC<AdminCouponsProps> = ({
  coupons,
  onSaveCoupon,
  onToggleStatus,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCoupon, setNewCoupon] = useState<Coupon>({
    code: '',
    discountType: 'percentage',
    discountValue: 10,
    minOrderValue: 25000,
    maxDiscountCap: 5000,
    description: '',
    expiryDate: '2026-12-31',
    active: true,
    usageCount: 0,
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code.trim()) return;
    onSaveCoupon({
      ...newCoupon,
      code: newCoupon.code.toUpperCase().trim(),
    });
    setShowAddModal(false);
    setNewCoupon({
      code: '',
      discountType: 'percentage',
      discountValue: 10,
      minOrderValue: 25000,
      maxDiscountCap: 5000,
      description: '',
      expiryDate: '2026-12-31',
      active: true,
    usageCount: 0,
    });
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8DDD6]">
        <div>
          <span className="text-[11px] font-bold text-[#780D24] uppercase tracking-wider block">
            Promotions &amp; Loyalty Rewards
          </span>
          <h1 className="font-serif text-[24px] sm:text-[28px] font-semibold text-[#231919]">
            Coupons &amp; Loyalty Rules
          </h1>
          <p className="text-[13px] text-[#5F5552] mt-0.5">
            Configure bridal seasonal codes, minimum spend thresholds, and patron loyalty rewards.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="h-10 px-4 bg-[#780D24] hover:bg-[#5E091B] text-white text-[13px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>+ Create New Coupon</span>
        </button>
      </div>

      {/* Loyalty Policy Box */}
      <div className="bg-gradient-to-r from-[#F4EEE5] to-white border border-[#B88A44]/40 rounded-xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#780D24] text-white flex items-center justify-center shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-[20px]">stars</span>
          </div>
          <div>
            <h3 className="font-serif text-[16px] font-semibold text-[#231919]">
              Parinaya Patron Loyalty Engine
            </h3>
            <p className="text-[12px] text-[#5F5552] max-w-xl mt-0.5 leading-relaxed">
              Patrons earn <strong>1 Parinaya Silk Point</strong> for every ₹100 spent on handloom sarees.
              Points redeem directly as cash discount (1 pt = ₹1 INR) during checkout up to 2,500 points per order.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto bg-white px-3 py-1.5 rounded-lg border border-[#E8DDD6] text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          <span className="font-semibold text-[#231919]">Active &amp; Auto-Credited</span>
        </div>
      </div>

      {/* Coupons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map((coupon) => (
          <div
            key={coupon.code}
            className={`bg-white border rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4 transition-all ${
              coupon.active
                ? 'border-[#E8DDD6] hover:border-[#B88A44]'
                : 'border-stone-200 opacity-60 bg-stone-50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-[16px] text-[#780D24] bg-[#F4EEE5] px-2.5 py-1 rounded border border-[#B88A44]/30 tracking-wider">
                  {coupon.code}
                </span>
                <button
                  onClick={() => onToggleStatus(coupon.code)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    coupon.active
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      : 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {coupon.active ? 'Active' : 'Disabled'}
                </button>
              </div>

              <div className="mt-3">
                <span className="text-[20px] font-serif font-bold text-[#231919]">
                  {coupon.discountType === 'percentage'
                    ? `${coupon.discountValue}% OFF`
                    : `${formatINR(coupon.discountValue)} FLAT OFF`}
                </span>
                <p className="text-xs text-[#5F5552] mt-1">{coupon.description}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#F4EEE5] text-[11px] text-[#817567] space-y-1">
              <div className="flex justify-between">
                <span>Min Order Spend:</span>
                <strong className="text-[#231919]">{formatINR(coupon.minOrderValue)}</strong>
              </div>
              {coupon.maxDiscountCap && (
                <div className="flex justify-between">
                  <span>Max Cap:</span>
                  <strong className="text-[#231919]">{formatINR(coupon.maxDiscountCap)}</strong>
                </div>
              )}
              <div className="flex justify-between">
                <span>Valid Until:</span>
                <span className="font-mono text-[#231919]">{coupon.expiryDate}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Coupon Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#B88A44]/30 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DDD6]">
              <h3 className="font-serif text-[18px] font-semibold text-[#231919]">
                Create Promo Coupon
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#817567] hover:text-[#231919]">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#231919] block mb-1">Coupon Code *</label>
                <input
                  type="text"
                  placeholder="e.g. BRIDAL3000"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  className="w-full h-9 px-3 border border-[#E8DDD6] rounded-lg font-mono uppercase bg-[#FBF7F0]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#231919] block mb-1">Discount Type</label>
                  <select
                    value={newCoupon.discountType}
                    onChange={(e) =>
                      setNewCoupon({
                        ...newCoupon,
                        discountType: e.target.value as 'percentage' | 'fixed',
                      })
                    }
                    className="w-full h-9 px-2 border border-[#E8DDD6] rounded-lg bg-[#FBF7F0]"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Flat Cash (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#231919] block mb-1">Discount Value</label>
                  <input
                    type="number"
                    value={newCoupon.discountValue}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, discountValue: Number(e.target.value) })
                    }
                    className="w-full h-9 px-3 border border-[#E8DDD6] rounded-lg bg-[#FBF7F0]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#231919] block mb-1">Min Order (₹)</label>
                  <input
                    type="number"
                    value={newCoupon.minOrderValue}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, minOrderValue: Number(e.target.value) })
                    }
                    className="w-full h-9 px-3 border border-[#E8DDD6] rounded-lg bg-[#FBF7F0]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#231919] block mb-1">Max Cap (₹)</label>
                  <input
                    type="number"
                    value={newCoupon.maxDiscountCap || ''}
                    onChange={(e) =>
                      setNewCoupon({
                        ...newCoupon,
                        maxDiscountCap: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full h-9 px-3 border border-[#E8DDD6] rounded-lg bg-[#FBF7F0]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#231919] block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Special wedding season discount on pure Kanjeevarams"
                  value={newCoupon.description}
                  onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
                  className="w-full h-9 px-3 border border-[#E8DDD6] rounded-lg bg-[#FBF7F0]"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-[#231919] block mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={newCoupon.expiryDate}
                  onChange={(e) => setNewCoupon({ ...newCoupon, expiryDate: e.target.value })}
                  className="w-full h-9 px-3 border border-[#E8DDD6] rounded-lg bg-[#FBF7F0]"
                  required
                />
              </div>

              <div className="pt-3 border-t border-[#E8DDD6] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-[#E8DDD6] rounded-lg font-semibold text-[#5F5552]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#780D24] text-white rounded-lg font-semibold hover:bg-[#5E091B]"
                >
                  Save Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
