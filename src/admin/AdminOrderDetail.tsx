import React, { useState } from 'react';
import { Order, FulfilmentStatus } from '../types/index.ts';
import { formatINR } from '../utils/pricing.ts';

interface AdminOrderDetailProps {
  order: Order | undefined;
  onNavigate: (path: string) => void;
  onUpdateOrder: (
    orderId: string,
    status: FulfilmentStatus,
    courier?: string,
    tracking?: string,
    notes?: string
  ) => void;
}

export const AdminOrderDetail: React.FC<AdminOrderDetailProps> = ({
  order,
  onNavigate,
  onUpdateOrder,
}) => {
  if (!order) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-[#E8DDD6]">
        <h2 className="font-serif text-[20px] text-[#231919]">Order Not Found</h2>
        <p className="text-[13px] text-[#5F5552] mt-1">
          The requested order does not exist or may have been removed.
        </p>
        <button
          onClick={() => onNavigate('/admin/orders')}
          className="mt-4 px-4 py-2 bg-[#780D24] text-white rounded-lg text-xs font-semibold"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  const [status, setStatus] = useState<FulfilmentStatus>(order.fulfilmentStatus);
  const [courier, setCourier] = useState(order.courierPartner || 'Blue Dart Express');
  const [tracking, setTracking] = useState(order.trackingNumber || '');
  const [notes, setNotes] = useState(order.internalNotes || '');
  const [saveToast, setSaveToast] = useState(false);
  const [showSlipModal, setShowSlipModal] = useState(false);

  const handleSave = () => {
    onUpdateOrder(order.id, status, courier, tracking, notes);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Bar with back link & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8DDD6]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('/admin/orders')}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#E8DDD6] bg-white hover:bg-[#F4EEE5] text-[#231919] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-[22px] sm:text-[26px] font-semibold text-[#231919]">
                {order.referenceId}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold ${
                  order.paymentStatus === 'Paid'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {order.paymentStatus}
              </span>
            </div>
            <p className="text-[12px] text-[#5F5552] mt-0.5">
              Placed on {order.createdAt} • Customer: {order.customerName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowSlipModal(true)}
            className="h-9 px-3.5 border border-[#B88A44] bg-white hover:bg-[#F4EEE5] text-[#780D24] text-[12px] font-semibold rounded-lg flex items-center gap-1.5 shadow-xs"
          >
            <span className="material-symbols-outlined text-[17px]">print</span>
            <span>Packing Slip</span>
          </button>
          <button
            onClick={handleSave}
            className="h-9 px-4 bg-[#780D24] hover:bg-[#5E091B] text-white text-[12px] font-semibold rounded-lg flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[17px]">check</span>
            <span>Save Order</span>
          </button>
        </div>
      </div>

      {saveToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg text-[13px] flex items-center gap-2 shadow-xs">
          <span className="material-symbols-outlined text-emerald-700 text-[18px]">check_circle</span>
          <span>Order #{order.referenceId} fulfillment details successfully saved.</span>
        </div>
      )}

      {/* Main Grid: Left Details + Right Fulfillment Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Items & Customer Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items Table */}
          <div className="bg-white border border-[#E8DDD6] rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#E8DDD6] bg-[#FBF7F0] flex items-center justify-between">
              <h2 className="font-serif text-[16px] font-semibold text-[#231919]">
                Ordered Sarees ({order.items.length})
              </h2>
              <span className="text-xs text-[#780D24] font-semibold">
                Pure Handloom Silk Guaranteed
              </span>
            </div>

            <div className="divide-y divide-[#F4EEE5]">
              {order.items.map((item, idx) => (
                <div key={idx} className="p-4 flex items-start gap-4 hover:bg-[#FBF7F0]/50 transition-colors">
                  <img
                    src={item.product.images.full}
                    alt={item.product.name}
                    className="w-16 h-20 object-cover rounded border border-[#E8DDD6] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-[#817567] uppercase block">
                          SKU: {item.product.sku}
                        </span>
                        <h3 className="font-serif text-[15px] font-semibold text-[#231919] leading-snug">
                          {item.product.name}
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-[#231919] text-[14px]">
                          {formatINR(item.product.price * item.quantity)}
                        </span>
                        <span className="text-[11px] text-[#5F5552] block">
                          {formatINR(item.product.price)} × {item.quantity}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 bg-[#F4EEE5] text-[#780D24] text-[10px] font-bold rounded">
                        {item.product.category}
                      </span>
                      {item.selectedColor && (
                        <span className="text-[11px] text-[#5F5552]">
                          Color: <strong>{item.selectedColor}</strong>
                        </span>
                      )}
                      {item.product.silkMark && (
                        <span className="text-[10px] text-amber-900 bg-amber-100/60 px-1.5 py-0.5 rounded font-bold">
                          ✓ Silk Mark
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="p-4 bg-[#FBF7F0] border-t border-[#E8DDD6] space-y-2 text-[13px]">
              <div className="flex justify-between text-[#5F5552]">
                <span>Items Subtotal:</span>
                <span>{formatINR(order.itemsSubtotal)}</span>
              </div>
              <div className="flex justify-between text-[#5F5552]">
                <span>Insured Express Shipping:</span>
                <span className="text-emerald-700 font-medium">
                  {order.shippingFee === 0 ? 'FREE' : formatINR(order.shippingFee)}
                </span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-[#780D24]">
                  <span>Coupon Discount ({order.appliedCouponCode || 'PROMO'}):</span>
                  <span>-{formatINR(order.discountAmount)}</span>
                </div>
              )}
              {order.pointsRedeemed > 0 && (
                <div className="flex justify-between text-[#B88A44]">
                  <span>Loyalty Redemption ({order.pointsRedeemed} pts):</span>
                  <span>-{formatINR(order.pointsRedeemed)}</span>
                </div>
              )}
              <div className="flex justify-between text-[16px] font-bold text-[#231919] pt-2 border-t border-[#E8DDD6]">
                <span>Total Paid via {order.paymentMethod}:</span>
                <span className="text-[#780D24]">{formatINR(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Customer & Address Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-[#E8DDD6] rounded-xl p-4 shadow-xs space-y-2">
              <span className="text-[11px] font-bold text-[#780D24] uppercase tracking-wider block">
                Patron Contact
              </span>
              <div className="font-semibold text-[14px] text-[#231919]">{order.customerName}</div>
              <p className="text-[12px] text-[#5F5552]">
                Email: <span className="text-[#231919]">{order.customerEmail}</span>
              </p>
              <p className="text-[12px] text-[#5F5552]">
                Mobile: <span className="text-[#231919] font-mono">{order.customerPhone}</span>
              </p>
            </div>

            <div className="bg-white border border-[#E8DDD6] rounded-xl p-4 shadow-xs space-y-2">
              <span className="text-[11px] font-bold text-[#780D24] uppercase tracking-wider block">
                Delivery Address
              </span>
              <div className="font-semibold text-[14px] text-[#231919]">{order.shippingAddress.name}</div>
              <p className="text-[12px] text-[#5F5552] leading-relaxed">
                {order.shippingAddress.street}, {order.shippingAddress.city},<br />
                {order.shippingAddress.state} - {order.shippingAddress.pincode}
              </p>
            </div>
          </div>
        </div>

        {/* Right Col: Fulfillment Workflow Manager */}
        <div className="space-y-6">
          <div className="bg-white border border-[#E8DDD6] rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DDD6]">
              <h2 className="font-serif text-[16px] font-semibold text-[#231919]">
                Fulfillment Status
              </h2>
              <span className="px-2 py-0.5 bg-[#F4EEE5] text-[#780D24] text-[11px] font-bold rounded">
                Current: {status}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-semibold text-[#231919] block mb-1">
                  Change Milestone
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as FulfilmentStatus)}
                  className="w-full h-10 px-3 border border-[#E8DDD6] rounded-lg text-[13px] bg-[#FBF7F0] text-[#231919] focus:outline-none focus:border-[#780D24]"
                >
                  <option value="Unfulfilled">Unfulfilled</option>
                  <option value="Processing">Processing (Assay Check)</option>
                  <option value="Packed">Packed (Muslin Wrapped)</option>
                  <option value="Shipped">Shipped (Dispatched)</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="text-[12px] font-semibold text-[#231919] block mb-1">
                  Courier Partner
                </label>
                <input
                  type="text"
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                  placeholder="e.g. Blue Dart Express, Delhivery"
                  className="w-full h-9 px-3 border border-[#E8DDD6] rounded-lg text-[13px] bg-[#FBF7F0]"
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-[#231919] block mb-1">
                  AWB / Tracking Number
                </label>
                <input
                  type="text"
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="e.g. BD-HYD-849204"
                  className="w-full h-9 px-3 border border-[#E8DDD6] rounded-lg text-[13px] bg-[#FBF7F0] font-mono"
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-[#231919] block mb-1">
                  Atelier &amp; Staff Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Private packing instructions, loom lot notes..."
                  className="w-full p-2.5 border border-[#E8DDD6] rounded-lg text-[12px] bg-[#FBF7F0] text-[#231919]"
                />
              </div>

              <button
                onClick={handleSave}
                className="w-full py-2.5 bg-[#780D24] text-white rounded-lg text-[13px] font-semibold hover:bg-[#5E091B] transition-colors shadow-xs"
              >
                Apply Changes
              </button>
            </div>
          </div>

          {/* Stepper Preview */}
          <div className="bg-white border border-[#E8DDD6] rounded-xl p-5 shadow-xs space-y-3">
            <span className="text-[11px] font-bold text-[#5F5552] uppercase tracking-wider block">
              Timeline Milestones
            </span>
            <div className="space-y-3">
              {order.timeline.map((item) => (
                <div key={item.step} className="flex items-start gap-2.5 text-xs">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5 ${
                      item.completed
                        ? 'bg-[#780D24] text-white'
                        : item.active
                        ? 'bg-[#B88A44] text-white animate-pulse'
                        : 'bg-[#E8DDD6] text-[#817567]'
                    }`}
                  >
                    {item.completed ? '✓' : item.step}
                  </div>
                  <div>
                    <div className="font-semibold text-[#231919]">{item.title}</div>
                    <div className="text-[11px] text-[#5F5552]">{item.description}</div>
                    <div className="text-[10px] text-[#817567]">{item.timestamp}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Packing Slip Modal */}
      {showSlipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-2xl border border-[#B88A44]/30 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DDD6]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#780D24] text-white font-serif font-bold flex items-center justify-center text-xs">
                  PS
                </div>
                <div>
                  <h3 className="font-serif text-[16px] font-bold text-[#780D24]">PARINAYA SILKS</h3>
                  <span className="text-[10px] text-[#5F5552] uppercase tracking-wider">
                    Official Dispatch Slip &amp; Assay Manifest
                  </span>
                </div>
              </div>
              <button onClick={() => setShowSlipModal(false)} className="text-[#817567] hover:text-[#231919]">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-4 border border-[#E8DDD6] rounded-lg bg-[#FBF7F0] text-xs space-y-2 font-mono">
              <div className="flex justify-between">
                <span>ORDER: <strong>{order.referenceId}</strong></span>
                <span>DATE: <strong>{order.createdAt}</strong></span>
              </div>
              <div className="flex justify-between">
                <span>CLIENT: <strong>{order.customerName}</strong></span>
                <span>PHONE: <strong>{order.customerPhone}</strong></span>
              </div>
              <div>
                <span>SHIP TO: </span>
                <span className="font-sans font-medium text-[#231919]">
                  {order.shippingAddress.name}, {order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                </span>
              </div>
            </div>

            <table className="w-full text-left text-xs border border-[#E8DDD6]">
              <thead className="bg-[#F4EEE5] text-[#5F5552]">
                <tr>
                  <th className="p-2">Item</th>
                  <th className="p-2">SKU</th>
                  <th className="p-2 text-center">Qty</th>
                  <th className="p-2 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DDD6]">
                {order.items.map((i, idx) => (
                  <tr key={idx}>
                    <td className="p-2 font-medium">{i.product.name}</td>
                    <td className="p-2 font-mono text-[11px]">{i.product.sku}</td>
                    <td className="p-2 text-center">{i.quantity}</td>
                    <td className="p-2 text-right">{formatINR(i.product.price * i.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between pt-3 border-t border-[#E8DDD6]">
              <span className="text-xs text-[#817567]">Pure Silk Mark Assay Tag Verified</span>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-[#780D24] text-white rounded-lg text-xs font-semibold hover:bg-[#5E091B]"
              >
                Print Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
