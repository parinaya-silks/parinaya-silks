import React, { useState, useMemo } from 'react';
import { Product } from '../types/index.ts';
import { formatINR } from '../utils/pricing.ts';

interface AdminProductsProps {
  products: Product[];
  onNavigate: (path: string) => void;
  onAdjustStock: (product: Product, delta: number) => void;
  onToggleStatus: (product: Product) => void;
}

export const AdminProducts: React.FC<AdminProductsProps> = ({
  products,
  onNavigate,
  onAdjustStock,
  onToggleStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  const categories = ['All', 'Kanjeevaram Bridal', 'Varanasi Brocade', 'Mangalagiri Pattu', 'Tussar & Temple'];

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        p.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        p.weave.toLowerCase().includes(selectedCategory.toLowerCase());

      const matchesStatus =
        selectedStatus === 'All' || p.status === selectedStatus;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.weave.toLowerCase().includes(q) ||
        p.colorName.toLowerCase().includes(q);

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [products, selectedCategory, selectedStatus, searchQuery]);

  const totalValue = useMemo(() => {
    return products.reduce((acc, p) => acc + p.price * p.stockCount, 0);
  }, [products]);

  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.stockCount <= p.lowStockThreshold && p.status === 'Published').length;
  }, [products]);

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8DDD6]">
        <div>
          <span className="text-[11px] font-bold text-[#780D24] uppercase tracking-wider block">
            Atelier Inventory &amp; Catalog
          </span>
          <h1 className="font-serif text-[24px] sm:text-[28px] font-semibold text-[#231919]">
            Products &amp; Stock
          </h1>
          <p className="text-[13px] text-[#5F5552] mt-0.5">
            Manage handloom silk catalog, zari specifications, pricing, and loom availability.
          </p>
        </div>

        <button
          onClick={() => onNavigate('/admin/products/new')}
          className="h-10 px-4 bg-[#780D24] hover:bg-[#5E091B] text-white text-[13px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>+ Add New Saree</span>
        </button>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E8DDD6] p-4 rounded-xl shadow-xs">
          <span className="text-[11px] font-bold text-[#5F5552] uppercase">Total Catalog</span>
          <div className="mt-1 text-[22px] font-bold text-[#231919]">{products.length} Sarees</div>
          <span className="text-[11px] text-[#817567]">Across 4 master loom regions</span>
        </div>

        <div className="bg-white border border-[#E8DDD6] p-4 rounded-xl shadow-xs">
          <span className="text-[11px] font-bold text-[#5F5552] uppercase">Inventory Value</span>
          <div className="mt-1 text-[22px] font-bold text-[#780D24]">{formatINR(totalValue)}</div>
          <span className="text-[11px] text-[#817567]">Pure silk retail valuation</span>
        </div>

        <div className="bg-white border border-[#E8DDD6] p-4 rounded-xl shadow-xs">
          <span className="text-[11px] font-bold text-[#5F5552] uppercase">Low Stock Alerts</span>
          <div className="mt-1 text-[22px] font-bold text-amber-700">{lowStockCount} Sarees</div>
          <span className="text-[11px] text-amber-800 font-medium">≤ 2 units remaining</span>
        </div>

        <div className="bg-white border border-[#E8DDD6] p-4 rounded-xl shadow-xs">
          <span className="text-[11px] font-bold text-[#5F5552] uppercase">Published Active</span>
          <div className="mt-1 text-[22px] font-bold text-emerald-700">
            {products.filter((p) => p.status === 'Published').length} Sarees
          </div>
          <span className="text-[11px] text-emerald-800 font-medium">Live on storefront</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E8DDD6] rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#817567] text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search by saree title, SKU (e.g. PS-KJ), weave, color..."
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

          {/* Status selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#5F5552] font-medium">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-9 px-3 border border-[#E8DDD6] rounded-lg text-xs bg-[#FBF7F0] text-[#231919] focus:outline-none focus:border-[#780D24]"
            >
              <option value="All">All Statuses</option>
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-t border-[#F4EEE5] pt-3 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                selectedCategory === cat
                  ? 'bg-[#780D24] text-white shadow-xs'
                  : 'bg-[#F4EEE5] text-[#5F5552] hover:text-[#231919] hover:bg-[#E8DDD6]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-[#E8DDD6] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#F4EEE5] border-b border-[#E8DDD6] text-[11px] font-bold text-[#5F5552] uppercase tracking-wider">
                <th className="py-3 px-4">Saree &amp; Weave</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Stock Level</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EEE5]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#5F5552]">
                    <span className="material-symbols-outlined text-[36px] text-[#B88A44] mb-2 block">
                      inventory_2
                    </span>
                    <p className="font-serif text-[16px] text-[#231919]">No matching sarees found</p>
                    <p className="text-xs text-[#817567] mt-1">Try resetting search or category filter</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.stockCount <= p.lowStockThreshold;
                  return (
                    <tr key={p.id} className="hover:bg-[#FBF7F0] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.images.full}
                            alt={p.name}
                            className="w-12 h-16 object-cover rounded border border-[#E8DDD6] bg-[#F4EEE5] shrink-0"
                          />
                          <div className="min-w-0">
                            <h3 className="font-serif text-[14px] font-semibold text-[#231919] leading-snug truncate max-w-xs">
                              {p.name}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#5F5552]">
                              <span>{p.weave}</span>
                              <span>•</span>
                              <span>{p.colorName}</span>
                              {p.silkMark && (
                                <span className="bg-amber-100 text-amber-900 px-1 py-0.2 rounded text-[9px] font-bold">
                                  Silk Mark
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-[#780D24] text-xs">
                        {p.sku}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#231919]">{formatINR(p.price)}</div>
                        {p.originalPrice && (
                          <div className="text-[11px] text-[#817567] line-through">
                            {formatINR(p.originalPrice)}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onAdjustStock(p, -1)}
                            disabled={p.stockCount <= 0}
                            className="w-6 h-6 rounded border border-[#E8DDD6] bg-white hover:bg-[#F4EEE5] text-[#231919] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                          >
                            -
                          </button>
                          <span
                            className={`font-bold font-mono px-2 py-0.5 rounded text-xs ${
                              p.stockCount === 0
                                ? 'bg-red-100 text-red-900'
                                : isLow
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-50 text-emerald-900'
                            }`}
                          >
                            {p.stockCount}
                          </span>
                          <button
                            onClick={() => onAdjustStock(p, 1)}
                            className="w-6 h-6 rounded border border-[#E8DDD6] bg-white hover:bg-[#F4EEE5] text-[#231919] flex items-center justify-center font-bold"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => onToggleStatus(p)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                            p.status === 'Published'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                              : 'bg-stone-100 text-stone-700 border border-stone-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              p.status === 'Published' ? 'bg-emerald-600' : 'bg-stone-400'
                            }`}
                          />
                          <span>{p.status}</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onNavigate(`/admin/products/edit/${p.id}`)}
                            className="p-1.5 rounded border border-[#E8DDD6] hover:border-[#780D24] text-[#780D24] hover:bg-[#F4EEE5] transition-colors"
                            title="Edit Saree Details"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button
                            onClick={() => onNavigate(`/product/${p.id}`)}
                            className="p-1.5 rounded border border-[#E8DDD6] hover:border-[#B88A44] text-[#5F5552] hover:bg-[#F4EEE5] transition-colors"
                            title="View on Storefront"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
