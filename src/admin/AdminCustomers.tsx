import React, { useState, useMemo } from 'react';
import { Customer, Order } from '../types/index.ts';
import { formatINR } from '../utils/pricing.ts';

interface AdminCustomersProps {
  customers: Customer[];
  orders: Order[];
  onNavigate: (path: string) => void;
}

export const AdminCustomers: React.FC<AdminCustomersProps> = ({
  customers,
  orders,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('All');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const tiers = ['All', 'Royal Heirloom Patron', 'Gold Silk Patron', 'Silver Patron'];

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesTier = tierFilter === 'All' || c.membershipTier === tierFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q);
      return matchesTier && matchesSearch;
    });
  }, [customers, tierFilter, searchQuery]);

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8DDD6]">
        <div>
          <span className="text-[11px] font-bold text-[#780D24] uppercase tracking-wider block">
            Patron Management
          </span>
          <h1 className="font-serif text-[24px] sm:text-[28px] font-semibold text-[#231919]">
            Patrons &amp; Clients
          </h1>
          <p className="text-[13px] text-[#5F5552] mt-0.5">
            Registered patrons, bridal consultation clients, and loyalty point accounts.
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E8DDD6] p-4 rounded-xl shadow-xs">
          <span className="text-[11px] font-bold text-[#5F5552] uppercase">Total Registered Patrons</span>
          <div className="mt-1 text-[22px] font-bold text-[#231919]">{customers.length} Clients</div>
          <span className="text-[11px] text-[#817567]">Across India and international diaspora</span>
        </div>

        <div className="bg-white border border-[#E8DDD6] p-4 rounded-xl shadow-xs">
          <span className="text-[11px] font-bold text-[#5F5552] uppercase">Heirloom &amp; Gold Tier</span>
          <div className="mt-1 text-[22px] font-bold text-[#780D24]">
            {customers.filter((c) => c.membershipTier.includes('Gold') || c.membershipTier.includes('Heirloom')).length} Patrons
          </div>
          <span className="text-[11px] text-[#B88A44] font-medium">VIP bridal consultation eligible</span>
        </div>

        <div className="bg-white border border-[#E8DDD6] p-4 rounded-xl shadow-xs">
          <span className="text-[11px] font-bold text-[#5F5552] uppercase">Loyalty Points Outstanding</span>
          <div className="mt-1 text-[22px] font-bold text-[#B88A44]">
            {customers.reduce((acc, c) => acc + c.pointsBalance, 0).toLocaleString('en-IN')} Pts
          </div>
          <span className="text-[11px] text-[#5F5552]">Redeemable at ₹1/pt</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-[#E8DDD6] rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#817567] text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search by patron name, email, or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-8 text-[13px] bg-[#FBF7F0] border border-[#E8DDD6] rounded-lg focus:outline-none focus:border-[#780D24] text-[#231919]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {tiers.map((t) => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                tierFilter === t
                  ? 'bg-[#780D24] text-white'
                  : 'bg-[#F4EEE5] text-[#5F5552] hover:text-[#231919]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white border border-[#E8DDD6] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#F4EEE5] border-b border-[#E8DDD6] text-[11px] font-bold text-[#5F5552] uppercase tracking-wider">
                <th className="py-3 px-4">Patron Name &amp; Contacts</th>
                <th className="py-3 px-4">Membership Tier</th>
                <th className="py-3 px-4">Orders</th>
                <th className="py-3 px-4">Lifetime Spend</th>
                <th className="py-3 px-4">Points</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EEE5]">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#5F5552]">
                    <span className="material-symbols-outlined text-[36px] text-[#B88A44] mb-2 block">
                      group
                    </span>
                    <p className="font-serif text-[16px] text-[#231919]">No matching patrons found</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-[#FBF7F0] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#780D24] text-[#FBF7F0] font-serif font-bold text-xs flex items-center justify-center shrink-0">
                          {cust.name
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div>
                          <div className="font-semibold text-[#231919]">{cust.name}</div>
                          <div className="text-[11px] text-[#5F5552]">
                            {cust.email} • <span className="font-mono">{cust.phone}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#F4EEE5] text-[#780D24] border border-[#B88A44]/30">
                        ★ {cust.membershipTier}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-[#231919]">
                      {cust.totalOrdersCount}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-[#780D24]">
                      {formatINR(cust.lifetimeSpend)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-[#B88A44] font-mono">
                        {cust.pointsBalance} pts
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedCustomer(cust)}
                        className="px-3 py-1 border border-[#B88A44] hover:bg-[#780D24] hover:text-white hover:border-[#780D24] rounded text-[12px] font-semibold text-[#780D24] transition-colors"
                      >
                        Profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Profile Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-[#B88A44]/30 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DDD6]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#780D24] text-white font-serif font-bold text-sm flex items-center justify-center">
                  {selectedCustomer.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-serif text-[18px] font-semibold text-[#231919]">
                    {selectedCustomer.name}
                  </h3>
                  <span className="text-[11px] text-[#780D24] font-bold">
                    {selectedCustomer.membershipTier}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-[#817567] hover:text-[#231919]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#FBF7F0] rounded-lg border border-[#E8DDD6]">
                <span className="text-[#5F5552] block">Total Orders</span>
                <span className="text-[16px] font-bold text-[#231919] mt-0.5 block font-mono">
                  {selectedCustomer.totalOrdersCount}
                </span>
              </div>
              <div className="p-3 bg-[#FBF7F0] rounded-lg border border-[#E8DDD6]">
                <span className="text-[#5F5552] block">Lifetime Value</span>
                <span className="text-[16px] font-bold text-[#780D24] mt-0.5 block">
                  {formatINR(selectedCustomer.lifetimeSpend)}
                </span>
              </div>
              <div className="p-3 bg-[#FBF7F0] rounded-lg border border-[#E8DDD6]">
                <span className="text-[#5F5552] block">Points Balance</span>
                <span className="text-[16px] font-bold text-[#B88A44] mt-0.5 block font-mono">
                  {selectedCustomer.pointsBalance}
                </span>
              </div>
              <div className="p-3 bg-[#FBF7F0] rounded-lg border border-[#E8DDD6]">
                <span className="text-[#5F5552] block">Phone</span>
                <span className="text-[13px] font-semibold text-[#231919] mt-0.5 block font-mono">
                  {selectedCustomer.phone}
                </span>
              </div>
            </div>

            {/* Saved Addresses */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-[#780D24] uppercase tracking-wider block">
                Saved Shipping Addresses
              </span>
              {selectedCustomer.addresses.map((a) => (
                <div key={a.id} className="p-3 border border-[#E8DDD6] rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#231919]">{a.name} ({a.type})</span>
                    {a.isDefault && (
                      <span className="bg-[#780D24] text-white text-[9px] font-bold px-1.5 py-0.2 rounded">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-[#5F5552]">
                    {a.street}, {a.city}, {a.state} - {a.pincode}
                  </p>
                </div>
              ))}
            </div>

            {/* Recent Orders linked */}
            <div className="space-y-2 pt-2 border-t border-[#E8DDD6]">
              <span className="text-[11px] font-bold text-[#780D24] uppercase tracking-wider block">
                Recent Orders Placed
              </span>
              {orders
                .filter((o) => o.customerPhone === selectedCustomer.phone || o.customerEmail === selectedCustomer.email)
                .slice(0, 3)
                .map((ord) => (
                  <div
                    key={ord.id}
                    className="p-2.5 border border-[#E8DDD6] rounded-lg flex items-center justify-between text-xs hover:bg-[#FBF7F0]"
                  >
                    <div>
                      <span className="font-mono font-bold text-[#780D24]">{ord.referenceId}</span>
                      <span className="text-[#5F5552] ml-2">({ord.createdAt})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#231919]">{formatINR(ord.totalAmount)}</span>
                      <button
                        onClick={() => {
                          setSelectedCustomer(null);
                          onNavigate(`/admin/orders/${ord.id}`);
                        }}
                        className="text-[11px] text-[#780D24] font-semibold underline"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            <div className="pt-3 border-t border-[#E8DDD6] flex justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 bg-[#780D24] text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
