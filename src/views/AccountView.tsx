import React, { useState } from 'react';
import { Customer, Order, Address } from '../types/index.ts';
import { formatINR } from '../utils/pricing.ts';

interface AccountViewProps {
  customer: Customer;
  orders: Order[];
  onNavigate: (path: string) => void;
  onUpdateProfile: (updates: Partial<Customer>) => void;
  onAddAddress: (address: Omit<Address, 'id'>) => void;
  onRemoveAddress: (addressId: string) => void;
}

export const AccountView: React.FC<AccountViewProps> = ({
  customer,
  orders,
  onNavigate,
  onUpdateProfile,
  onAddAddress,
  onRemoveAddress,
}) => {
  const [subView, setSubView] = useState<'overview' | 'orders' | 'profile' | 'addresses' | 'loyalty' | 'empty' | 'signedout'>('overview');
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');
  const [orderSearch, setOrderSearch] = useState('');

  // Profile edit form state
  const [editName, setEditName] = useState(customer.name);
  const [editEmail, setEditEmail] = useState(customer.email);
  const [editPhone, setEditPhone] = useState(customer.phone.replace('+91', '').trim());
  const [editWhatsapp, setEditWhatsapp] = useState(customer.whatsappOptIn);
  const [saveToast, setSaveToast] = useState(false);

  // New address form state
  const [newAddrOpen, setNewAddrOpen] = useState(false);
  const [newAddrName, setNewAddrName] = useState(customer.name);
  const [newAddrPhone, setNewAddrPhone] = useState(customer.phone);
  const [newAddrLine1, setNewAddrLine1] = useState('');
  const [newAddrPincode, setNewAddrPincode] = useState('500034');
  const [newAddrType, setNewAddrType] = useState<'HOME' | 'WORK' | 'OTHER'>('HOME');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      name: editName,
      email: editEmail,
      phone: '+91 ' + editPhone,
      whatsappOptIn: editWhatsapp,
    });
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const handleSaveNewAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrLine1.trim()) return;
    onAddAddress({
      name: newAddrName,
      phone: newAddrPhone,
      line1: newAddrLine1,
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: newAddrPincode,
      type: newAddrType,
      isDefault: false,
    });
    setNewAddrOpen(false);
    setNewAddrLine1('');
  };

  const filteredOrders = orders.filter((o) => {
    if (orderFilter === 'active') {
      return o.fulfilmentStatus === 'Processing' || o.fulfilmentStatus === 'Packed' || o.fulfilmentStatus === 'Shipped';
    }
    if (orderFilter === 'delivered') return o.fulfilmentStatus === 'Delivered';
    if (orderFilter === 'cancelled') return o.fulfilmentStatus === 'Cancelled';
    return true;
  }).filter((o) => {
    if (!orderSearch.trim()) return true;
    const q = orderSearch.toLowerCase();
    return o.referenceId.toLowerCase().includes(q) || o.items.some((i) => i.productName.toLowerCase().includes(q));
  });

  const activeOrdersCount = orders.filter(
    (o) => o.fulfilmentStatus === 'Processing' || o.fulfilmentStatus === 'Packed' || o.fulfilmentStatus === 'Shipped'
  ).length;

  return (
    <div className="pb-28 max-w-4xl mx-auto px-4 py-4 space-y-5">
      {/* Simulation Ribbon Bar */}
      <aside
        aria-label="Account Simulator Switcher"
        className="bg-[#2A2020] text-white px-3 py-1.5 rounded-lg text-xs flex items-center justify-between border border-[#B88A44]/30"
      >
        <span className="font-sans text-[10px] uppercase tracking-wider text-[#F2BE72] font-semibold">
          Demo State:
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar font-sans text-[11px]">
          <button
            onClick={() => setSubView('overview')}
            className={`px-2.5 py-1 rounded transition-all ${
              subView === 'overview' ? 'bg-[#780D24] text-white font-bold' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setSubView('orders')}
            className={`px-2.5 py-1 rounded transition-all ${
              subView === 'orders' ? 'bg-[#780D24] text-white font-bold' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            My Orders
          </button>
          <button
            onClick={() => setSubView('profile')}
            className={`px-2.5 py-1 rounded transition-all ${
              subView === 'profile' ? 'bg-[#780D24] text-white font-bold' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Edit Profile
          </button>
          <button
            onClick={() => setSubView('addresses')}
            className={`px-2.5 py-1 rounded transition-all ${
              subView === 'addresses' ? 'bg-[#780D24] text-white font-bold' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Saved Addresses
          </button>
          <button
            onClick={() => setSubView('loyalty')}
            className={`px-2.5 py-1 rounded transition-all ${
              subView === 'loyalty' ? 'bg-[#780D24] text-white font-bold' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Loyalty Points
          </button>
          <button
            onClick={() => setSubView('empty')}
            className={`px-2.5 py-1 rounded transition-all ${
              subView === 'empty' ? 'bg-[#780D24] text-white font-bold' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Empty States
          </button>
          <button
            onClick={() => setSubView('signedout')}
            className={`px-2.5 py-1 rounded transition-all ${
              subView === 'signedout' ? 'bg-[#780D24] text-white font-bold' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Signed Out
          </button>
        </div>
      </aside>

      {/* 1. OVERVIEW VIEW */}
      {subView === 'overview' && (
        <div className="space-y-4">
          <div className="border-b border-[#E8DDD6] pb-3">
            <h1 className="font-serif text-[24px] sm:text-[28px] text-[#231919] font-medium">
              My Account
            </h1>
            <p className="font-sans text-[13px] text-[#5F5552] mt-0.5">
              Manage your orders, addresses and rewards.
            </p>
          </div>

          {/* Profile Summary Card */}
          <div className="bg-white border border-[#E8DDD6] rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#780D24] text-white font-serif text-[20px] font-bold flex items-center justify-center border-2 border-[#B88A44] shadow-sm shrink-0">
                AR
              </div>
              <div>
                <h2 className="font-serif text-[18px] text-[#231919] font-medium">
                  Namaste, {customer.name}
                </h2>
                <p className="font-sans text-[13px] text-[#5F5552] flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[15px]">mail</span>
                  {customer.email}
                </p>
                <p className="font-sans text-[13px] text-[#5F5552] flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[15px]">phone</span>
                  {customer.phone}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSubView('profile')}
              className="px-4 py-2 border border-[#780D24] text-[#780D24] hover:bg-[#780D24] hover:text-white font-sans text-[12px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-center"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              <span>Edit Profile</span>
            </button>
          </div>

          {/* Navigation Links List */}
          <div className="bg-white border border-[#E8DDD6] rounded-xl divide-y divide-[#E8DDD6] shadow-xs overflow-hidden">
            {/* My Orders */}
            <button
              onClick={() => setSubView('orders')}
              className="w-full p-4 flex items-center justify-between hover:bg-[#F4EEE5] transition-colors text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-[#F4EEE5] border border-[#E8DDD6] flex items-center justify-center text-[#780D24]">
                  <span className="material-symbols-outlined text-[22px]">inventory_2</span>
                </div>
                <div>
                  <h3 className="font-serif text-[15px] font-semibold text-[#231919]">My Orders</h3>
                  <p className="font-sans text-[12px] text-[#5F5552]">Track your purchases and view history</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-[#780D24] text-white text-[11px] font-sans font-bold px-2.5 py-0.5 rounded-full">
                  {activeOrdersCount} Active
                </span>
                <span className="material-symbols-outlined text-[#5F5552]">chevron_right</span>
              </div>
            </button>

            {/* Saved Addresses */}
            <button
              onClick={() => setSubView('addresses')}
              className="w-full p-4 flex items-center justify-between hover:bg-[#F4EEE5] transition-colors text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-[#F4EEE5] border border-[#E8DDD6] flex items-center justify-center text-[#780D24]">
                  <span className="material-symbols-outlined text-[22px]">location_on</span>
                </div>
                <div>
                  <h3 className="font-serif text-[15px] font-semibold text-[#231919]">Saved Addresses</h3>
                  <p className="font-sans text-[12px] text-[#5F5552]">Manage delivery addresses for checkout</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-[#F4EEE5] text-[#231919] text-[11px] font-sans font-semibold px-2.5 py-0.5 rounded-full">
                  {customer.addresses.length} Saved
                </span>
                <span className="material-symbols-outlined text-[#5F5552]">chevron_right</span>
              </div>
            </button>

            {/* Loyalty Points */}
            <button
              onClick={() => setSubView('loyalty')}
              className="w-full p-4 flex items-center justify-between hover:bg-[#F4EEE5] transition-colors text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-[#B88A44]/10 border border-[#B88A44]/40 flex items-center justify-center text-[#B88A44]">
                  <span className="material-symbols-outlined text-[22px]">stars</span>
                </div>
                <div>
                  <h3 className="font-serif text-[15px] font-semibold text-[#231919]">Loyalty Points</h3>
                  <p className="font-sans text-[12px] text-[#5F5552]">Silk Club rewards &amp; privileges</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-[#B88A44] text-white text-[11px] font-sans font-bold px-2.5 py-0.5 rounded">
                  {customer.pointsBalance} Pts
                </span>
                <span className="material-symbols-outlined text-[#5F5552]">chevron_right</span>
              </div>
            </button>

            {/* Help & Policies */}
            <button
              onClick={() => onNavigate('/policies')}
              className="w-full p-4 flex items-center justify-between hover:bg-[#F4EEE5] transition-colors text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-[#F4EEE5] border border-[#E8DDD6] flex items-center justify-center text-[#780D24]">
                  <span className="material-symbols-outlined text-[22px]">support_agent</span>
                </div>
                <div>
                  <h3 className="font-serif text-[15px] font-semibold text-[#231919]">Help &amp; Policies</h3>
                  <p className="font-sans text-[12px] text-[#5F5552]">WhatsApp concierge, shipping &amp; terms</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#5F5552]">chevron_right</span>
            </button>


          </div>
        </div>
      )}

      {/* 2. MY ORDERS VIEW */}
      {subView === 'orders' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8DDD6] pb-3">
            <div>
              <button
                onClick={() => setSubView('overview')}
                className="text-[12px] font-sans font-bold text-[#780D24] uppercase tracking-wider flex items-center gap-1 hover:underline mb-1"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Back to Account</span>
              </button>
              <h1 className="font-serif text-[22px] sm:text-[26px] text-[#231919] font-medium">
                My Orders
              </h1>
            </div>
            <span className="font-sans text-[13px] text-[#5F5552]">
              {orders.length} orders placed
            </span>
          </div>

          {/* Search & Filter pills */}
          <div className="space-y-2.5">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5F5552] text-[18px]">
                search
              </span>
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search by Order ID or saree name..."
                className="w-full h-11 pl-9 pr-3 bg-white border border-[#E8DDD6] rounded-lg font-sans text-[14px] text-[#231919] focus:outline-none focus:border-[#780D24]"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar font-sans text-[12px]">
              {(['all', 'active', 'delivered', 'cancelled'] as const).map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setOrderFilter(filterKey)}
                  className={`px-3.5 py-1.5 rounded-full font-semibold uppercase tracking-wider transition-all ${
                    orderFilter === filterKey
                      ? 'bg-[#780D24] text-white'
                      : 'bg-white border border-[#E8DDD6] text-[#231919] hover:border-[#B88A44]'
                  }`}
                >
                  {filterKey.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Orders List */}
          <div className="space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#E8DDD6] p-8 text-center space-y-2">
                <span className="material-symbols-outlined text-[28px] text-[#5F5552]">
                  inventory_2
                </span>
                <p className="font-serif text-[16px] text-[#231919]">No matching orders found</p>
                <p className="font-sans text-[12px] text-[#5F5552]">
                  Try adjusting your search query or status filter.
                </p>
              </div>
            ) : (
              filteredOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white border border-[#E8DDD6] rounded-xl p-4 shadow-xs space-y-3 hover:border-[#B88A44] transition-colors"
                >
                  <div className="flex items-center justify-between border-b border-[#F4EEE5] pb-2 text-[13px] font-sans">
                    <div>
                      <span className="font-bold text-[#231919] font-mono">{ord.referenceId}</span>
                      <span className="text-[#5F5552] ml-2 text-[12px]">{ord.createdAt}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#B88A44]/20 text-[#780D24]">
                        {ord.paymentStatus}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold text-white ${
                          ord.fulfilmentStatus === 'Shipped'
                            ? 'bg-[#780D24]'
                            : ord.fulfilmentStatus === 'Delivered'
                            ? 'bg-emerald-700'
                            : ord.fulfilmentStatus === 'Cancelled'
                            ? 'bg-stone-600'
                            : 'bg-[#B88A44]'
                        }`}
                      >
                        {ord.fulfilmentStatus}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-16 rounded overflow-hidden shrink-0 border border-[#E8DDD6] bg-[#F4EEE5]">
                        <img
                          src={ord.items[0]?.image}
                          alt={ord.items[0]?.productName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 font-sans">
                        <h4 className="font-serif text-[15px] text-[#231919] leading-snug truncate font-medium">
                          {ord.items[0]?.productName}
                        </h4>
                        <p className="text-[12px] text-[#5F5552] truncate">
                          {ord.items.length > 1
                            ? `+ ${ord.items.length - 1} more saree (${ord.items.length} items total)`
                            : ord.items[0]?.subtitle}
                        </p>
                        {ord.estimatedDelivery && (
                          <p className="text-[12px] text-[#780D24] font-medium flex items-center mt-0.5">
                            <span className="material-symbols-outlined text-[14px] mr-1">
                              local_shipping
                            </span>
                            Est: {ord.estimatedDelivery}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-sans text-[17px] font-bold text-[#231919]">
                        {formatINR(ord.totalAmount)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end border-t border-[#F4EEE5]">
                    <button
                      onClick={() => onNavigate(`/account/orders/${ord.id}`)}
                      className="px-4 py-1.5 bg-[#780D24] hover:bg-[#5E091B] text-white font-sans text-[12px] font-bold uppercase tracking-wider rounded flex items-center gap-1 transition-colors"
                    >
                      <span>View Order</span>
                      <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. EDIT PROFILE VIEW */}
      {subView === 'profile' && (
        <div className="space-y-4">
          <div className="border-b border-[#E8DDD6] pb-3">
            <button
              onClick={() => setSubView('overview')}
              className="text-[12px] font-sans font-bold text-[#780D24] uppercase tracking-wider flex items-center gap-1 hover:underline mb-1"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Back to Account</span>
            </button>
            <h1 className="font-serif text-[22px] sm:text-[26px] text-[#231919] font-medium">
              Edit Profile
            </h1>
          </div>

          {saveToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg flex items-center gap-2 text-[13px] font-sans">
              <span className="material-symbols-outlined text-emerald-700">check_circle</span>
              <span>Profile updated successfully.</span>
            </div>
          )}

          <div className="bg-white border border-[#E8DDD6] rounded-xl p-5 sm:p-6 shadow-xs">
            <form onSubmit={handleSaveProfile} className="space-y-4 font-sans">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#231919] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-11 px-3.5 bg-white border border-[#E8DDD6] rounded-md text-[15px] focus:outline-none focus:border-[#780D24]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#231919] mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full h-11 px-3.5 bg-white border border-[#E8DDD6] rounded-md text-[15px] focus:outline-none focus:border-[#780D24]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#231919] mb-1">
                  Mobile Number *
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 border-[#E8DDD6] bg-[#F4EEE5] text-[#231919] text-[14px] font-bold rounded-l-md select-none">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                    className="w-full h-11 px-3.5 bg-white border border-[#E8DDD6] rounded-r-md text-[15px] focus:outline-none focus:border-[#780D24]"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#F4EEE5]">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editWhatsapp}
                    onChange={(e) => setEditWhatsapp(e.target.checked)}
                    className="mt-0.5 rounded text-[#780D24] focus:ring-[#780D24] accent-[#780D24]"
                  />
                  <span className="text-[13px] text-[#5F5552]">
                    Send me offers, dispatch updates and new arrivals on WhatsApp.
                  </span>
                </label>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#780D24] hover:bg-[#5E091B] text-white text-[13px] font-bold uppercase tracking-wider rounded-lg shadow-sm"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setSubView('overview')}
                  className="px-6 py-2.5 border border-[#E8DDD6] text-[#231919] text-[13px] font-medium rounded-lg hover:bg-[#F4EEE5]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. SAVED ADDRESSES VIEW */}
      {subView === 'addresses' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8DDD6] pb-3">
            <div>
              <button
                onClick={() => setSubView('overview')}
                className="text-[12px] font-sans font-bold text-[#780D24] uppercase tracking-wider flex items-center gap-1 hover:underline mb-1"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Back to Account</span>
              </button>
              <h1 className="font-serif text-[22px] sm:text-[26px] text-[#231919] font-medium">
                Saved Addresses
              </h1>
            </div>
            <button
              onClick={() => setNewAddrOpen(true)}
              className="px-4 py-2 bg-[#780D24] text-white font-sans text-[12px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 hover:bg-[#5E091B] self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Add New Address</span>
            </button>
          </div>

          {/* New address inline form */}
          {newAddrOpen && (
            <div className="bg-white border-2 border-[#B88A44] rounded-xl p-5 shadow-md space-y-4 font-sans">
              <div className="flex items-center justify-between border-b border-[#E8DDD6] pb-2">
                <h3 className="font-serif text-[17px] text-[#780D24] font-semibold">
                  Add New Delivery Residence
                </h3>
                <button onClick={() => setNewAddrOpen(false)}>
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <form onSubmit={handleSaveNewAddress} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
                <div>
                  <label className="block text-[11px] font-bold uppercase mb-1">Recipient Name *</label>
                  <input
                    type="text"
                    value={newAddrName}
                    onChange={(e) => setNewAddrName(e.target.value)}
                    className="w-full h-10 px-3 border border-[#E8DDD6] rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase mb-1">Mobile Contact *</label>
                  <input
                    type="tel"
                    value={newAddrPhone}
                    onChange={(e) => setNewAddrPhone(e.target.value)}
                    className="w-full h-10 px-3 border border-[#E8DDD6] rounded"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase mb-1">Address &amp; Landmark *</label>
                  <input
                    type="text"
                    value={newAddrLine1}
                    onChange={(e) => setNewAddrLine1(e.target.value)}
                    placeholder="Plot No, House No, Street, Landmark"
                    className="w-full h-10 px-3 border border-[#E8DDD6] rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase mb-1">PIN Code *</label>
                  <input
                    type="text"
                    value={newAddrPincode}
                    onChange={(e) => setNewAddrPincode(e.target.value)}
                    className="w-full h-10 px-3 border border-[#E8DDD6] rounded font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase mb-1">Type</label>
                  <select
                    value={newAddrType}
                    onChange={(e) => setNewAddrType(e.target.value as any)}
                    className="w-full h-10 px-3 border border-[#E8DDD6] rounded bg-white"
                  >
                    <option value="HOME">HOME</option>
                    <option value="WORK">WORK</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
                <div className="sm:col-span-2 pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setNewAddrOpen(false)}
                    className="px-4 py-2 border border-[#E8DDD6] rounded"
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
          )}

          {/* Existing Address Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {customer.addresses.map((addr) => (
              <div
                key={addr.id}
                className="bg-white border-2 border-[#E8DDD6] rounded-xl p-5 shadow-xs space-y-3 relative hover:border-[#B88A44] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-[16px] text-[#231919] font-semibold">
                      {addr.name}
                    </span>
                    <span className="bg-[#F4EEE5] text-[#231919] text-[10px] font-sans font-bold px-2 py-0.5 rounded uppercase">
                      {addr.type}
                    </span>
                  </div>
                  {addr.isDefault && (
                    <span className="bg-[#B88A44] text-white text-[10px] font-sans font-bold px-2 py-0.5 rounded uppercase">
                      Default
                    </span>
                  )}
                </div>
                <p className="font-sans text-[13px] text-[#5F5552] leading-relaxed">
                  {addr.line1}
                  <br />
                  {addr.city}, {addr.state} — {addr.pincode}
                </p>
                <p className="font-sans text-[12px] text-[#5F5552] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">call</span>
                  {addr.phone}
                </p>
                <div className="pt-2 border-t border-[#F4EEE5] flex items-center gap-4 text-[12px] font-sans">
                  <button
                    onClick={() => onRemoveAddress(addr.id)}
                    className="text-[#BA1A1A] hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. LOYALTY POINTS VIEW */}
      {subView === 'loyalty' && (
        <div className="space-y-4">
          <div className="border-b border-[#E8DDD6] pb-3">
            <button
              onClick={() => setSubView('overview')}
              className="text-[12px] font-sans font-bold text-[#780D24] uppercase tracking-wider flex items-center gap-1 hover:underline mb-1"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Back to Account</span>
            </button>
            <h1 className="font-serif text-[22px] sm:text-[26px] text-[#231919] font-medium">
              Loyalty Points
            </h1>
          </div>

          <div className="bg-gradient-to-br from-white to-[#F4EEE5] border border-[#B88A44] rounded-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="font-sans text-[11px] text-[#B88A44] tracking-widest uppercase font-bold">
                Available Balance
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-[36px] font-bold text-[#231919]">
                  {customer.pointsBalance}
                </span>
                <span className="font-serif text-[18px] text-[#780D24] font-semibold">
                  Silk Club Points
                </span>
              </div>
              <p className="font-sans text-[13px] text-[#5F5552]">
                Redeemable at Bag &amp; Checkout on eligible handloom orders.
              </p>
            </div>
            <button
              onClick={() => onNavigate('/shop')}
              className="px-5 py-2.5 bg-[#780D24] hover:bg-[#5E091B] text-white font-sans text-[12px] font-bold tracking-wider uppercase rounded-lg shadow-sm"
            >
              Shop Sarees →
            </button>
          </div>

          {/* Accordion: How Silk Club Points Work */}
          <div className="border border-[#E8DDD6] bg-white rounded-xl p-4">
            <details className="group" open>
              <summary className="flex justify-between items-center cursor-pointer list-none font-serif text-[16px] text-[#231919] font-medium">
                <span>How Points Work</span>
                <span className="material-symbols-outlined transition-transform duration-200 group-open:rotate-180">
                  expand_more
                </span>
              </summary>
              <div className="mt-3 pt-3 border-t border-[#E8DDD6] grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans text-[12px] text-[#5F5552]">
                <div className="p-3 bg-[#FBF7F0] rounded-lg border border-[#E8DDD6]">
                  <span className="font-bold text-[#780D24] uppercase block mb-1">
                    EARN 1 PT / ₹100
                  </span>
                  Every genuine handloom and bridal purchase earns 1 point per ₹100 spent.
                </div>
                <div className="p-3 bg-[#FBF7F0] rounded-lg border border-[#E8DDD6]">
                  <span className="font-bold text-[#780D24] uppercase block mb-1">
                    INSTANT DEDUCTION
                  </span>
                  Redeem points directly at Bag or Checkout (1 point = ₹1 INR).
                </div>
                <div className="p-3 bg-[#FBF7F0] rounded-lg border border-[#E8DDD6]">
                  <span className="font-bold text-[#780D24] uppercase block mb-1">
                    12 MONTH VALIDITY
                  </span>
                  Points remain valid for 365 days from the date of order delivery.
                </div>
              </div>
            </details>
          </div>

          {/* Points History */}
          <div className="bg-white border border-[#E8DDD6] rounded-xl p-5 shadow-xs space-y-3 font-sans">
            <h3 className="font-serif text-[16px] text-[#231919] border-b border-[#F4EEE5] pb-2 font-medium">
              Points History
            </h3>
            <div className="divide-y divide-[#F4EEE5] text-[13px]">
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[#231919] block">Order #PS 849204 Bonus</span>
                  <span className="text-[#5F5552] text-[11px]">Oct 25, 2025</span>
                </div>
                <span className="font-bold text-emerald-700">+398 Pts</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[#231919] block">Redeemed at Checkout</span>
                  <span className="text-[#5F5552] text-[11px]">Oct 25, 2025</span>
                </div>
                <span className="font-bold text-[#780D24]">-200 Pts</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[#231919] block">Welcome Patron Credit</span>
                  <span className="text-[#5F5552] text-[11px]">Aug 10, 2025</span>
                </div>
                <span className="font-bold text-emerald-700">+1,052 Pts</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. EMPTY STATES SHOWCASE */}
      {subView === 'empty' && (
        <div className="space-y-4">
          <div className="border-b border-[#E8DDD6] pb-3">
            <button
              onClick={() => setSubView('overview')}
              className="text-[12px] font-sans font-bold text-[#780D24] uppercase tracking-wider flex items-center gap-1 hover:underline mb-1"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Back to Account</span>
            </button>
            <h1 className="font-serif text-[22px] sm:text-[26px] text-[#231919] font-medium">
              Empty State Showcase
            </h1>
          </div>

          <div className="bg-white border border-[#E8DDD6] rounded-xl p-8 text-center space-y-3 max-w-md mx-auto">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#F4EEE5] flex items-center justify-center text-[#5F5552]">
              <span className="material-symbols-outlined text-[28px]">inventory_2</span>
            </div>
            <h2 className="font-serif text-[18px] text-[#231919] font-medium">No orders yet</h2>
            <p className="font-sans text-[13px] text-[#5F5552]">
              You haven&apos;t placed any orders yet. Discover our latest handloom sarees.
            </p>
            <button
              onClick={() => onNavigate('/shop')}
              className="px-5 py-2.5 bg-[#780D24] text-white font-sans text-[12px] font-bold tracking-wider uppercase rounded-lg shadow-sm"
            >
              Explore Sarees
            </button>
          </div>
        </div>
      )}

      {/* 7. SIGNED OUT STATE */}
      {subView === 'signedout' && (
        <div className="max-w-md mx-auto bg-white border border-[#E8DDD6] rounded-xl p-6 sm:p-8 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#780D24] border-2 border-[#B88A44] flex items-center justify-center text-white font-serif text-[22px] font-bold shadow-inner">
            PS
          </div>
          <div>
            <h1 className="font-serif text-[22px] text-[#231919] font-semibold">
              Sign In to Your Account
            </h1>
            <p className="font-sans text-[13px] text-[#5F5552] mt-1">
              Sign in to manage your orders, addresses and points.
            </p>
          </div>
          <div className="space-y-3 text-left font-sans">
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#231919] mb-1">
                Mobile Number or Email
              </label>
              <input
                type="text"
                placeholder="+91 98490 12345"
                className="w-full h-11 px-3.5 border border-[#E8DDD6] rounded-md text-[14px]"
              />
            </div>
            <button
              onClick={() => onNavigate('/login')}
              className="w-full py-3 bg-[#780D24] hover:bg-[#5E091B] text-white font-sans text-[13px] font-bold uppercase tracking-wider rounded-lg shadow-sm"
            >
              Sign In / Register
            </button>
          </div>
          <div className="pt-2">
            <button
              onClick={() => onNavigate('/')}
              className="text-[13px] font-sans text-[#780D24] hover:underline"
            >
              Continue Shopping →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
