import { storeService } from '../services/storeService.ts';
import React, { useState } from 'react';
import { CartItem, Coupon, Customer, Address, Order } from '../types/index.ts';
import type { StoreSettings } from '../types/index.ts';
import { formatINR, calculateOrderTotals } from '../utils/pricing.ts';

interface CheckoutViewProps {
  settings: StoreSettings;
  cart: CartItem[];
  appliedCoupon: Coupon | null;
  pointsToRedeem: number;
  customer: Customer;
  onNavigate: (path: string) => void;
  onCreateOrder: (orderData: any) => Order;
  onClearCart: () => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  settings,
  cart,
  appliedCoupon,
  pointsToRedeem,
  customer,
  onNavigate,
  onCreateOrder,
  onClearCart,
}) => {
  const [orderReviewOpen, setOrderReviewOpen] = useState(false);
  const [fullName, setFullName] = useState(customer.name);
  const [mobile, setMobile] = useState(customer.phone.replace('+91', '').trim());
  const [email, setEmail] = useState(customer.email);
  const [selectedAddressId, setSelectedAddressId] = useState(customer.addresses.find(a => a.isDefault)?.id || customer.addresses[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Card' | 'NetBanking'>('UPI');
  const [whatsappOptIn, setWhatsappOptIn] = useState(customer.whatsappOptIn);

  // New address modal state
  const [newAddressModalOpen, setNewAddressModalOpen] = useState(false);
  const [newAddress, setNewAddress] = useState<Partial<Address>>({
    name: customer.name,
    phone: customer.phone,
    line1: '',
    landmark: '',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500034',
    type: 'HOME',
  });

  // Simulator states
  const [checkoutState, setCheckoutState] = useState<'normal' | 'error' | 'processing'>('normal');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totals = calculateOrderTotals(cart, appliedCoupon, pointsToRedeem, settings.complimentaryShippingThreshold, settings.standardShippingFee, settings.loyaltyPointsRedeemRate, customer.pointsBalance);

  const handleAddNewAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.line1 || !newAddress.pincode) return;

    const address = storeService.addCustomerAddress({
      name: newAddress.name || customer.name,
      phone: newAddress.phone || customer.phone,
      line1: newAddress.line1,
      landmark: newAddress.landmark || '',
      city: newAddress.city || 'Hyderabad',
      state: newAddress.state || 'Telangana',
      pincode: newAddress.pincode,
      type: (newAddress.type as any) || 'HOME',
      isDefault: false,
    });
    setSelectedAddressId(address.id);
    setNewAddressModalOpen(false);
  };

  const handleExecutePayment = () => {
    // Basic form validation
    if (!fullName.trim() || !mobile.trim() || !email.trim()) {
      setCheckoutState('error');
      setErrorMessage('Please complete all contact details before proceeding.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (cart.length === 0) {
      alert('Your shopping bag is empty.');
      onNavigate('/shop');
      return;
    }

    const address = customer.addresses.find(a => a.id === selectedAddressId);
    if (!address || !/^[1-9][0-9]{5}$/.test(address.pincode) || !/^[6-9][0-9]{9}$/.test(mobile.replace(/\s/g, '')) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setCheckoutState('error');
      setErrorMessage('Select an address with a valid India PIN, mobile number and email.');
      return;
    }
    setCheckoutState('processing');

    setTimeout(() => {
      const selectedAddr = storeService.getCustomer().addresses.find(a => a.id === selectedAddressId);
      try {
      const newOrder = onCreateOrder({
        customerName: fullName,
        customerEmail: email,
        customerPhone: '+91 ' + mobile.replace('+91', '').trim(),
        shippingAddress: selectedAddr,
        items: cart.map((i) => ({
          productId: i.productId,
          productName: i.product.name,
          subtitle: i.product.subtitle,
          sku: i.product.sku,
          price: i.product.price,
          quantity: i.quantity,
          image: i.product.images.full,
          category: i.product.category,
          blouseDetails: i.product.blouseDetails,
        })),
        subtotal: totals.subtotal,
        couponCode: appliedCoupon?.code,
        couponDiscount: totals.couponDiscount,
        pointsRedeemed: totals.pointsRedeemed,
        pointsDiscount: totals.pointsDiscount,
        shippingFee: totals.shipping,
        totalAmount: totals.total,
        paymentStatus: 'Paid',
        paymentMethod,
        paymentGatewayRef: `DEMO-${crypto.randomUUID()}`,
        fulfilmentStatus: 'Processing',
      });

      onClearCart();
      setCheckoutState('normal');
      onNavigate(`/order-confirmed?orderId=${newOrder.id}`);
      } catch (error) {
        setCheckoutState('error');
        setErrorMessage(error instanceof Error ? error.message : 'Could not create demo order.');
      }
    }, 2000);
  };

  return (
    <div className="pb-44 md:pb-32 bg-[#FBF7F0] min-h-screen">
      {/* Interactive State Floating Switcher */}
      <aside
        aria-label="Checkout State Switcher"
        className="bg-[#2A2020] text-white px-4 py-2 text-xs flex items-center justify-between border-b border-[#B88A44]/30"
      >
        <span className="font-sans text-[10px] uppercase tracking-wider text-[#F2BE72] font-semibold">
          Preview State:
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCheckoutState('normal');
              setErrorMessage(null);
            }}
            className={`px-2.5 py-1 rounded text-[11px] font-sans ${
              checkoutState === 'normal' ? 'bg-[#780D24] text-white font-bold' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Normal
          </button>
          <button
            onClick={() => {
              setCheckoutState('error');
              setErrorMessage('Please verify your delivery PIN code and ensure all required fields are complete.');
            }}
            className={`px-2.5 py-1 rounded text-[11px] font-sans ${
              checkoutState === 'error' ? 'bg-[#BA1A1A] text-white font-bold' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Error
          </button>
          <button
            onClick={() => setCheckoutState('processing')}
            className={`px-2.5 py-1 rounded text-[11px] font-sans ${
              checkoutState === 'processing' ? 'bg-[#B88A44] text-[#231919] font-bold' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Processing
          </button>
        </div>
      </aside>

      {/* Stepper Progress Bar */}
      <div className="bg-[#5E091B] border-b border-[#881B2E]/40 py-2.5 px-4 text-white">
        <div className="max-w-md mx-auto flex items-center justify-between text-[13px] font-sans">
          {/* Step 1: Bag */}
          <button
            onClick={() => onNavigate('/bag')}
            className="flex items-center gap-1.5 text-[#F2BE72] hover:underline"
          >
            <span className="w-5 h-5 rounded-full bg-[#B88A44] text-[#231919] flex items-center justify-center text-[11px] font-bold">
              ✓
            </span>
            <span>Bag</span>
          </button>
          <div className="flex-1 mx-3 h-[2px] bg-[#B88A44]"></div>
          {/* Step 2: Checkout (Active) */}
          <div className="flex items-center gap-1.5 font-bold text-white">
            <span className="w-5 h-5 rounded-full border-2 border-[#F2BE72] bg-[#780D24] text-[#F2BE72] flex items-center justify-center text-[11px]">
              2
            </span>
            <span>Checkout</span>
          </div>
          <div className="flex-1 mx-3 h-[1px] bg-white/20"></div>
          {/* Step 3: Payment */}
          <div className="flex items-center gap-1.5 text-white/50">
            <span className="w-5 h-5 rounded-full border border-white/30 flex items-center justify-center text-[11px]">
              3
            </span>
            <span>Payment</span>
          </div>
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="bg-[#FFF0F0] border-b border-[#F3B4B4] text-[#BA1A1A] px-4 py-3 text-[13px] font-sans flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="ml-auto text-stone-500 hover:text-stone-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Forms & Selections */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Compact Order Review Accordion */}
            <section className="bg-white rounded-xl border border-[#E8DDD6] overflow-hidden shadow-xs">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setOrderReviewOpen(!orderReviewOpen)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setOrderReviewOpen(!orderReviewOpen);
                  }
                }}
                className="w-full p-4 flex items-center justify-between hover:bg-[#F4EEE5]/50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#B88A44]">inventory_2</span>
                  <div>
                    <h2 className="font-serif text-[16px] text-[#231919] font-medium">Order Review</h2>
                    <p className="font-sans text-[12px] text-[#5F5552]">
                      {cart.length} {cart.length === 1 ? 'Saree' : 'Sarees'} · {formatINR(totals.total)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate('/bag');
                    }}
                    className="text-[#780D24] font-sans text-[12px] font-bold hover:underline"
                  >
                    Edit Bag
                  </button>
                  <span
                    className={`material-symbols-outlined text-[#5F5552] transition-transform duration-200 ${
                      orderReviewOpen ? 'rotate-180' : ''
                    }`}
                  >
                    expand_more
                  </span>
                </div>
              </div>

              {orderReviewOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-[#E8DDD6] space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center justify-between py-2 border-b border-[#F4EEE5] last:border-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-20 rounded bg-[#F4EEE5] overflow-hidden shrink-0 border border-[#E8DDD6]">
                          <img
                            src={item.product.images.full}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <span className="font-sans text-[9px] text-[#B88A44] bg-[#F4EEE5] px-1.5 py-0.5 rounded font-semibold uppercase">
                            {item.product.categoryLabel}
                          </span>
                          <h3 className="font-serif text-[14px] text-[#231919] font-medium mt-0.5">
                            {item.product.name}
                          </h3>
                          <p className="font-sans text-[11px] text-[#5F5552]">
                            Qty: {item.quantity} · {item.selectedColor || item.product.subtitle}
                          </p>
                        </div>
                      </div>
                      <span className="font-sans text-[15px] font-bold text-[#780D24]">
                        {formatINR(item.product.price * item.quantity)}
                      </span>
                    </div>
                  ))}

                  <div className="bg-[#FBF7F0] p-2.5 rounded-lg flex items-center gap-2 text-[12px] font-sans text-[#5F5552] border border-[#B88A44]/30">
                    <span className="material-symbols-outlined text-[#B88A44] text-[16px] fill">
                      verified
                    </span>
                    <span>All pieces carry genuine Silk Mark India tags &amp; Gold Zari assay certificates.</span>
                  </div>
                </div>
              )}
            </section>

            {/* 2. Contact Details Section */}
            <section className="bg-white rounded-xl border border-[#E8DDD6] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8DDD6]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#B88A44]">account_circle</span>
                  <h2 className="font-serif text-[17px] text-[#231919] font-semibold">
                    1. Contact Details
                  </h2>
                </div>
                <span className="font-sans text-[11px] text-[#5F5552] uppercase tracking-wider font-semibold">
                  Step 1 of 3
                </span>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block font-sans text-[11px] uppercase tracking-wider font-bold text-[#231919] mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Receiver's Full Name"
                    className="w-full h-12 px-3.5 bg-white border border-[#E8DDD6] rounded-md font-sans text-[15px] text-[#231919] focus:outline-none focus:border-[#780D24]"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-sans text-[11px] uppercase tracking-wider font-bold text-[#231919] mb-1">
                      Mobile Number *
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 border border-r-0 border-[#E8DDD6] bg-[#F4EEE5] text-[#231919] font-sans text-[14px] font-semibold rounded-l-md select-none">
                        🇮🇳 +91
                      </span>
                      <input
                        type="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                        placeholder="98765 43210"
                        className="w-full h-12 px-3 bg-white border border-[#E8DDD6] rounded-r-md font-sans text-[15px] text-[#231919] focus:outline-none focus:border-[#780D24]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-sans text-[11px] uppercase tracking-wider font-bold text-[#231919] mb-1">
                      Email (Updates &amp; Invoice) *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@domain.com"
                      className="w-full h-12 px-3.5 bg-white border border-[#E8DDD6] rounded-md font-sans text-[15px] text-[#231919] focus:outline-none focus:border-[#780D24]"
                      required
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 3. Delivery Address Section */}
            <section className="bg-white rounded-xl border border-[#E8DDD6] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8DDD6]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#B88A44]">local_shipping</span>
                  <h2 className="font-serif text-[17px] text-[#231919] font-semibold">
                    2. Delivery Address
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setNewAddressModalOpen(true)}
                  className="font-sans text-[11px] font-bold text-[#780D24] uppercase tracking-wider hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Add New</span>
                </button>
              </div>

              {/* Address Cards */}
              <div className="space-y-3">
                {customer.addresses.map((addr, idx) => {
                  const isSelected = selectedAddressId === addr.id;
                  return (
                    <div
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all relative ${
                        isSelected
                          ? 'border-[#B88A44] bg-[#FBF7F0]'
                          : 'border-[#E8DDD6] hover:border-stone-400 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="delivery-addr"
                            checked={isSelected}
                            onChange={() => setSelectedAddressId(addr.id)}
                            className="w-4 h-4 text-[#780D24] focus:ring-[#780D24] accent-[#780D24]"
                          />
                          <span className="font-serif text-[15px] text-[#231919] font-semibold">
                            {addr.type === 'HOME' ? 'Home' : addr.type === 'WORK' ? 'Work' : 'Other'} — {addr.city}
                          </span>
                          {addr.isDefault && (
                            <span className="bg-[#780D24] text-white text-[10px] font-sans px-2 py-0.5 rounded uppercase font-bold">
                              Default
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 ml-6 text-[13px] font-sans text-[#5F5552] space-y-0.5">
                        <p className="text-[#231919] font-medium">
                          {addr.name} · {addr.phone}
                        </p>
                        <p>{addr.line1}</p>
                        {addr.landmark && <p className="text-[#5F5552]">Landmark: {addr.landmark}</p>}
                        <p>
                          {addr.city}, {addr.state} ·{' '}
                          <span className="bg-[#F4EEE5] px-1.5 py-0.5 rounded font-mono font-bold text-[#780D24]">
                            PIN: {addr.pincode}
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Hyderabad Priority Delivery Banner */}
              <div className="bg-[#FBF7F0] border border-[#B88A44]/40 rounded-lg p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#780D24]">electric_bolt</span>
                  <div>
                    <p className="font-sans text-[11px] font-bold uppercase tracking-wider text-[#780D24]">
                      Hyderabad Same-Region Priority
                    </p>
                    <p className="font-sans text-[12px] text-[#231919]">
                      Standard Insured Delivery: <strong className="text-emerald-700 font-bold">FREE</strong>
                    </p>
                  </div>
                </div>
                <span className="bg-white px-2.5 py-1 rounded text-[11px] font-sans font-bold text-[#231919] border border-[#E8DDD6]">
                  Oct 28 – 29
                </span>
              </div>
            </section>

            {/* 4. Payment Section (Strictly Online Only, No COD) */}
            <section className="bg-white rounded-xl border border-[#E8DDD6] p-5 shadow-xs space-y-4">
              <div className="pb-3 border-b border-[#E8DDD6]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#B88A44]">payments</span>
                  <h2 className="font-serif text-[17px] text-[#231919] font-semibold">
                    3. Payment
                  </h2>
                </div>
                <p className="font-sans text-[12px] text-[#5F5552] mt-0.5">
                  Online payments only · Safe &amp; encrypted 256-bit checkout (No Cash on Delivery)
                </p>
              </div>

              <div className="space-y-3">
                {/* UPI Instant Payment */}
                <label
                  className={`flex items-start justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    paymentMethod === 'UPI' ? 'border-[#780D24] bg-[#FBF7F0]' : 'border-[#E8DDD6]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="payment-method"
                      checked={paymentMethod === 'UPI'}
                      onChange={() => setPaymentMethod('UPI')}
                      className="mt-1 w-4 h-4 text-[#780D24] focus:ring-[#780D24] accent-[#780D24]"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-[15px] font-bold text-[#231919]">
                          UPI Instant Payment
                        </span>
                        <span className="bg-[#B88A44]/20 text-[#780D24] text-[10px] font-sans px-1.5 py-0.5 rounded font-bold">
                          FASTEST
                        </span>
                      </div>
                      <p className="font-sans text-[12px] text-[#5F5552] mt-0.5">
                        Google Pay, PhonePe, Paytm, BHIM or any UPI App
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[#780D24] text-[22px]">
                    qr_code_scanner
                  </span>
                </label>

                {/* Credit / Debit Cards */}
                <label
                  className={`flex items-start justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    paymentMethod === 'Card' ? 'border-[#780D24] bg-[#FBF7F0]' : 'border-[#E8DDD6]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="payment-method"
                      checked={paymentMethod === 'Card'}
                      onChange={() => setPaymentMethod('Card')}
                      className="mt-1 w-4 h-4 text-[#780D24] focus:ring-[#780D24] accent-[#780D24]"
                    />
                    <div>
                      <span className="font-serif text-[15px] font-bold text-[#231919]">
                        Credit / Debit Cards
                      </span>
                      <p className="font-sans text-[12px] text-[#5F5552] mt-0.5">
                        Visa, Mastercard, RuPay, American Express
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[#5F5552] text-[22px]">
                    credit_card
                  </span>
                </label>

                {/* Net Banking */}
                <label
                  className={`flex items-start justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    paymentMethod === 'NetBanking' ? 'border-[#780D24] bg-[#FBF7F0]' : 'border-[#E8DDD6]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="payment-method"
                      checked={paymentMethod === 'NetBanking'}
                      onChange={() => setPaymentMethod('NetBanking')}
                      className="mt-1 w-4 h-4 text-[#780D24] focus:ring-[#780D24] accent-[#780D24]"
                    />
                    <div>
                      <span className="font-serif text-[15px] font-bold text-[#231919]">
                        Net Banking
                      </span>
                      <p className="font-sans text-[12px] text-[#5F5552] mt-0.5">
                        All major Indian banks supported (SBI, HDFC, ICICI, etc.)
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[#5F5552] text-[22px]">
                    account_balance
                  </span>
                </label>
              </div>

              <div className="p-3 bg-[#F4EEE5] rounded-lg border border-[#E8DDD6] flex items-center gap-2 text-[12px] font-sans text-[#5F5552]">
                <span className="material-symbols-outlined text-[#B88A44] text-[18px]">lock</span>
                <span>
                  Demo Mode: You will simulate payment authorization with safe virtual clearance.
                </span>
              </div>
            </section>
          </div>

          {/* Right Column: Price Breakdown & Trust Guarantee */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white rounded-xl border border-[#E8DDD6] p-5 shadow-xs sticky top-24 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8DDD6]">
                <h2 className="font-serif text-[17px] text-[#231919] font-medium">Price Breakdown</h2>
                <span className="font-sans text-[12px] text-[#5F5552]">
                  {cart.length} {cart.length === 1 ? 'Item' : 'Items'}
                </span>
              </div>

              <div className="space-y-2.5 font-sans text-[13px] text-[#5F5552]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#231919]">{formatINR(totals.subtotal)}</span>
                </div>

                {totals.couponDiscount > 0 && (
                  <div className="flex justify-between text-[#780D24]">
                    <span>Coupon ({appliedCoupon?.code})</span>
                    <span className="font-bold">-{formatINR(totals.couponDiscount)}</span>
                  </div>
                )}

                {totals.pointsDiscount > 0 && (
                  <div className="flex justify-between text-[#780D24]">
                    <span>Heirloom Loyalty Points</span>
                    <span className="font-bold">-{formatINR(totals.pointsDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Insured Handloom Delivery</span>
                  <span className="font-bold text-[#780D24]">
                    {totals.shipping === 0 ? 'Complimentary (FREE)' : formatINR(totals.shipping)}
                  </span>
                </div>

                <div className="pt-3 border-t-2 border-dashed border-[#E8DDD6] flex justify-between items-baseline">
                  <div>
                    <span className="font-serif text-[17px] text-[#231919] font-bold block">
                      Total Payable
                    </span>
                    <span className="text-[10px] text-[#5F5552]">Inclusive of all GST &amp; duties</span>
                  </div>
                  <span className="font-sans text-[24px] font-bold text-[#780D24]">
                    {formatINR(totals.total)}
                  </span>
                </div>
              </div>

              {/* WhatsApp opt-in */}
              <div className="pt-3 border-t border-[#E8DDD6]">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whatsappOptIn}
                    onChange={(e) => setWhatsappOptIn(e.target.checked)}
                    className="mt-0.5 rounded text-[#780D24] focus:ring-[#780D24] accent-[#780D24]"
                  />
                  <span className="text-[12px] font-sans text-[#5F5552] leading-tight">
                    Keep me informed about exclusive bridal weave drops and private atelier invitations via WhatsApp.
                  </span>
                </label>
              </div>

              {/* Trust Box */}
              <div className="p-3.5 bg-[#FBF7F0] border border-[#B88A44]/40 rounded-lg space-y-1.5 text-center sm:text-left">
                <div className="flex items-center gap-1.5 text-[#780D24] font-bold text-[11px] uppercase tracking-wider font-sans">
                  <span className="material-symbols-outlined text-[#B88A44] text-[16px]">
                    workspace_premium
                  </span>
                  <span>Parinaya Heirloom Guarantee</span>
                </div>
                <p className="text-[12px] font-sans text-[#5F5552] leading-relaxed">
                  100% verified pure silk hallmark. Direct Hyderabad weaver provenance with zero synthetic blends.
                </p>
              </div>

              <div className="text-center pt-1">
                <p className="text-[11px] font-sans text-[#5F5552] space-x-2">
                  <button onClick={() => onNavigate('/policies?tab=returns')} className="hover:underline">
                    Cancellation &amp; Return Policy
                  </button>
                  <span>·</span>
                  <button onClick={() => onNavigate('/policies?tab=privacy')} className="hover:underline">
                    Privacy Policy
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Action Bar */}
      <aside className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0 inset-x-0 z-40 bg-white border-t border-[#E8DDD6] shadow-[0_-4px_16px_rgba(35,25,25,0.08)]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="w-[38%] flex flex-col justify-center">
            <span className="text-[10px] text-[#5F5552] uppercase tracking-wider font-sans leading-none">
              Total
            </span>
            <span className="text-[20px] font-bold text-[#780D24] font-sans leading-tight mt-0.5">
              {formatINR(totals.total)}
            </span>
          </div>

          <div className="w-[62%] max-w-sm">
            <button
              onClick={handleExecutePayment}
              disabled={checkoutState === 'processing'}
              className="w-full h-12 bg-[#780D24] hover:bg-[#5E091B] text-white rounded-lg font-sans text-[14px] font-semibold tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">lock</span>
              <span>Simulate payment</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Add New Address Modal */}
      {newAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-[#E8DDD6] shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8DDD6] pb-3">
              <h3 className="font-serif text-[18px] text-[#780D24] font-medium">Add Delivery Address</h3>
              <button onClick={() => setNewAddressModalOpen(false)}>
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleAddNewAddressSubmit} className="space-y-3 font-sans text-[13px]">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#231919] mb-1">
                  Recipient Name *
                </label>
                <input
                  type="text"
                  value={newAddress.name}
                  onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
                  className="w-full h-10 px-3 border border-[#E8DDD6] rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#231919] mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  value={newAddress.phone}
                  onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                  className="w-full h-10 px-3 border border-[#E8DDD6] rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#231919] mb-1">
                  Street Address &amp; House No. *
                </label>
                <input
                  type="text"
                  value={newAddress.line1}
                  onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })}
                  placeholder="Plot 42, Road 10, Banjara Hills"
                  className="w-full h-10 px-3 border border-[#E8DDD6] rounded"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#231919] mb-1">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    value={newAddress.pincode}
                    onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
                    className="w-full h-10 px-3 border border-[#E8DDD6] rounded font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#231919] mb-1">
                    City &amp; State
                  </label>
                  <input
                    type="text"
                    value="Hyderabad, Telangana"
                    readOnly
                    className="w-full h-10 px-3 bg-[#F4EEE5] border border-[#E8DDD6] rounded text-[#5F5552]"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setNewAddressModalOpen(false)}
                  className="px-4 py-2 border border-[#E8DDD6] rounded hover:bg-[#F4EEE5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#780D24] text-white font-semibold rounded hover:bg-[#5E091B]"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gateway Processing Overlay */}
      {checkoutState === 'processing' && (
        <div className="fixed inset-0 z-50 bg-[#231919]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full p-6 rounded-xl border border-[#B88A44] text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#F4EEE5] flex items-center justify-center relative">
              <div className="w-12 h-12 border-4 border-[#780D24] border-t-transparent rounded-full animate-spin"></div>
              <span className="material-symbols-outlined text-[#B88A44] absolute text-[20px]">
                lock
              </span>
            </div>
            <div>
              <h3 className="font-serif text-[18px] text-[#231919] font-semibold">
                Connecting to Secure Gateway
              </h3>
              <p className="font-sans text-[13px] text-[#5F5552] mt-1">
                Please do not refresh or close this window while we encrypt your session.
              </p>
            </div>
            <div className="bg-[#FBF7F0] p-2.5 rounded text-[11px] font-mono text-[#5F5552] border border-[#E8DDD6]">
              Transaction Token: <span className="font-bold text-[#231919]">PRNY-HYD-84920</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
