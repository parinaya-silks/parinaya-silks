import React, { useState } from 'react';
import { StoreSettings } from '../types/index.ts';

interface AdminSettingsProps {
  settings: StoreSettings;
  onUpdateSettings: (settings: Partial<StoreSettings>) => void;
  onResetDemo: () => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  settings,
  onUpdateSettings,
  onResetDemo,
}) => {
  const [formData, setFormData] = useState<StoreSettings>(settings);
  const [saveToast, setSaveToast] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formData);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const handleReset = () => {
    onResetDemo();
    setResetConfirm(false);
    window.location.reload();
  };

  return (
    <div className="max-w-4xl space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8DDD6]">
        <div>
          <span className="text-[11px] font-bold text-[#780D24] uppercase tracking-wider block">
            Configuration &amp; Atelier Profile
          </span>
          <h1 className="font-serif text-[24px] sm:text-[28px] font-semibold text-[#231919]">
            Store Settings
          </h1>
          <p className="text-[13px] text-[#5F5552] mt-0.5">
            Manage studio contacts, shipping thresholds, announcement banners, and integration states.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          className="h-10 px-5 bg-[#780D24] hover:bg-[#5E091B] text-white text-[13px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">save</span>
          <span>Save Changes</span>
        </button>
      </div>

      {saveToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs">
          <span className="material-symbols-outlined text-emerald-700 text-[18px]">check_circle</span>
          <span>Store configuration updated successfully.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Studio Identity & Contacts */}
        <div className="bg-white border border-[#E8DDD6] rounded-xl p-5 shadow-xs space-y-4">
          <h2 className="font-serif text-[16px] font-semibold text-[#231919] pb-2 border-b border-[#E8DDD6]">
            Atelier Identity &amp; Confirmed Contacts
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-[#231919] block mb-1">Store / Brand Name</label>
              <input
                type="text"
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                className="w-full h-9 px-3 border border-[#E8DDD6] rounded-lg bg-[#FBF7F0]"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-[#231919] block mb-1">GSTIN Number</label>
              <input
                type="text"
                value={formData.gstin || ''}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                className="w-full h-9 px-3 border border-[#E8DDD6] rounded-lg bg-[#FBF7F0] font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-[#231919] block mb-1">Official WhatsApp</label>
              <input
                type="text"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full h-9 px-3 border border-[#E8DDD6] rounded-lg bg-[#FBF7F0] font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-[#231919] block mb-1">Support Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full h-9 px-3 border border-[#E8DDD6] rounded-lg bg-[#FBF7F0]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#231919] block mb-1">Instagram Handle</label>
              <input
                type="text"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                className="w-full h-9 px-3 border border-[#E8DDD6] rounded-lg bg-[#FBF7F0]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#231919] block mb-1">Studio Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full h-9 px-3 border border-[#E8DDD6] rounded-lg bg-[#FBF7F0]"
              />
            </div>
          </div>
        </div>

        {/* Announcement Banner */}
        <div className="bg-white border border-[#E8DDD6] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8DDD6]">
            <div>
              <h2 className="font-serif text-[16px] font-semibold text-[#231919]">
                Storefront Top Announcement Banner
              </h2>
              <p className="text-[11px] text-[#5F5552]">
                Visible at the very top of all customer storefront pages.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.announcementBarActive}
                onChange={(e) => setFormData({ ...formData, announcementBarActive: e.target.checked })}
                className="rounded border-[#B88A44] text-[#780D24] focus:ring-[#780D24]"
              />
              <span className="text-xs font-semibold text-[#231919]">Enable Banner</span>
            </label>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#231919] block mb-1">
              Banner Text Content
            </label>
            <input
              type="text"
              value={formData.announcementBarText}
              onChange={(e) => setFormData({ ...formData, announcementBarText: e.target.value })}
              className="w-full h-10 px-3 border border-[#E8DDD6] rounded-lg text-xs bg-[#FBF7F0]"
            />
          </div>
        </div>

        {/* Shipping & Delivery Rules */}
        <div className="bg-white border border-[#E8DDD6] rounded-xl p-5 shadow-xs space-y-4">
          <h2 className="font-serif text-[16px] font-semibold text-[#231919] pb-2 border-b border-[#E8DDD6]">
            Shipping &amp; Logistics Configuration
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-[#231919] block mb-1">
                Free Shipping Threshold (₹)
              </label>
              <input
                type="number"
                value={formData.complimentaryShippingThreshold}
                onChange={(e) =>
                  setFormData({ ...formData, complimentaryShippingThreshold: Number(e.target.value) })
                }
                className="w-full h-9 px-3 border border-[#E8DDD6] rounded-lg bg-[#FBF7F0] font-bold"
              />
              <p className="text-[11px] text-[#817567] mt-1">
                Orders equal or exceeding this qualify for complimentary express shipping.
              </p>
            </div>

            <div>
              <label className="font-semibold text-[#231919] block mb-1">
                Standard Shipping Fee (₹)
              </label>
              <input
                type="number"
                value={formData.standardShippingFee}
                onChange={(e) =>
                  setFormData({ ...formData, standardShippingFee: Number(e.target.value) })
                }
                className="w-full h-9 px-3 border border-[#E8DDD6] rounded-lg bg-[#FBF7F0]"
              />
              <p className="text-[11px] text-[#817567] mt-1">
                Applied when order value is below free shipping threshold.
              </p>
            </div>
          </div>
        </div>

        {/* Architecture & Backend Readiness Panel */}
        <div className="bg-[#FBF7F0] border border-[#B88A44]/40 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#780D24]">verified</span>
            <h3 className="font-serif text-[16px] font-semibold text-[#231919]">
              Phase 2 Scope &amp; Architecture Roadmap
            </h3>
          </div>
          <p className="text-xs text-[#5F5552] leading-relaxed">
            This storefront is currently operating on <strong>Phase 2 Frontend Architecture</strong> with fully reactive local state management and browser persistence. Live third-party external services (Firebase Authentication, Firestore, and Payment Gateways) are safely decoupled and scheduled for clean activation in Phase 3.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px]">
            <div className="p-2.5 bg-white rounded border border-[#E8DDD6]">
              <span className="font-bold text-[#231919] block">Mock Store Service</span>
              <span className="text-emerald-700 font-semibold">Active &amp; Persistent</span>
            </div>
            <div className="p-2.5 bg-white rounded border border-[#E8DDD6]">
              <span className="font-bold text-[#231919] block">Database / Firestore</span>
              <span className="text-[#817567]">Not connected</span>
            </div>
            <div className="p-2.5 bg-white rounded border border-[#E8DDD6]">
              <span className="font-bold text-[#231919] block">Online Payment Mock</span>
              <span className="text-[#780D24] font-semibold">Realistic Simulation Mode</span>
            </div>
          </div>
        </div>

        {/* Demo Reset Danger Zone */}
        <div className="bg-red-50/60 border border-red-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-red-900 uppercase tracking-wider">
                Reset Demo Data &amp; Storage
              </h3>
              <p className="text-xs text-red-700 mt-0.5">
                Clear all browser local storage changes and restore initial handloom catalog, default orders, and demo wishlist.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setResetConfirm(true)}
              className="px-4 py-2 bg-red-800 text-white text-xs font-semibold rounded-lg hover:bg-red-900 shadow-xs"
            >
              Reset to Factory Demo
            </button>
          </div>
        </div>
      </form>

      {/* Reset Confirmation Dialog */}
      {resetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-red-200 space-y-4">
            <h3 className="font-serif text-[18px] font-bold text-[#231919]">
              Reset Demo Storage?
            </h3>
            <p className="text-xs text-[#5F5552] leading-relaxed">
              This will reset the bag, wishlist, demo customer profile, created orders, and catalog stock back to their original state.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setResetConfirm(false)}
                className="px-4 py-2 border border-[#E8DDD6] rounded-lg text-xs font-semibold text-[#5F5552]"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-red-800 text-white rounded-lg text-xs font-semibold hover:bg-red-900"
              >
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
