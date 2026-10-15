import React, { useState, useMemo } from 'react';
import { Order, FulfilmentStatus } from '../types/index.ts';
import { formatINR } from '../utils/pricing.ts';

interface AdminOrdersProps {
  orders: Order[];
  onNavigate: (path: string) => void;
  onUpdateStatus: (orderId: string, status: FulfilmentStatus, courier?: string, tracking?: string) => void;
  onBulkUpdateStatus: (orderIds: string[], status: FulfilmentStatus) => { successCount: number; ineligibleOrders: Order[] };
}

export const AdminOrders: React.FC<AdminOrdersProps> = ({
  orders,
  onNavigate,
  onUpdateStatus,
  onBulkUpdateStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkActionStatus, setBulkActionStatus] = useState<FulfilmentStatus | ''>('');
  const [bulkCourier, setBulkCourier] = useState('Blue Dart Express');
  const [bulkTrackingPrefix, setBulkTrackingPrefix] = useState('BD-HYD-');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

  const statuses: { label: string; count: number }[] = useMemo(() => {
    return [
      { label: 'All', count: orders.length },
      { label: 'Unfulfilled', count: orders.filter((o) => o.fulfilmentStatus === 'Unfulfilled').length },
      { label: 'Processing', count: orders.filter((o) => o.fulfilmentStatus === 'Processing').length },
      { label: 'Packed', count: orders.filter((o) => o.fulfilmentStatus === 'Packed').length },
      { label: 'Shipped', count: orders.filter((o) => o.fulfilmentStatus === 'Shipped').length },
      { label: 'Delivered', count: orders.filter((o) => o.fulfilmentStatus === 'Delivered').length },
      { label: 'Cancelled', count: orders.filter((o) => o.fulfilmentStatus === 'Cancelled').length },
    ];
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const matchesStatus = statusFilter === 'All' || ord.fulfilmentStatus === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        ord.referenceId.toLowerCase().includes(q) ||
        ord.customerName.toLowerCase().includes(q) ||
        ord.customerPhone.toLowerCase().includes(q) ||
        ord.shippingAddress.city.toLowerCase().includes(q) ||
        ord.shippingAddress.state.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, searchQuery]);

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleApplyBulkAction = () => {
    if (!bulkActionStatus || selectedOrderIds.length === 0) return;

    const result = onBulkUpdateStatus(selectedOrderIds, bulkActionStatus);
    if (result.ineligibleOrders.length > 0) {
      setBulkMessage(
        `Updated ${result.successCount} orders to ${bulkActionStatus}. ${result.ineligibleOrders.length} order(s) skipped: unpaid, missing shipment details, or invalid status transition.`
      );
    } else {
      setBulkMessage(`Successfully updated ${result.successCount} orders to ${bulkActionStatus}.`);
    }
    setShowBulkModal(false);
    setSelectedOrderIds([]);
    setBulkActionStatus('');
    setTimeout(() => setBulkMessage(null), 5000);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8DDD6]">
        <div>
          <span className="text-[11px] font-bold text-[#780D24] uppercase tracking-wider block">
            Dispatch &amp; Order Pipeline
          </span>
          <h1 className="font-serif text-[24px] sm:text-[28px] font-semibold text-[#231919]">
            Orders &amp; Shipments
          </h1>
          <p className="text-[13px] text-[#5F5552] mt-0.5">
            Manage bridal packaging, courier tracking generation, and fulfillment milestones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const csvData = orders.map((o) => `"${o.referenceId}","${o.customerName}","${o.totalAmount}","${o.fulfilmentStatus}"`).join('\n');
              const blob = new Blob([`Reference,Customer,Total,Status\n${csvData}`], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `orders-export-${Date.now()}.csv`;
              a.click();
            }}
            className="h-10 px-4 border border-[#B88A44] bg-white hover:bg-[#F4EEE5] text-[#231919] text-[13px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px] text-[#780D24]">download</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {bulkMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg text-[13px] flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-700 text-[20px]">check_circle</span>
            <span>{bulkMessage}</span>
          </div>
          <button onClick={() => setBulkMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Filter Ribbon & Search Bar */}
      <div className="bg-white border border-[#E8DDD6] rounded-xl p-4 shadow-xs space-y-4">
        {/* Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {statuses.map((st) => (
            <button
              key={st.label}
              onClick={() => setStatusFilter(st.label)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 ${
                statusFilter === st.label
                  ? 'bg-[#780D24] text-white shadow-xs'
                  : 'bg-[#F4EEE5] text-[#5F5552] hover:text-[#231919] hover:bg-[#E8DDD6]'
              }`}
            >
              <span>{st.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  statusFilter === st.label ? 'bg-white/20 text-white' : 'bg-black/5 text-[#5F5552]'
                }`}
              >
                {st.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Actions Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-[#F4EEE5]">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#817567] text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search reference #, patron name, phone, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-8 text-[13px] bg-[#FBF7F0] border border-[#E8DDD6] rounded-lg focus:outline-none focus:border-[#780D24] text-[#231919]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#817567] hover:text-[#231919]"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Bulk actions trigger */}
          {selectedOrderIds.length > 0 && (
            <div className="flex items-center gap-2 bg-[#F4EEE5] px-3 py-1.5 rounded-lg border border-[#B88A44]/40 animate-fade-in">
              <span className="text-[12px] font-bold text-[#780D24]">
                {selectedOrderIds.length} selected
              </span>
              <button
                onClick={() => {
                  setBulkActionStatus('Shipped');
                  setShowBulkModal(true);
                }}
                className="px-2.5 py-1 bg-[#780D24] text-white text-[11px] font-bold rounded hover:bg-[#5E091B]"
              >
                Mark as Shipped
              </button>
              <button
                onClick={() => {
                  setBulkActionStatus('Packed');
                  setShowBulkModal(true);
                }}
                className="px-2.5 py-1 bg-white border border-[#E8DDD6] text-[#231919] text-[11px] font-semibold rounded hover:border-[#780D24]"
              >
                Mark as Packed
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-[#E8DDD6] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#F4EEE5] border-b border-[#E8DDD6] text-[11px] font-bold text-[#5F5552] uppercase tracking-wider">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                    onChange={toggleSelectAll}
                    className="rounded border-[#B88A44] text-[#780D24] focus:ring-[#780D24] cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">Order ID &amp; Date</th>
                <th className="py-3 px-4">Customer &amp; Destination</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Fulfilment</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EEE5]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#5F5552]">
                    <span className="material-symbols-outlined text-[36px] text-[#B88A44] mb-2 block">
                      inbox
                    </span>
                    <p className="font-serif text-[16px] text-[#231919]">No matching orders found</p>
                    <p className="text-xs text-[#817567] mt-1">Try adjusting your filters or search keywords</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const isSelected = selectedOrderIds.includes(ord.id);
                  return (
                    <tr
                      key={ord.id}
                      className={`hover:bg-[#FBF7F0] transition-colors ${isSelected ? 'bg-[#FDF9F3]' : ''}`}
                    >
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOrder(ord.id)}
                          className="rounded border-[#B88A44] text-[#780D24] focus:ring-[#780D24] cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => onNavigate(`/admin/orders/${ord.id}`)}
                          className="font-mono font-bold text-[#780D24] hover:underline block text-left"
                        >
                          {ord.referenceId}
                        </button>
                        <span className="text-[11px] text-[#5F5552]">{ord.createdAt}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#231919]">{ord.customerName}</div>
                        <div className="text-[11px] text-[#5F5552]">
                          {ord.shippingAddress.city}, {ord.shippingAddress.state} • {ord.customerPhone}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {ord.items.slice(0, 2).map((item, idx) => (
                            <img
                              key={idx}
                              src={item.image}
                              alt={item.productName}
                              className="w-7 h-9 object-cover rounded border border-[#E8DDD6]"
                              title={item.productName}
                            />
                          ))}
                          {ord.items.length > 2 && (
                            <span className="text-[11px] font-semibold text-[#5F5552] bg-[#F4EEE5] px-1.5 py-0.5 rounded">
                              +{ord.items.length - 2}
                            </span>
                          )}
                          <span className="text-xs text-[#5F5552] ml-1">
                            {ord.items.reduce((acc, curr) => acc + curr.quantity, 0)} pc(s)
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#231919]">
                        {formatINR(ord.totalAmount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                            ord.paymentStatus === 'Paid'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              ord.paymentStatus === 'Paid' ? 'bg-emerald-600' : 'bg-amber-600'
                            }`}
                          />
                          {ord.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={ord.fulfilmentStatus}
                          onChange={(e) =>
                            (() => { try { onUpdateStatus(ord.id, e.target.value as FulfilmentStatus); } catch (error) { window.alert(error instanceof Error ? error.message : 'Could not update order.'); } })()
                          }
                          className="text-[11px] font-semibold py-1 px-2 rounded border border-[#E8DDD6] bg-white text-[#231919] focus:outline-none focus:border-[#780D24]"
                        >
                          <option value="Unfulfilled">Unfulfilled</option>
                          <option value="Processing">Processing</option>
                          <option value="Packed">Packed</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onNavigate(`/admin/orders/${ord.id}`)}
                          className="px-3 py-1 border border-[#B88A44] hover:bg-[#780D24] hover:text-white hover:border-[#780D24] rounded text-[12px] font-semibold text-[#780D24] transition-colors"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Action Confirmation Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#B88A44]/30 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DDD6]">
              <h3 className="font-serif text-[18px] font-semibold text-[#231919]">
                Bulk Update ({selectedOrderIds.length} Orders)
              </h3>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-[#817567] hover:text-[#231919]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-[13px] text-[#5F5552]">
              You are about to change the status of <strong>{selectedOrderIds.length}</strong> selected orders to:
            </p>

            <div>
              <label className="text-[12px] font-semibold text-[#231919] block mb-1">
                Target Status
              </label>
              <select
                value={bulkActionStatus}
                onChange={(e) => setBulkActionStatus(e.target.value as FulfilmentStatus)}
                className="w-full h-10 px-3 border border-[#E8DDD6] rounded-lg text-[13px] bg-[#FBF7F0] text-[#231919] focus:outline-none focus:border-[#780D24]"
              >
                <option value="Unfulfilled">Unfulfilled</option>
                <option value="Processing">Processing</option>
                <option value="Packed">Packed</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {bulkActionStatus === 'Shipped' && (
              <div className="space-y-3 p-3 bg-[#FBF7F0] border border-[#E8DDD6] rounded-lg">
                <div>
                  <label className="text-[11px] font-bold text-[#5F5552] uppercase block mb-1">
                    Courier Partner
                  </label>
                  <input
                    type="text"
                    value={bulkCourier}
                    onChange={(e) => setBulkCourier(e.target.value)}
                    className="w-full h-9 px-3 border border-[#E8DDD6] bg-white rounded text-[13px]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#5F5552] uppercase block mb-1">
                    Tracking Prefix
                  </label>
                  <input
                    type="text"
                    value={bulkTrackingPrefix}
                    onChange={(e) => setBulkTrackingPrefix(e.target.value)}
                    className="w-full h-9 px-3 border border-[#E8DDD6] bg-white rounded text-[13px]"
                  />
                  <p className="text-[11px] text-[#817567] mt-1">
                    Sequential tracking numbers will be automatically assigned.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8DDD6]">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 border border-[#E8DDD6] rounded-lg text-[13px] font-semibold text-[#5F5552] hover:bg-[#FBF7F0]"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyBulkAction}
                className="px-5 py-2 bg-[#780D24] text-white rounded-lg text-[13px] font-semibold hover:bg-[#5E091B]"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
