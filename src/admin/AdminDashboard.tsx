import React from 'react';
import { Order, Product } from '../types/index.ts';
import { formatINR } from '../utils/pricing.ts';

interface AdminDashboardProps {
  unavailable?: boolean;
  orders: Order[];
  products: Product[];
  onNavigate: (path: string) => void;
  onAdjustStock: (product: Product, delta: number) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  unavailable,
  orders,
  products,
  onNavigate,
  onAdjustStock,
}) => {
  if (unavailable) return <div className="space-y-6">
    <header className="pb-4 border-b border-[#E8DDD6]"><h1 className="font-serif text-[24px] sm:text-[28px] font-semibold">Dashboard</h1><p className="text-sm text-[#5F5552] mt-2">Store reporting is not connected yet.</p></header>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{['Gross Sales', 'Total Orders', 'Awaiting Dispatch', 'Low Stock Sarees'].map(label => <div key={label} className="rounded-xl border border-[#E8DDD6] bg-white p-4 shadow-xs"><p className="text-xs uppercase text-[#5F5552] font-semibold">{label}</p><p className="text-2xl mt-3" aria-label="Unavailable">—</p><p className="text-xs text-[#5F5552] mt-2">Not connected</p></div>)}</div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5"><section className="lg:col-span-2 bg-white border border-[#E8DDD6] rounded-xl p-5 min-h-52"><h2 className="font-serif text-xl">Revenue Progression</h2><p className="mt-8 text-sm text-[#5F5552]">Reporting will appear after orders are connected.</p></section><section className="bg-white border border-[#E8DDD6] rounded-xl p-5"><h2 className="font-serif text-xl">Inventory Summary</h2><p className="mt-8 text-sm text-[#5F5552]">Inventory is not connected.</p></section></div>
    <section className="bg-white border border-[#E8DDD6] rounded-xl p-5"><h2 className="font-serif text-xl">Recent Orders</h2><p className="mt-4 text-sm text-[#5F5552]">Order data is unavailable.</p></section>
  </div>;
  const lowStockProducts = products.filter((p) => p.stockCount <= p.lowStockThreshold && p.status === 'Published');
  const recentOrders = orders.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Header Summary & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E8DDD6]">
        <div>
          <span className="font-sans text-[11px] font-bold text-[#780D24] uppercase tracking-wider block">
            Overview &amp; Atelier Metrics
          </span>
          <h1 className="font-serif text-[24px] sm:text-[28px] font-semibold text-[#231919]">
            Dashboard
          </h1>
          <p className="font-sans text-[13px] text-[#5F5552] mt-0.5">
            Live updates across {products.length} registered silk sarees, Hyderabad loom orders, and dispatch queue.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto font-sans">
          <button
            onClick={() => onNavigate('/admin/orders')}
            className="h-10 px-4 border border-[#B88A44] bg-white hover:bg-[#F4EEE5] text-[#231919] text-[13px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px] text-[#780D24]">receipt_long</span>
            <span>View All Orders</span>
          </button>

          <button
            onClick={() => onNavigate('/admin/products/new')}
            className="h-10 px-4 bg-[#780D24] hover:bg-[#5E091B] text-white text-[13px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>+ Add New Product</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
        {/* Card 1: Gross Sales */}
        <div className="bg-white border border-[#E8DDD6] p-4 rounded-xl shadow-xs hover:border-[#B88A44] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#5F5552] uppercase tracking-wider">
              Gross Sales
            </span>
            <span className="p-1.5 bg-[#F4EEE5] text-[#780D24] rounded-lg">
              <span className="material-symbols-outlined text-[18px]">currency_rupee</span>
            </span>
          </div>
          <div className="mt-2 text-[24px] font-bold text-[#231919]">
            ₹8,42,500
          </div>
          <div className="mt-2 flex items-center text-xs text-emerald-700 font-medium">
            <span className="material-symbols-outlined text-[16px] mr-0.5">arrow_upward</span>
            <span>+14.2%</span>
            <span className="text-[#5F5552] ml-1">vs last period</span>
          </div>
        </div>

        {/* Card 2: Total Orders */}
        <div className="bg-white border border-[#E8DDD6] p-4 rounded-xl shadow-xs hover:border-[#B88A44] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#5F5552] uppercase tracking-wider">
              Total Orders
            </span>
            <span className="p-1.5 bg-[#F4EEE5] text-[#780D24] rounded-lg">
              <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
            </span>
          </div>
          <div className="mt-2 text-[24px] font-bold text-[#231919]">
            {orders.length} Orders
          </div>
          <div className="mt-2 flex items-center text-xs text-[#5F5552]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
            <span>3 pending verification</span>
          </div>
        </div>

        {/* Card 3: Awaiting Dispatch */}
        <div className="bg-white border border-[#B88A44] p-4 rounded-xl shadow-xs bg-gradient-to-br from-white to-[#F4EEE5]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#780D24] uppercase tracking-wider">
              Awaiting Dispatch
            </span>
            <span className="p-1.5 bg-[#B88A44]/20 text-[#780D24] rounded-lg">
              <span className="material-symbols-outlined text-[18px]">local_shipping</span>
            </span>
          </div>
          <div className="mt-2 text-[24px] font-bold text-[#231919]">
            8 Parcels
          </div>
          <div className="mt-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#B88A44]/20 border border-[#B88A44]/50 text-[#780D24] text-[10px] rounded font-bold uppercase">
              <span className="material-symbols-outlined text-[13px]">schedule</span>
              Urgent Dispatch Queue
            </span>
          </div>
        </div>

        {/* Card 4: Low Stock Sarees */}
        <div className="bg-white border border-[#E8DDD6] p-4 rounded-xl shadow-xs hover:border-[#BA1A1A] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#5F5552] uppercase tracking-wider">
              Low Stock Sarees
            </span>
            <span className="p-1.5 bg-red-50 text-[#BA1A1A] rounded-lg">
              <span className="material-symbols-outlined text-[18px]">warning</span>
            </span>
          </div>
          <div className="mt-2 text-[24px] font-bold text-[#BA1A1A]">
            {lowStockProducts.length} Sarees
          </div>
          <div className="mt-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-800 border border-red-200 text-[10px] rounded font-bold uppercase">
              ≤ 2 units remaining
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: Revenue Progression Chart + Weave Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
        {/* Revenue Progression Chart */}
        <div className="lg:col-span-2 bg-white border border-[#E8DDD6] p-5 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="font-serif text-[18px] text-[#231919] font-semibold">
                  30-Day Revenue Progression
                </h2>
                <p className="text-[12px] text-[#5F5552]">
                  Weekly billing aggregates from online orders and bridal consultations.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#780D24]" />
                  <span>Confirmed Orders</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#B88A44]" />
                  <span>Weekly Target (₹2.0L)</span>
                </span>
              </div>
            </div>

            {/* SVG Visual Chart */}
            <div className="relative w-full h-56 mt-2">
              <svg
                aria-label="Revenue Progression Chart"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
                viewBox="0 0 600 220"
              >
                {/* Horizontal Gridlines */}
                <line stroke="#E8DDD6" strokeDasharray="3 3" strokeWidth="1" x1="40" x2="580" y1="20" y2="20" />
                <text fill="#817567" fontSize="10" textAnchor="end" x="32" y="24">₹3.0L</text>
                <line stroke="#E8DDD6" strokeDasharray="3 3" strokeWidth="1" x1="40" x2="580" y1="70" y2="70" />
                <text fill="#817567" fontSize="10" textAnchor="end" x="32" y="74">₹2.0L</text>
                <line stroke="#E8DDD6" strokeDasharray="3 3" strokeWidth="1" x1="40" x2="580" y1="120" y2="120" />
                <text fill="#817567" fontSize="10" textAnchor="end" x="32" y="124">₹1.0L</text>
                <line stroke="#E8DDD6" strokeWidth="1" x1="40" x2="580" y1="170" y2="170" />
                <text fill="#817567" fontSize="10" textAnchor="end" x="32" y="174">₹0</text>

                {/* Target line */}
                <line opacity="0.65" stroke="#B88A44" strokeDasharray="5 4" strokeWidth="1.5" x1="40" x2="580" y1="70" y2="70" />

                {/* Shaded Area */}
                <defs>
                  <linearGradient id="maroonGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#780D24" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#780D24" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M 100 80 L 240 60 L 380 75 L 520 45 L 520 170 L 100 170 Z" fill="url(#maroonGradient)" />

                {/* Trend line */}
                <polyline
                  fill="none"
                  points="100,80 240,60 380,75 520,45"
                  stroke="#780D24"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                />

                {/* Datapoints */}
                <g className="cursor-pointer">
                  <circle cx="100" cy="80" fill="#780D24" r="5" stroke="#FFFFFF" strokeWidth="2" />
                  <text fill="#231919" fontSize="11" fontWeight="600" textAnchor="middle" x="100" y="65">₹1.8L</text>
                  <text fill="#5F5552" fontSize="11" textAnchor="middle" x="100" y="190">Week 1</text>
                </g>
                <g className="cursor-pointer">
                  <circle cx="240" cy="60" fill="#780D24" r="5" stroke="#FFFFFF" strokeWidth="2" />
                  <text fill="#231919" fontSize="11" fontWeight="600" textAnchor="middle" x="240" y="45">₹2.2L</text>
                  <text fill="#5F5552" fontSize="11" textAnchor="middle" x="240" y="190">Week 2</text>
                </g>
                <g className="cursor-pointer">
                  <circle cx="380" cy="75" fill="#780D24" r="5" stroke="#FFFFFF" strokeWidth="2" />
                  <text fill="#231919" fontSize="11" fontWeight="600" textAnchor="middle" x="380" y="60">₹1.9L</text>
                  <text fill="#5F5552" fontSize="11" textAnchor="middle" x="380" y="190">Week 3</text>
                </g>
                <g className="cursor-pointer">
                  <circle cx="520" cy="45" fill="#B88A44" r="6" stroke="#780D24" strokeWidth="2" />
                  <text fill="#780D24" fontSize="12" fontWeight="700" textAnchor="middle" x="520" y="30">₹2.5L ★</text>
                  <text fill="#5F5552" fontSize="11" textAnchor="middle" x="520" y="190">Week 4</text>
                </g>
              </svg>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E8DDD6] flex items-center justify-between text-xs text-[#5F5552]">
            <span>Peak Volume: <strong className="text-[#231919]">Wedding Season Influx (Week 4)</strong></span>
            <span className="text-[#780D24] font-medium">Average Order Value: ₹36,630</span>
          </div>
        </div>

        {/* Weave Breakdown Card */}
        <div className="bg-white border border-[#E8DDD6] p-5 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DDD6]">
              <h2 className="font-serif text-[18px] text-[#231919] font-semibold">Weave Breakdown</h2>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#B88A44]">
                94 Silks Active
              </span>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <div className="flex justify-between text-[13px] mb-1">
                  <span className="font-medium text-[#231919]">Kanjeevaram Bridal Silks</span>
                  <span className="font-bold text-[#780D24]">38 pcs (40%)</span>
                </div>
                <div className="w-full bg-[#F4EEE5] h-2 rounded overflow-hidden">
                  <div className="bg-[#780D24] h-full rounded" style={{ width: '40%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[13px] mb-1">
                  <span className="font-medium text-[#231919]">Varanasi Katan Brocades</span>
                  <span className="font-bold text-[#B88A44]">26 pcs (28%)</span>
                </div>
                <div className="w-full bg-[#F4EEE5] h-2 rounded overflow-hidden">
                  <div className="bg-[#B88A44] h-full rounded" style={{ width: '28%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[13px] mb-1">
                  <span className="font-medium text-[#231919]">Mangalagiri Pattu Sarees</span>
                  <span className="font-bold text-[#231919]">18 pcs (19%)</span>
                </div>
                <div className="w-full bg-[#F4EEE5] h-2 rounded overflow-hidden">
                  <div className="bg-[#5E091B] h-full rounded" style={{ width: '19%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[13px] mb-1">
                  <span className="font-medium text-[#231919]">Wild Tussar &amp; Temple Silks</span>
                  <span className="font-bold text-[#5F5552]">12 pcs (13%)</span>
                </div>
                <div className="w-full bg-[#F4EEE5] h-2 rounded overflow-hidden">
                  <div className="bg-[#817567] h-full rounded" style={{ width: '13%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 p-3 bg-[#FBF7F0] border border-[#E8DDD6] rounded-lg flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[#B88A44] text-[20px] shrink-0 mt-0.5">
              lightbulb
            </span>
            <p className="text-xs text-[#5F5552] leading-relaxed">
              <strong className="text-[#231919]">Loom Inflow Note:</strong> Next lot of 12 pure gold zari bridal pallus arriving Friday from Kanchipuram master weavers.
            </p>
          </div>
        </div>
      </div>

      {/* Row 4: Recent Orders Table */}
      <div className="bg-white border border-[#E8DDD6] rounded-xl overflow-hidden shadow-xs font-sans">
        <div className="p-4 border-b border-[#E8DDD6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FBF7F0]">
          <div>
            <h2 className="font-serif text-[18px] text-[#231919] font-semibold">
              Recent Orders
            </h2>
            <p className="text-xs text-[#5F5552]">
              Customer orders requiring packing slip generation and dispatch verification.
            </p>
          </div>
          <button
            onClick={() => onNavigate('/admin/orders')}
            className="text-[12px] font-bold text-[#780D24] uppercase tracking-wider hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>View All Orders</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#F4EEE5] border-b border-[#E8DDD6] text-[11px] font-bold text-[#5F5552] uppercase tracking-wider">
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Client &amp; Destination</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Fulfilment Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EEE5]">
              {recentOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-[#FBF7F0] transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#780D24]">
                    {ord.referenceId}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-[#231919]">{ord.customerName}</div>
                    <div className="text-[11px] text-[#5F5552]">
                      {ord.shippingAddress.city}, {ord.shippingAddress.state}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-[12px] text-[#5F5552]">
                    {ord.createdAt}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-[#231919]">
                    {formatINR(ord.totalAmount)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      {ord.paymentStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold ${
                        ord.fulfilmentStatus === 'Shipped'
                          ? 'bg-[#780D24] text-white'
                          : ord.fulfilmentStatus === 'Packed'
                          ? 'bg-purple-100 text-purple-900 border border-purple-200'
                          : ord.fulfilmentStatus === 'Delivered'
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-amber-100 text-amber-900 border border-amber-200'
                      }`}
                    >
                      {ord.fulfilmentStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onNavigate(`/admin/orders/${ord.id}`)}
                      className="px-3 py-1 border border-[#B88A44] hover:bg-[#780D24] hover:text-white hover:border-[#780D24] rounded text-[12px] font-semibold text-[#780D24] transition-colors"
                    >
                      View Order
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 5: Low Stock Watchlist */}
      <div className="bg-white border border-[#E8DDD6] rounded-xl p-5 shadow-xs space-y-4 font-sans">
        <div className="flex items-center justify-between pb-3 border-b border-[#E8DDD6]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#780D24] text-[22px]">
              production_quantity_limits
            </span>
            <div>
              <h2 className="font-serif text-[18px] text-[#231919] font-semibold">
                Low Stock Watchlist
              </h2>
              <p className="text-xs text-[#5F5552]">
                Artisanal handloom sarees with critical availability (≤ 2 units in stock).
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('/admin/products')}
            className="text-[12px] font-bold text-[#780D24] uppercase tracking-wider hover:underline"
          >
            Manage Inventory
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.slice(0, 4).map((p) => (
            <div
              key={p.id}
              className="border border-[#E8DDD6] rounded-lg p-3.5 bg-[#FBF7F0] flex flex-col justify-between space-y-3"
            >
              <div className="flex gap-3">
                <div className="w-16 h-20 rounded overflow-hidden border border-[#E8DDD6] bg-white shrink-0 aspect-[3/4]">
                  <img src={p.images.full} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-[#5F5552] font-mono font-bold block truncate">
                    SKU: {p.sku}
                  </span>
                  <h3 className="font-serif text-[13px] font-medium text-[#231919] leading-snug truncate mt-0.5">
                    {p.name}
                  </h3>
                  <span className="font-sans text-[14px] font-bold text-[#780D24] block mt-1">
                    {formatINR(p.price)}
                  </span>
                  <span className="inline-block mt-1 px-1.5 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold uppercase rounded">
                    {p.stockCount} Left Only
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-[#E8DDD6] flex gap-2">
                <button
                  onClick={() => onAdjustStock(p, 2)}
                  className="flex-1 py-1.5 bg-white border border-[#E8DDD6] hover:border-[#780D24] text-[11px] font-semibold rounded text-[#231919]"
                >
                  + Add Stock
                </button>
                <button
                  onClick={() => onNavigate('/admin/products')}
                  className="px-3 py-1.5 border border-[#B88A44] text-[#780D24] text-[11px] font-semibold rounded hover:bg-[#780D24] hover:text-white"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
