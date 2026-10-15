import React, { useState } from 'react';
import { Order } from '../types/index.ts';
import { formatINR } from '../utils/pricing.ts';

interface OrderResultViewProps {
  order: Order | undefined;
  onNavigate: (path: string) => void;
}

export const OrderResultView: React.FC<OrderResultViewProps> = ({ order, onNavigate }) => {
  const [simState, setSimState] = useState<'success' | 'verifying' | 'extended' | 'failed' | 'cancelled'>(order?.paymentStatus === 'Paid' ? 'success' : order?.paymentStatus === 'Failed' ? 'failed' : order?.paymentStatus === 'Refunded' ? 'cancelled' : 'verifying');
  const [itemsOpen, setItemsOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Fallback default order if none passed
  const orderRef = order?.referenceId || '#PS-849204';
  const totalAmount = order ? formatINR(order.totalAmount) : '₹39,800';
  const orderId = order?.id || 'ord-849204';

  const handleSimulateCheck = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setSimState(order?.paymentStatus === 'Paid' ? 'success' : 'verifying');
    }, 1500);
  };

  return (
    <div className="pb-24 bg-[#FBF7F0] min-h-screen">
      {/* Simulation Ribbon */}
      <aside
        aria-label="Order Result Simulator"
        className="bg-[#2A2020] text-white px-4 py-2 text-xs flex items-center justify-between border-b border-[#B88A44]/30"
      >
        <span className="font-sans text-[10px] uppercase tracking-wider text-[#F2BE72] font-semibold">
          Preview State:
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar font-sans text-[11px]">
          <button
            onClick={() => setSimState('success')}
            className={`px-2.5 py-1 rounded ${
              simState === 'success' ? 'bg-[#B88A44] text-[#231919] font-bold' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            ✓ Successful
          </button>
          <button
            onClick={() => setSimState('verifying')}
            className={`px-2.5 py-1 rounded ${
              simState === 'verifying' ? 'bg-[#780D24] text-white font-bold' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            ⟳ Verifying
          </button>
          <button
            onClick={() => setSimState('extended')}
            className={`px-2.5 py-1 rounded ${
              simState === 'extended' ? 'bg-[#780D24] text-white font-bold' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            ⏳ Extended Wait
          </button>
          <button
            onClick={() => setSimState('failed')}
            className={`px-2.5 py-1 rounded ${
              simState === 'failed' ? 'bg-[#BA1A1A] text-white font-bold' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            ✕ Failed
          </button>
          <button
            onClick={() => setSimState('cancelled')}
            className={`px-2.5 py-1 rounded ${
              simState === 'cancelled' ? 'bg-stone-700 text-white font-bold' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            ⊘ Cancelled
          </button>
        </div>
      </aside>

      <main className="max-w-xl mx-auto px-4 py-8">
        {/* State 1: SUCCESSFUL PAYMENT & ORDER CONFIRMED */}
        {simState === 'success' && (
          <div className="bg-white border border-[#E8DDD6] rounded-xl p-5 sm:p-7 shadow-sm space-y-5 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-[#B88A44]"></div>

            <div className="flex flex-col items-center text-center pt-2">
              <div className="w-16 h-16 rounded-full bg-[#1b4332]/10 border-2 border-[#2d6a4f] flex items-center justify-center mb-3 text-[#2d6a4f]">
                <span className="material-symbols-outlined text-[32px] fill">check_circle</span>
              </div>
              <span className="inline-block px-3 py-0.5 font-sans text-[11px] uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-bold mb-2">
                Payment Confirmed
              </span>
              <h1 className="font-serif text-[24px] sm:text-[30px] text-[#231919] font-medium leading-tight">
                Your order is confirmed!
              </h1>
              <p className="font-sans text-[14px] text-[#5F5552] mt-1">
                Thank you for shopping with Parinaya Silks.
              </p>
            </div>

            {/* Quick Metrics Bar */}
            <div className="bg-[#FBF7F0] border border-[#E8DDD6] p-3.5 rounded-lg grid grid-cols-3 gap-2 text-center sm:text-left font-sans">
              <div>
                <span className="block text-[10px] text-[#5F5552] uppercase font-bold tracking-wider">
                  Order ID
                </span>
                <span className="text-[13px] sm:text-[14px] font-bold text-[#231919] block mt-0.5 truncate">
                  {orderRef}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-[#5F5552] uppercase font-bold tracking-wider">
                  Payment
                </span>
                <span className="text-[13px] font-semibold text-emerald-700 block mt-0.5">
                  ● Paid
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-[#5F5552] uppercase font-bold tracking-wider">
                  Amount
                </span>
                <span className="text-[14px] font-bold text-[#780D24] block mt-0.5">
                  {totalAmount}
                </span>
              </div>
            </div>

            {/* Delivery Info */}
            <div className="border border-[#E8DDD6] p-3.5 bg-[#F4EEE5]/50 rounded-lg flex items-center gap-3">
              <span className="material-symbols-outlined text-[#780D24] text-[24px] shrink-0">
                local_shipping
              </span>
              <div>
                <p className="font-sans text-[13px] font-semibold text-[#231919]">
                  Estimated Delivery: Oct 28 – Oct 29, 2025
                </p>
                <p className="font-sans text-[11px] text-[#5F5552]">
                  Track delivery updates in your order details.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => onNavigate(`/account/orders/${orderId}`)}
                className="w-full h-12 bg-[#780D24] hover:bg-[#5E091B] text-white font-sans text-[14px] font-semibold rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <span>View Order</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
              <button
                onClick={() => onNavigate('/shop')}
                className="w-full h-12 bg-white border border-[#E8DDD6] hover:bg-[#F4EEE5] text-[#231919] font-sans text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-all"
              >
                <span className="material-symbols-outlined text-[18px] text-[#B88A44]">
                  storefront
                </span>
                <span>Continue Shopping</span>
              </button>
            </div>

            {/* Accordions */}
            <div className="border-t border-[#E8DDD6] pt-4 space-y-2.5 font-sans">
              {/* Ordered Items Accordion */}
              <div className="border border-[#E8DDD6] rounded-lg overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setItemsOpen(!itemsOpen)}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#F4EEE5] transition-colors"
                >
                  <span className="text-[13px] font-semibold text-[#231919]">
                    Ordered Items ({order?.items.length || 2})
                  </span>
                  <span
                    className={`material-symbols-outlined text-[#5F5552] transition-transform ${
                      itemsOpen ? 'rotate-180' : ''
                    }`}
                  >
                    expand_more
                  </span>
                </button>
                {itemsOpen && (
                  <div className="p-3.5 pt-0 border-t border-[#E8DDD6] space-y-3">
                    {(order?.items || [
                      {
                        productName: 'Mayuri Regal Wine Pure Kanjeevaram Saree',
                        price: 22400,
                        quantity: 1,
                        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAwC_BdBwKdUL7PTiDyjLq_ye91Jn4IsMz_fTMEHdM6WR5_O-nDHbNQ4EjPTFOv-eVoIFNqIppVowx6m3B1aQ4sQWkPZqWsU5fjfW-DdP8dTh9v9CsSJypgXcshKnFHpJzbS8U2OZm2WmEkOx-UidOxefgEnxvNk-SKLGzZsevCcm1wSbC3fDHZAp3idenR6J3L_ri679pu8frtfUBgPyQyTeQw6PYtHa89OFFHB16-lSU7eiEKJic',
                      },
                      {
                        productName: 'Padmavathi Rust Brocade Banarasi Saree',
                        price: 18600,
                        quantity: 1,
                        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCIvv73Udfzcbf_FB7zBkxY9T4WNhuvqCS-eXbJdTUyTEpm_5o7jWiQdGbxsEDrmkxFYRDAfGQ8fb_G597V9Up9uLy0Bt_m8RFsuYbG9jiP4zjZ-rvoUriCo058wE7h-scAXhUZ6QiT53CNRGBjD_3cVGt7NCo0C28NAIlIBYSHW4onF1Yz_rBxhK4-BKKUo01K7XgmnWwd8ZbBbyI2qHXTf9EfZXW09bF18jSCINGPn-AltKEXgE0',
                      },
                    ]).map((it, idx) => (
                      <div key={idx} className="flex items-center gap-3 pt-2">
                        <img
                          src={it.image}
                          alt={it.productName}
                          className="w-12 h-16 object-cover rounded border border-[#E8DDD6]"
                        />
                        <div className="flex-1 text-[13px]">
                          <p className="font-semibold text-[#231919]">{it.productName}</p>
                          <p className="text-[#5F5552] text-[11px]">Qty: {it.quantity}</p>
                          <p className="font-bold text-[#780D24]">{formatINR(it.price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Delivery Address Accordion */}
              <div className="border border-[#E8DDD6] rounded-lg overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setAddressOpen(!addressOpen)}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#F4EEE5] transition-colors"
                >
                  <span className="text-[13px] font-semibold text-[#231919]">Delivery Address</span>
                  <span
                    className={`material-symbols-outlined text-[#5F5552] transition-transform ${
                      addressOpen ? 'rotate-180' : ''
                    }`}
                  >
                    expand_more
                  </span>
                </button>
                {addressOpen && (
                  <div className="p-3.5 pt-0 border-t border-[#E8DDD6] text-[13px] text-[#5F5552] space-y-1">
                    <p className="font-bold text-[#231919]">
                      {order?.shippingAddress.name || 'Ananya Rao'} ({order?.shippingAddress.phone || '+91 98490 12345'})
                    </p>
                    <p>{order?.shippingAddress.line1 || 'Plot 42, Road No. 10, Banjara Hills'}</p>
                    <p>
                      {order?.shippingAddress.city || 'Hyderabad'}, {order?.shippingAddress.state || 'Telangana'} -{' '}
                      {order?.shippingAddress.pincode || '500034'}
                    </p>
                  </div>
                )}
              </div>

              {/* Price Breakdown Accordion */}
              <div className="border border-[#E8DDD6] rounded-lg overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setPriceOpen(!priceOpen)}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#F4EEE5] transition-colors"
                >
                  <span className="text-[13px] font-semibold text-[#231919]">Price Breakdown</span>
                  <span
                    className={`material-symbols-outlined text-[#5F5552] transition-transform ${
                      priceOpen ? 'rotate-180' : ''
                    }`}
                  >
                    expand_more
                  </span>
                </button>
                {priceOpen && (
                  <div className="p-3.5 pt-0 border-t border-[#E8DDD6] text-[13px] text-[#5F5552] space-y-2">
                    <div className="flex justify-between pt-1">
                      <span>Subtotal</span>
                      <span className="font-medium text-[#231919]">₹41,000</span>
                    </div>
                    <div className="flex justify-between text-[#2d6a4f]">
                      <span>Coupon (HEIRLOOM10)</span>
                      <span>-₹1,000</span>
                    </div>
                    <div className="flex justify-between text-[#2d6a4f]">
                      <span>Points Redeemed</span>
                      <span>-₹200</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Insured Delivery</span>
                      <span className="text-emerald-700 font-semibold uppercase text-[11px]">
                        Complimentary (FREE)
                      </span>
                    </div>
                    <div className="pt-2 border-t border-[#E8DDD6] flex justify-between font-bold text-[#231919] text-[15px]">
                      <span>Total Paid</span>
                      <span className="text-[#780D24]">{totalAmount}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Need help row */}
            <div className="pt-2 text-center">
              <a
                href="https://wa.me/918367383073"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#231919] hover:text-[#780D24]"
              >
                <span className="material-symbols-outlined text-[#25D366] text-[18px]">chat</span>
                <span>Need help? Chat on WhatsApp</span>
              </a>
            </div>
          </div>
        )}

        {/* State 2: VERIFYING */}
        {simState === 'verifying' && (
          <div className="bg-white border border-[#E8DDD6] rounded-xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 mx-auto rounded-full border-2 border-[#B88A44]/30 border-t-[#780D24] animate-spin flex items-center justify-center">
              <span className="material-symbols-outlined text-[#780D24] text-[24px]">hourglass_top</span>
            </div>
            <span className="inline-block px-3 py-0.5 text-[11px] font-sans uppercase tracking-wider bg-[#FFDDB1] text-[#291800] font-bold rounded">
              Verification In Progress
            </span>
            <h2 className="font-serif text-[24px] text-[#231919] font-semibold">
              We&apos;re checking your payment
            </h2>
            <p className="font-sans text-[14px] text-[#5F5552] max-w-sm mx-auto">
              Your payment confirmation is taking a moment. Please remain on this screen while we communicate with the banking gateway.
            </p>
            <div className="pt-2">
              <button
                onClick={handleSimulateCheck}
                disabled={isVerifying}
                className="w-full max-w-xs mx-auto h-12 bg-[#780D24] hover:bg-[#5E091B] text-white font-sans text-[14px] font-semibold rounded-lg flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                <span>{isVerifying ? 'Checking with Bank...' : 'Check Payment Status'}</span>
              </button>
            </div>
          </div>
        )}

        {/* State 3: EXTENDED WAIT */}
        {simState === 'extended' && (
          <div className="bg-white border border-[#E8DDD6] rounded-xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#F4EEE5] border border-[#B88A44] flex items-center justify-center text-[#B88A44]">
              <span className="material-symbols-outlined text-[32px]">pending</span>
            </div>
            <span className="inline-block px-3 py-0.5 text-[11px] font-sans uppercase tracking-wider bg-[#F4EEE5] text-[#5F5552] font-bold rounded">
              Verification Taking Longer
            </span>
            <h2 className="font-serif text-[24px] text-[#231919] font-semibold">
              Taking longer than 2 minutes?
            </h2>
            <p className="font-sans text-[14px] text-[#5F5552] max-w-sm mx-auto">
              Reference <strong className="text-[#231919] font-mono">{orderRef}-REF</strong> is safely logged in our system. You will receive an update once the bank clears the authorization.
            </p>
            <div className="pt-2 space-y-2">
              <button
                onClick={handleSimulateCheck}
                className="w-full max-w-xs mx-auto h-12 bg-[#780D24] hover:bg-[#5E091B] text-white font-sans text-[14px] font-semibold rounded-lg flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                <span>Refresh Status Now</span>
              </button>
              <div>
                <button
                  onClick={() => onNavigate('/')}
                  className="text-[13px] text-[#780D24] hover:underline"
                >
                  Return to Home
                </button>
              </div>
            </div>
          </div>
        )}

        {/* State 4: FAILED */}
        {simState === 'failed' && (
          <div className="bg-white border border-red-200 rounded-xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-50 border border-red-300 flex items-center justify-center text-[#BA1A1A]">
              <span className="material-symbols-outlined text-[32px]">error_outline</span>
            </div>
            <span className="inline-block px-3 py-0.5 text-[11px] font-sans uppercase tracking-wider bg-red-100 text-red-900 font-bold rounded">
              Transaction Declined
            </span>
            <h2 className="font-serif text-[24px] text-[#231919] font-semibold">
              Payment couldn&apos;t be completed
            </h2>
            <p className="font-sans text-[14px] text-[#5F5552] max-w-sm mx-auto">
              Your bank was unable to process this payment. Your curated bag items remain safely saved.
            </p>
            <div className="pt-2 space-y-2">
              <button
                onClick={() => onNavigate('/checkout')}
                className="w-full max-w-xs mx-auto h-12 bg-[#780D24] hover:bg-[#5E091B] text-white font-sans text-[14px] font-semibold rounded-lg flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">replay</span>
                <span>Retry Payment</span>
              </button>
              <div>
                <button
                  onClick={() => onNavigate('/bag')}
                  className="text-[13px] text-[#780D24] hover:underline"
                >
                  Return to Bag
                </button>
              </div>
            </div>
          </div>
        )}

        {/* State 5: CANCELLED */}
        {simState === 'cancelled' && (
          <div className="bg-white border border-[#E8DDD6] rounded-xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#F4EEE5] border border-stone-400 flex items-center justify-center text-[#5F5552]">
              <span className="material-symbols-outlined text-[32px]">cancel</span>
            </div>
            <span className="inline-block px-3 py-0.5 text-[11px] font-sans uppercase tracking-wider bg-[#F4EEE5] text-[#5F5552] font-bold rounded">
              Session Cancelled
            </span>
            <h2 className="font-serif text-[24px] text-[#231919] font-semibold">
              Payment wasn&apos;t completed
            </h2>
            <p className="font-sans text-[14px] text-[#5F5552] max-w-sm mx-auto">
              The payment window was closed before completing. You can review your items or choose another payment method.
            </p>
            <div className="pt-2">
              <button
                onClick={() => onNavigate('/checkout')}
                className="w-full max-w-xs mx-auto h-12 bg-[#780D24] hover:bg-[#5E091B] text-white font-sans text-[14px] font-semibold rounded-lg flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">shopping_cart_checkout</span>
                <span>Return to Checkout</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
