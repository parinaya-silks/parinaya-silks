import React, { useState } from 'react';
import { Product } from '../types/index.ts';

interface AdminProductFormProps {
  product?: Product;
  onNavigate: (path: string) => void;
  onSave: (product: Product) => void;
}

const PRESET_IMAGES = [
  {
    name: 'Mayuri Regal Wine',
    full: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85',
    pallu: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=85',
    border: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=85',
    blouse: 'https://images.unsplash.com/photo-1610030469668-93510cb67655?auto=format&fit=crop&w=1000&q=85',
  },
  {
    name: 'Padmavathi Rust & Gold',
    full: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1200&q=85',
    pallu: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=85',
    border: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=85',
    blouse: 'https://images.unsplash.com/photo-1610030469668-93510cb67655?auto=format&fit=crop&w=1000&q=85',
  },
  {
    name: 'Swarna Mustard Korvai',
    full: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1200&q=85',
    pallu: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=85',
    border: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=85',
    blouse: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=85',
  },
  {
    name: 'Chandrakala Midnight Blue',
    full: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=85',
    pallu: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=85',
    border: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=85',
    blouse: 'https://images.unsplash.com/photo-1610030469668-93510cb67655?auto=format&fit=crop&w=1000&q=85',
  },
];

export const AdminProductForm: React.FC<AdminProductFormProps> = ({
  product,
  onNavigate,
  onSave,
}) => {
  const isEditing = !!product;

  const [formData, setFormData] = useState<Product>({
    id: product?.id || `prod-${Date.now()}`,
    sku: product?.sku || '',
    name: product?.name || '',
    subtitle: product?.subtitle || '',
    category: product?.category || 'Kanjeevaram',
    categoryLabel: product?.categoryLabel || '',
    weaveType: product?.weaveType || '',
    zariType: product?.zariType || '',
    colorName: product?.colorName || '',
    colorHex: product?.colorHex || '#780D24',
    price: product?.price ?? 0,
    originalPrice: product?.originalPrice,
    inStock: product?.inStock ?? false,
    stockCount: product?.stockCount ?? 0,
    lowStockThreshold: product?.lowStockThreshold ?? 2,
    silkMarkCertified: product?.silkMarkCertified ?? false,
    status: product?.status || 'Draft',
    description: product?.description || '',
    images: product?.images || { full: '' },
    weightGrams: product?.weightGrams ?? 0,
    sareeLength: product?.sareeLength || '',
    blouseIncluded: product?.blouseIncluded ?? false,
    blouseDetails: product?.blouseDetails || '',
    careInstructions: product?.careInstructions || [],
    tags: product?.tags || [],
    origin: product?.origin || '',

  });

  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Please enter a saree title.');
      return;
    }
    if (!formData.sku.trim()) {
      setErrorMsg('Please specify an SKU code.');
      return;
    }
    if (formData.price <= 0) {
      setErrorMsg('Price must be greater than ₹0.');
      return;
    }

    onSave({ ...formData, categoryLabel: formData.category, inStock: formData.stockCount > 0 });
    onNavigate('/admin/products');
  };

  const applyPresetImage = (presetIndex: number) => {
    const p = PRESET_IMAGES[presetIndex];
    if (p) {
      setFormData((prev) => ({
        ...prev,
        images: {
          full: p.full,
          pallu: p.pallu,
          border: p.border,
          blouse: p.blouse,
        },
      }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E8DDD6]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/admin/products')}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#E8DDD6] bg-white hover:bg-[#F4EEE5] text-[#231919]"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h1 className="font-serif text-[22px] sm:text-[26px] font-semibold text-[#231919]">
              {isEditing ? `Edit: ${product.name}` : 'Add New Handloom Saree'}
            </h1>
            <p className="text-[12px] text-[#5F5552] mt-0.5">
              Enter weave taxonomy, pricing, certified silk marks, and high-resolution imagery.
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-300 text-red-900 rounded-lg text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Card */}
        <div className="bg-white border border-[#E8DDD6] rounded-xl p-5 shadow-xs space-y-4">
          <h2 className="font-serif text-[16px] font-semibold text-[#231919] pb-2 border-b border-[#E8DDD6]">
            Saree Taxonomy &amp; Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-[12px] font-semibold text-[#231919] block mb-1">
                Saree Title *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Mayuri Regal Wine Pure Kanjeevaram Silk Saree"
                className="w-full h-10 px-3 border border-[#E8DDD6] rounded-lg text-[13px] bg-[#FBF7F0] focus:outline-none focus:border-[#780D24]"
                required
              />
            </div>

            <div>
              <label className="text-[12px] font-semibold text-[#231919] block mb-1">
                SKU Reference Code *
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full h-10 px-3 border border-[#E8DDD6] rounded-lg text-[13px] bg-[#FBF7F0] font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[12px] font-semibold text-[#231919] block mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as Product['category'] })}
                className="w-full h-10 px-3 border border-[#E8DDD6] rounded-lg text-[13px] bg-[#FBF7F0]"
              >
                <option value="Kanjeevaram">Kanjeevaram</option>
                <option value="Banarasi">Banarasi</option>
                <option value="Mangalagiri">Mangalagiri</option>
                <option value="Tussar">Tussar</option>
                <option value="Organza">Organza</option>
              </select>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-[#231919] block mb-1">
                Weave Technique
              </label>
              <input
                type="text"
                value={formData.weaveType}
                onChange={(e) => setFormData({ ...formData, weaveType: e.target.value })}
                placeholder="e.g. Korvai Interlocked Shuttle Handloom"
                className="w-full h-10 px-3 border border-[#E8DDD6] rounded-lg text-[13px] bg-[#FBF7F0]"
              />
            </div>

            <div>
              <label className="text-[12px] font-semibold text-[#231919] block mb-1">
                Color Name
              </label>
              <input
                type="text"
                value={formData.colorName}
                onChange={(e) => setFormData({ ...formData, colorName: e.target.value })}
                placeholder="e.g. Regal Wine & Antique Gold"
                className="w-full h-10 px-3 border border-[#E8DDD6] rounded-lg text-[13px] bg-[#FBF7F0]"
              />
            </div>

            <div>
              <label className="text-[12px] font-semibold text-[#231919] block mb-1">
                Zari Composition
              </label>
              <input
                type="text"
                value={formData.zariType}
                onChange={(e) => setFormData({ ...formData, zariType: e.target.value })}
                placeholder="e.g. Pure Tested Silver & Gold Dipped Zari"
                className="w-full h-10 px-3 border border-[#E8DDD6] rounded-lg text-[13px] bg-[#FBF7F0]"
              />
            </div>

            <div>
              <label className="text-[12px] font-semibold text-[#231919] block mb-1">
                Publish Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as 'Published' | 'Draft' | 'Archived' })
                }
                className="w-full h-10 px-3 border border-[#E8DDD6] rounded-lg text-[13px] bg-[#FBF7F0]"
              >
                <option value="Published">Published (Live in Store)</option>
                <option value="Draft">Draft (Private)</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pricing & Stock Card */}
        <div className="bg-white border border-[#E8DDD6] rounded-xl p-5 shadow-xs space-y-4">
          <h2 className="font-serif text-[16px] font-semibold text-[#231919] pb-2 border-b border-[#E8DDD6]">
            Pricing &amp; Loom Stock
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-[12px] font-semibold text-[#231919] block mb-1">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                className="w-full h-10 px-3 border border-[#E8DDD6] rounded-lg text-[13px] bg-[#FBF7F0] font-bold"
                required
              />
            </div>

            <div>
              <label className="text-[12px] font-semibold text-[#231919] block mb-1">
                MRP / Original Price (₹)
              </label>
              <input
                type="number"
                value={formData.originalPrice || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    originalPrice: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full h-10 px-3 border border-[#E8DDD6] rounded-lg text-[13px] bg-[#FBF7F0]"
              />
            </div>

            <div>
              <label className="text-[12px] font-semibold text-[#231919] block mb-1">
                Available Stock Count
              </label>
              <input
                type="number"
                value={formData.stockCount}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setFormData({ ...formData, stockCount: val, inStock: val > 0 });
                }}
                className="w-full h-10 px-3 border border-[#E8DDD6] rounded-lg text-[13px] bg-[#FBF7F0] font-mono"
              />
            </div>

            <div>
              <label className="text-[12px] font-semibold text-[#231919] block mb-1">
                Low Stock Threshold
              </label>
              <input
                type="number"
                value={formData.lowStockThreshold}
                onChange={(e) => setFormData({ ...formData, lowStockThreshold: Number(e.target.value) })}
                className="w-full h-10 px-3 border border-[#E8DDD6] rounded-lg text-[13px] bg-[#FBF7F0]"
              />
            </div>
          </div>

          {/* Badges / Checkboxes */}
          <div className="pt-2 flex flex-wrap gap-5 text-xs text-[#231919]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.silkMarkCertified}
                onChange={(e) => setFormData({ ...formData, silkMarkCertified: e.target.checked })}
                className="rounded border-[#B88A44] text-[#780D24] focus:ring-[#780D24]"
              />
              <span className="font-semibold">Silk Mark Certified Organization</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.tags.includes('Bestseller')}
                onChange={(e) => setFormData({ ...formData, tags: e.target.checked ? [...formData.tags, 'Bestseller'] : formData.tags.filter(t => t !== 'Bestseller') })}
                className="rounded border-[#B88A44] text-[#780D24] focus:ring-[#780D24]"
              />
              <span className="font-semibold">Best Seller Highlight</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.tags.includes('New')}
                onChange={(e) => setFormData({ ...formData, tags: e.target.checked ? [...formData.tags, 'New'] : formData.tags.filter(t => t !== 'New') })}
                className="rounded border-[#B88A44] text-[#780D24] focus:ring-[#780D24]"
              />
              <span className="font-semibold">New Arrival Tag</span>
            </label>
          </div>
        </div>

        {/* Gallery & Imagery */}
        <div className="bg-white border border-[#E8DDD6] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E8DDD6]">
            <div>
              <h2 className="font-serif text-[16px] font-semibold text-[#231919]">
                Visual Imagery (4 Angles)
              </h2>
              <p className="text-xs text-[#5F5552]">
                Full drape, Pallu closeup, Border detail, and Blouse piece.
              </p>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[#817567] font-semibold">Load Presets:</span>
              {PRESET_IMAGES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPresetImage(idx)}
                  className="px-2 py-1 bg-[#F4EEE5] hover:bg-[#B88A44]/20 text-[#780D24] font-semibold rounded text-[11px]"
                >
                  #{idx + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-semibold text-[#231919] block mb-1">
                Full Saree Image URL
              </label>
              <input
                type="text"
                value={formData.images.full}
                onChange={(e) =>
                  setFormData({ ...formData, images: { ...formData.images, full: e.target.value } })
                }
                className="w-full h-9 px-3 border border-[#E8DDD6] rounded-lg text-xs bg-[#FBF7F0]"
              />
              <img
                src={formData.images.full}
                alt="Full preview"
                className="mt-2 w-20 h-28 object-cover rounded border border-[#E8DDD6]"
              />
            </div>

            <div>
              <label className="text-[12px] font-semibold text-[#231919] block mb-1">
                Pallu Closeup Image URL
              </label>
              <input
                type="text"
                value={formData.images.pallu}
                onChange={(e) =>
                  setFormData({ ...formData, images: { ...formData.images, pallu: e.target.value } })
                }
                className="w-full h-9 px-3 border border-[#E8DDD6] rounded-lg text-xs bg-[#FBF7F0]"
              />
              <img
                src={formData.images.pallu}
                alt="Pallu preview"
                className="mt-2 w-20 h-28 object-cover rounded border border-[#E8DDD6]"
              />
            </div>

            <div>
              <label className="text-[12px] font-semibold text-[#231919] block mb-1">
                Border Zari Detail URL
              </label>
              <input
                type="text"
                value={formData.images.border}
                onChange={(e) =>
                  setFormData({ ...formData, images: { ...formData.images, border: e.target.value } })
                }
                className="w-full h-9 px-3 border border-[#E8DDD6] rounded-lg text-xs bg-[#FBF7F0]"
              />
              <img
                src={formData.images.border}
                alt="Border preview"
                className="mt-2 w-20 h-28 object-cover rounded border border-[#E8DDD6]"
              />
            </div>

            <div>
              <label className="text-[12px] font-semibold text-[#231919] block mb-1">
                Blouse Fabric Image URL
              </label>
              <input
                type="text"
                value={formData.images.blouse}
                onChange={(e) =>
                  setFormData({ ...formData, images: { ...formData.images, blouse: e.target.value } })
                }
                className="w-full h-9 px-3 border border-[#E8DDD6] rounded-lg text-xs bg-[#FBF7F0]"
              />
              <img
                src={formData.images.blouse}
                alt="Blouse preview"
                className="mt-2 w-20 h-28 object-cover rounded border border-[#E8DDD6]"
              />
            </div>
          </div>
        </div>

        {/* Narrative & Craft Description */}
        <div className="bg-white border border-[#E8DDD6] rounded-xl p-5 shadow-xs space-y-4">
          <h2 className="font-serif text-[16px] font-semibold text-[#231919] pb-2 border-b border-[#E8DDD6]">
            Craft Story &amp; Specifications
          </h2>

          <div>
            <label className="text-[12px] font-semibold text-[#231919] block mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2.5 border border-[#E8DDD6] rounded-lg text-[13px] bg-[#FBF7F0]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-semibold text-[#231919] block mb-1">
                Care Instructions
              </label>
              <input
                type="text"
                value={formData.careInstructions.join('\n')}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    careInstructions: e.target.value.split('\n'),
                  })
                }
                className="w-full h-9 px-3 border border-[#E8DDD6] rounded-lg text-xs bg-[#FBF7F0]"
              />
            </div>

            <div>
              <label className="text-[12px] font-semibold text-[#231919] block mb-1">
                Loom Origin
              </label>
              <input
                type="text"
                value={formData.origin || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    origin: e.target.value,
                  })
                }
                className="w-full h-9 px-3 border border-[#E8DDD6] rounded-lg text-xs bg-[#FBF7F0]"
              />
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8DDD6]">
          <button
            type="button"
            onClick={() => onNavigate('/admin/products')}
            className="px-5 py-2.5 border border-[#E8DDD6] bg-white text-[#5F5552] text-xs font-semibold rounded-lg hover:bg-[#F4EEE5]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#780D24] text-white text-xs font-semibold rounded-lg hover:bg-[#5E091B] transition-colors shadow-sm"
          >
            {isEditing ? 'Save Changes' : 'Publish Saree to Catalog'}
          </button>
        </div>
      </form>
    </div>
  );
};
