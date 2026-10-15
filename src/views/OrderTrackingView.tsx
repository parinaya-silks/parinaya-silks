import React, { useState } from 'react';
import { Order, FulfilmentStatus } from '../types/index.ts';
import { formatINR } from '../utils/pricing.ts';

interface OrderTrackingViewProps {
  order: Order | undefined;
  onNavigate: (path: string) => void;
}

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({ order, onNavigate }) => {
  // Prototype simulator state allows previewing all statuses
  const activeState = order?.fulfilmentStatus || 'Unfulfilled';
  const [courierDetailsOpen, setCourierDetailsOpen] = useState(false);
  const [checkpointsOpen, setCheckpointsOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  if (!order) return null;
  const displayOrder = order;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopyToast(`${label} copied to clipboard`);
    setTimeout(() => setCopyToast(null), 2500);
  };

  // State-specific presentation text
  const stateConfig = {
    Unfulfilled: {
      title: 'Order Confirmed',
      desc: 'Weavers at Hyderabad atelier reviewing yardage requirements',
      step: 1,
      badge: 'Unfulfilled',
    },
    Processing: {
      title: 'Fabric in Pure Zari Assay Inspection',
      desc: 'Master weavers at Hyderabad atelier performing zari assay inspection',
      step: 2,
      badge: 'Processing',
    },
    Packed: {
      title: 'Muslin Packaging Complete',
      desc: 'Packed in bridal keepsake box, awaiting courier handover',
      step: 3,
      badge: 'Packed',
    },
    Shipped: {
      title: 'In Transit',
      desc: 'Blue Dart Express — Departed Hyderabad Sorting Hub',
      step: 4,
      badge: 'Shipped',
    },
    Delivered: {
      title: 'Delivered & Handed Over',
      desc: 'Safely delivered with signature acknowledgment',
      step: 6,
      badge: 'Delivered',
    },
    Cancelled: {
      title: 'Order Cancelled & Refund Initiated',
      desc: 'Refund is being credited back to your original payment method',
      step: 1,
      badge: 'Cancelled',
    },
  };

  const currentStateMeta = { ...stateConfig[activeState], title: activeState, desc: `Recorded fulfilment status: ${activeState}` };

  return (
    <div className="pb-28 bg-[#FBF7F0] min-h-screen">
      {/* Toast Alert */}
      {copyToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#231919] text-white px-4 py-2 rounded-lg shadow-xl text-[13px] font-sans border border-[#B88A44]/40">
          {copyToast}
        </div>
      )}



      {/* Subheader: Order Details title + actions */}
      <div className="bg-white border-b border-[#E8DDD6] px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('/account')}
              className="text-[#5F5552] hover:text-[#780D24] flex items-center"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <h1 className="font-serif text-[18px] sm:text-[20px] text-[#231919] font-medium">
              Order Details
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(window.location.href, 'Invoice URL')}
              className="p-1.5 border border-[#E8DDD6] rounded hover:bg-[#F4EEE5] text-[#231919]"
              title="Print Invoice"
            >
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            </button>
            <button
              onClick={() => handleCopy(window.location.href, 'Order link')}
              className="p-1.5 border border-[#E8DDD6] rounded hover:bg-[#F4EEE5] text-[#231919]"
              title="Share Order"
            >
              <span className="material-symbols-outlined text-[18px]">share</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-xl mx-auto px-4 py-5 space-y-4">
        {/* 1. Order Summary Card */}
        <section className="bg-white border border-[#E8DDD6] rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-sans text-[10px] text-[#5F5552] uppercase font-bold tracking-wider">
                Order Reference
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-serif text-[20px] font-bold text-[#231919]">
                  {displayOrder.referenceId}
                </span>
                <button
                  onClick={() => handleCopy(displayOrder.referenceId, 'Order Reference')}
                  className="text-[#5F5552] hover:text-[#780D24]"
                  title="Copy reference"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                </button>
              </div>
              <p className="font-sans text-[12px] text-[#5F5552] mt-0.5">
                {displayOrder.createdAt}
              </p>
            </div>
            <div className="text-right">
              <span className="font-sans text-[10px] text-[#5F5552] uppercase font-bold tracking-wider">
                Total Amount
              </span>
              <span className="font-sans text-[22px] font-bold text-[#231919] block mt-0.5">
                {formatINR(displayOrder.totalAmount)}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#F4EEE5] flex items-center gap-2 flex-wrap text-[11px] font-sans">
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              <span>Paid · HDFC UPI</span>
            </span>
            <span
              className={`px-3 py-1 rounded-full text-white font-bold ${
                activeState === 'Shipped'
                  ? 'bg-[#780D24]'
                  : activeState === 'Delivered'
                  ? 'bg-emerald-700'
                  : 'bg-[#B88A44]'
              }`}
            >
              ● {currentStateMeta.badge}
            </span>
          </div>
        </section>

        {/* 2. Live Shipment Status Card */}
        <section className="bg-white border border-[#E8DDD6] rounded-xl p-5 shadow-xs space-y-3.5 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-[#780D24]" />

          <div className="flex items-start justify-between">
            <div>
              <span className="font-sans text-[10px] uppercase tracking-wider text-[#B88A44] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B88A44]" />
                Live Shipment Status
              </span>
              <h2 className="font-serif text-[22px] text-[#231919] font-medium leading-tight mt-1">
                {currentStateMeta.title}
              </h2>
              <p className="font-sans text-[13px] text-[#5F5552]">
                {displayOrder.courierPartner || 'Not assigned'}
              </p>
            </div>
            <div className="w-11 h-11 rounded-full bg-[#F4EEE5] border border-[#B88A44]/40 flex items-center justify-center text-[#780D24]">
              <span className="material-symbols-outlined text-[24px]">local_shipping</span>
            </div>
          </div>

          <div className="p-3 bg-[#FBF7F0] rounded-lg border border-[#E8DDD6] flex items-center justify-between text-[13px] font-sans">
            <div>
              <span className="text-[10px] text-[#5F5552] uppercase font-bold tracking-wider block">
                Estimated Arrival
              </span>
              <span className="font-serif text-[15px] font-bold text-[#780D24] block mt-0.5">
                {displayOrder.estimatedDelivery}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#5F5552] uppercase font-bold tracking-wider block">
                Dispatch Point
              </span>
              <span className="text-[13px] font-medium text-[#231919] block mt-0.5">
                Hyderabad Atelier
              </span>
            </div>
          </div>

          <div className="text-[13px] font-sans text-[#231919] flex items-start gap-2">
            <span className="material-symbols-outlined text-[#780D24] text-[18px] shrink-0 mt-0.5">
              alt_route
            </span>
            <div>
              <p className="font-semibold">{displayOrder.latestStatusNote}</p>
              <p className="text-[11px] text-[#5F5552] mt-0.5">{displayOrder.latestStatusTime}</p>
            </div>
          </div>

          <button
            disabled={!displayOrder.trackingUrl || !/^https?:\/\//i.test(displayOrder.trackingUrl)}
            onClick={() => window.open(displayOrder.trackingUrl, '_blank', 'noopener,noreferrer')}
            className="w-full h-11 bg-[#780D24] hover:bg-[#5E091B] text-white font-sans text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            <span>Track Shipment</span>
          </button>

          {/* Expandable Courier Details */}
          <div className="border-t border-[#F4EEE5] pt-2">
            <button
              onClick={() => setCourierDetailsOpen(!courierDetailsOpen)}
              className="w-full flex items-center justify-between text-[12px] font-sans text-[#231919] hover:text-[#780D24] py-1"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <span className="material-symbols-outlined text-[16px] text-[#780D24]">
                  airport_shuttle
                </span>
                <span>Courier Details</span>
              </span>
              <span
                className={`material-symbols-outlined text-[16px] transition-transform ${
                  courierDetailsOpen ? 'rotate-180' : ''
                }`}
              >
                expand_more
              </span>
            </button>
            {courierDetailsOpen && (
              <div className="p-3 mt-1 bg-[#F4EEE5] rounded-lg text-[12px] font-sans space-y-2 text-[#5F5552]">
                <div className="flex justify-between">
                  <span>Courier Partner:</span>
                  <span className="font-bold text-[#231919]">{displayOrder.courierPartner}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Tracking Number (AWB):</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-[#780D24]">
                    <span>{displayOrder.trackingNumber}</span>
                    <button
                      onClick={() => handleCopy(displayOrder.trackingNumber || '', 'AWB')}
                      className="text-[#5F5552] hover:text-[#231919]"
                    >
                      <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 3. Tracking Timeline */}
        <section className="bg-white border border-[#E8DDD6] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8DDD6]">
            <h3 className="font-serif text-[16px] text-[#231919] font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[#780D24]">timeline</span>
              Tracking Timeline
            </h3>
            <span className="font-sans text-[11px] text-[#5F5552] bg-[#F4EEE5] px-2 py-0.5 rounded font-semibold">
              6 Milestones
            </span>
          </div>

          <div className="relative pl-6 space-y-5 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-3 before:w-[2px] before:bg-[#E8DDD6] font-sans">
            {displayOrder.timeline.map((step) => {
              return (
                <div key={step.step} className="relative">
                  <div
                    className={`absolute -left-[23px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 ${
                      step.completed
                        ? 'bg-[#780D24] text-white border-white'
                        : 'bg-[#F4EEE5] border-[#E8DDD6]'
                    }`}
                  >
                    {step.completed ? (
                      <span className="material-symbols-outlined text-[12px]">check</span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5F5552]" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between">
                      <h4
                        className={`text-[13px] ${
                          step.completed ? 'font-bold text-[#231919]' : 'text-[#5F5552]'
                        }`}
                      >
                        {step.title}
                      </h4>
                      <span className="text-[11px] text-[#5F5552]">{step.timestamp}</span>
                    </div>
                    <p className="text-[12px] text-[#5F5552] mt-0.5">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expandable Courier Events */}
          <div className="pt-2 border-t border-[#F4EEE5] text-center">
            <button
              onClick={() => setCheckpointsOpen(!checkpointsOpen)}
              className="text-[#780D24] font-sans text-[12px] font-semibold hover:underline inline-flex items-center gap-1"
            >
              <span>{checkpointsOpen ? 'Hide Checkpoints' : 'View Courier Events / Checkpoints'}</span>
              <span
                className={`material-symbols-outlined text-[16px] transition-transform ${
                  checkpointsOpen ? 'rotate-180' : ''
                }`}
              >
                expand_more
              </span>
            </button>
            {checkpointsOpen && (
              <div className="p-3 mt-2 bg-[#FBF7F0] border border-[#E8DDD6] rounded-lg text-left text-[12px] font-sans space-y-1.5 text-[#5F5552]">
                {displayOrder.courierLogs?.map((log, i) => (
                  <div key={i} className="flex justify-between">
                    <span>• {log.event}</span>
                    <span className="text-[11px] text-[#5F5552]">{log.timestamp}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 4. Ordered Items */}
        <section className="bg-white border border-[#E8DDD6] rounded-xl p-5 shadow-xs space-y-3 font-sans">
          <h3 className="font-serif text-[16px] text-[#231919] pb-2 border-b border-[#E8DDD6] font-medium">
            Ordered Items ({displayOrder.items.length} {displayOrder.items.length === 1 ? 'Saree' : 'Sarees'})
          </h3>

          <div className="divide-y divide-[#F4EEE5]">
            {displayOrder.items.map((it) => (
              <div key={it.productId} className="py-3 flex gap-3.5 items-start">
                <div className="w-[72px] h-[96px] rounded overflow-hidden bg-[#F4EEE5] shrink-0 border border-[#E8DDD6]">
                  <img src={it.image} alt={it.productName} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex flex-col justify-between h-[96px]">
                  <div>
                    <h4 className="font-serif text-[15px] font-medium text-[#231919] leading-snug line-clamp-2">
                      {it.productName}
                    </h4>
                    <p className="text-[11px] text-[#5F5552] mt-0.5">{it.subtitle}</p>
                    {it.blouseDetails && (
                      <p className="text-[11px] text-[#5F5552] truncate">{it.blouseDetails}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] bg-[#F4EEE5] px-2 py-0.5 rounded text-[#231919] font-medium">
                      Qty: {it.quantity}
                    </span>
                    <span className="font-sans text-[16px] font-bold text-[#231919]">
                      {formatINR(it.price * it.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Detail Accordions */}
        <section className="bg-white border border-[#E8DDD6] rounded-xl divide-y divide-[#E8DDD6] shadow-xs overflow-hidden font-sans">
          {/* Delivery Address */}
          <div>
            <button
              onClick={() => setAddressOpen(!addressOpen)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F4EEE5] transition-colors"
            >
              <span className="font-serif text-[15px] font-semibold text-[#231919] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#780D24]">home_pin</span>
                Delivery Address
              </span>
              <span
                className={`material-symbols-outlined text-[#5F5552] transition-transform ${
                  addressOpen ? 'rotate-180' : ''
                }`}
              >
                expand_more
              </span>
            </button>
            {addressOpen && (
              <div className="p-4 pt-0 text-[13px] text-[#5F5552] space-y-1">
                <p className="font-bold text-[#231919]">
                  {displayOrder.shippingAddress.name} ({displayOrder.shippingAddress.phone})
                </p>
                <p>{displayOrder.shippingAddress.line1}</p>
                {displayOrder.shippingAddress.landmark && (
                  <p>Landmark: {displayOrder.shippingAddress.landmark}</p>
                )}
                <p>
                  {displayOrder.shippingAddress.city}, {displayOrder.shippingAddress.state} —{' '}
                  {displayOrder.shippingAddress.pincode}
                </p>
              </div>
            )}
          </div>

          {/* Price Breakdown */}
          <div>
            <button
              onClick={() => setPriceOpen(!priceOpen)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F4EEE5] transition-colors"
            >
              <span className="font-serif text-[15px] font-semibold text-[#231919] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#780D24]">payments</span>
                Price Breakdown
              </span>
              <span
                className={`material-symbols-outlined text-[#5F5552] transition-transform ${
                  priceOpen ? 'rotate-180' : ''
                }`}
              >
                expand_more
              </span>
            </button>
            {priceOpen && (
              <div className="p-4 pt-0 text-[13px] text-[#5F5552] space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium text-[#231919]">{formatINR(displayOrder.subtotal)}</span>
                </div>
                {displayOrder.couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-800">
                    <span>Coupon Discount ({displayOrder.couponCode})</span>
                    <span>-{formatINR(displayOrder.couponDiscount)}</span>
                  </div>
                )}
                {displayOrder.pointsDiscount > 0 && (
                  <div className="flex justify-between text-emerald-800">
                    <span>Points Redeemed</span>
                    <span>-{formatINR(displayOrder.pointsDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Insured Handloom Delivery</span>
                  <span className="text-[#780D24] font-semibold text-[11px] uppercase">
                    Complimentary (FREE)
                  </span>
                </div>
                <div className="pt-2 border-t border-[#E8DDD6] flex justify-between font-bold text-[#231919] text-[15px]">
                  <span>Total Paid</span>
                  <span className="text-[#780D24]">{formatINR(displayOrder.totalAmount)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Payment Details */}
          <div>
            <button
              onClick={() => setPaymentOpen(!paymentOpen)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F4EEE5] transition-colors"
            >
              <span className="font-serif text-[15px] font-semibold text-[#231919] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#780D24]">
                  account_balance_wallet
                </span>
                Payment Details
              </span>
              <span
                className={`material-symbols-outlined text-[#5F5552] transition-transform ${
                  paymentOpen ? 'rotate-180' : ''
                }`}
              >
                expand_more
              </span>
            </button>
            {paymentOpen && (
              <div className="p-4 pt-0 text-[13px] text-[#5F5552] space-y-2">
                <div className="flex justify-between">
                  <span>Method:</span>
                  <span className="font-medium text-[#231919]">
                    {displayOrder.paymentMethod} Payment
                  </span>
                </div>
                {displayOrder.paymentGatewayRef && (
                  <div className="flex justify-between">
                    <span>Transaction Reference:</span>
                    <span className="font-mono text-[#231919]">{displayOrder.paymentGatewayRef}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">verified_user</span>
                    Captured &amp; Authorized
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 6. Support & Store Policies */}
        <section className="bg-white border border-[#E8DDD6] rounded-xl p-5 shadow-xs text-center space-y-3 font-sans">
          <p className="font-serif text-[16px] text-[#231919] font-medium">
            Need help with this order?
          </p>
          <a
            href={`https://wa.me/918367383073?text=${encodeURIComponent(
              `Hi Parinaya Silks, I need assistance with Order ${displayOrder.referenceId}.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-11 border border-[#780D24] text-[#780D24] hover:bg-[#780D24] hover:text-white font-sans text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-all"
          >
            <span className="material-symbols-outlined text-[#25D366] text-[20px]">chat</span>
            <span>Chat on WhatsApp</span>
          </a>
          <div>
            <button
              onClick={() => onNavigate('/policies')}
              className="text-[12px] text-[#5F5552] hover:text-[#780D24] underline"
            >
              View Store Policies
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};
