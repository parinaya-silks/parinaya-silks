import {usePublicContact} from '../content/public.tsx';
import React, { useState } from 'react';

interface ContactViewProps {
  onNavigate: (path: string) => void;
}

export const ContactView: React.FC<ContactViewProps> = ({ onNavigate }) => {
  const contact=usePublicContact();
  const [orderRef, setOrderRef] = useState('');
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const getWhatsAppUrl = () => {
    const base = 'https://wa.me/'+contact.mobile.replace('+','');
    if (orderRef.trim()) {
      const msg = encodeURIComponent(
        `Namaste Parinaya Silks, I am inquiring regarding my Order ${orderRef.trim()}. Could you please assist me?`
      );
      return `${base}?text=${msg}`;
    }
    const defaultMsg = encodeURIComponent(
      'Namaste Parinaya Silks, I would like to inquire about your saree collections and services.'
    );
    return `${base}?text=${defaultMsg}`;
  };

  const toggleFaq = (index: number) => {
    setFaqOpen(faqOpen === index ? null : index);
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-6">
      {/* Breadcrumb strip */}
      <nav aria-label="Breadcrumb" className="text-[12px] font-sans text-[#5F5552] flex items-center gap-1.5">
        <button onClick={() => onNavigate('/')} className="hover:text-[#780D24]">
          Home
        </button>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-[#231919] font-semibold">Contact Us</span>
      </nav>

      {/* Header */}
      <div className="space-y-1.5">
        <h1 className="font-serif text-[28px] sm:text-[34px] leading-tight text-[#231919] font-medium">
          We’re here to help
        </h1>
        <p className="font-sans text-[15px] sm:text-[16px] text-[#5F5552] leading-relaxed">
          For inquiries regarding curated sarees, orders, and assistance.
        </p>
      </div>

      {/* Contact Cards */}
      <section aria-label="Contact Channels" className="space-y-4">
        {/* 1. WhatsApp Card with Order Ref Field */}
        <div className="bg-white border border-[#E8DDD6] rounded-xl p-5 shadow-xs space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#F3F8F3] text-[#1E7E34] border border-[#CDE5D2] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">chat</span>
            </div>
            <div>
              <span className="block text-[11px] uppercase tracking-wider font-bold text-[#5F5552] font-sans">
                WhatsApp
              </span>
              <span className="font-sans text-[18px] font-bold text-[#231919]">
                {contact.mobile}
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="order-ref-input"
              className="block text-[13px] font-sans text-[#5F5552] mb-1.5 font-medium"
            >
              Add your order number to your enquiry <span className="text-stone-400">(optional)</span>
            </label>
            <div className="relative">
              <input
                id="order-ref-input"
                type="text"
                value={orderRef}
                onChange={(e) => setOrderRef(e.target.value)}
                placeholder="Your order number"
                className="w-full h-11 bg-[#FBF7F0] px-3.5 pr-10 text-[#231919] text-[15px] font-sans border border-[#E8DDD6] rounded-lg focus:outline-none focus:border-[#780D24]"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B88A44] material-symbols-outlined text-[18px] pointer-events-none">
                tag
              </span>
            </div>
          </div>

          <a
            href={getWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-11 bg-[#780D24] hover:bg-[#5E091B] text-white text-[14px] font-sans font-semibold rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">forum</span>
            <span>Chat on WhatsApp</span>
          </a>
        </div>

        {/* 2. Email Card */}
        <div className="bg-white border border-[#E8DDD6] rounded-xl p-5 shadow-xs space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#F4EEE5] text-[#780D24] border border-[#E8DDD6] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">mail</span>
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] uppercase tracking-wider font-bold text-[#5F5552] font-sans">
                Email
              </span>
              <span className="font-sans text-[15px] sm:text-[16px] font-bold text-[#231919] break-all">
                {contact.email}
              </span>
            </div>
          </div>

          <a
            href={'mailto:'+contact.email}
            className="w-full h-11 bg-white border border-[#780D24] hover:bg-[#F4EEE5] text-[#780D24] text-[14px] font-sans font-semibold rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            <span>Send Email</span>
          </a>
        </div>

        {/* 3. Instagram Card */}
        <div className="bg-white border border-[#E8DDD6] rounded-xl p-5 shadow-xs space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#F4EEE5] text-[#B88A44] border border-[#E8DDD6] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">photo_camera</span>
            </div>
            <div>
              <span className="block text-[11px] uppercase tracking-wider font-bold text-[#5F5552] font-sans">
                Instagram
              </span>
              <span className="font-sans text-[16px] font-bold text-[#231919]">
                {new URL(contact.instagram).pathname.replaceAll('/','')}
              </span>
            </div>
          </div>

          <a
            href={contact.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-11 bg-white border border-[#E8DDD6] hover:border-[#780D24] text-[#231919] text-[14px] font-sans font-semibold rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            <span>Visit Instagram</span>
          </a>
        </div>

        {/* 4. Location Card */}
        <div className="bg-white border border-[#E8DDD6] rounded-xl p-5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#F4EEE5] text-[#780D24] border border-[#E8DDD6] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">location_on</span>
          </div>
          <div>
            <span className="block text-[11px] uppercase tracking-wider font-bold text-[#5F5552] font-sans">
              Location
            </span>
            <span className="font-serif text-[18px] text-[#231919] font-medium">
              {contact.address}
            </span>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions (Quick Help) */}
      <section aria-labelledby="faq-section-heading" className="space-y-4 pt-2">
        <div className="border-b border-[#E8DDD6] pb-2.5 flex items-baseline justify-between">
          <h2 className="font-serif text-[20px] sm:text-[22px] text-[#231919] font-medium" id="faq-section-heading">
            Frequently Asked Questions
          </h2>
          <span className="text-[11px] uppercase font-sans tracking-wider text-[#B88A44] font-bold">
            Quick Help
          </span>
        </div>

        <div className="space-y-3 font-sans">
          {/* FAQ 1 */}
          <div className="border border-[#E8DDD6] rounded-xl bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => toggleFaq(1)}
              className="w-full px-4 py-3.5 text-left flex items-center justify-between gap-3 min-h-[48px]"
            >
              <span className="text-[15px] font-medium text-[#231919]">How do I track my order?</span>
              <span className="material-symbols-outlined text-[20px] text-[#B88A44] transition-transform">
                {faqOpen === 1 ? 'remove' : 'add'}
              </span>
            </button>
            {faqOpen === 1 && (
              <div className="px-4 pb-4 pt-1 border-t border-[#F4EEE5] text-[#5F5552] text-[14px] leading-relaxed">
                <p className="mb-3">
                  Sign in to My orders to see current order progress and courier tracking. Customers receive updates on this website.
                </p>
                <button
                  onClick={() => onNavigate('/account/orders')}
                  className="inline-flex items-center gap-1 text-[13px] text-[#780D24] font-semibold hover:underline"
                >
                  <span>View my orders</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>
            )}
          </div>

          {/* FAQ 2 */}
          <div className="border border-[#E8DDD6] rounded-xl bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => toggleFaq(2)}
              className="w-full px-4 py-3.5 text-left flex items-center justify-between gap-3 min-h-[48px]"
            >
              <span className="text-[15px] font-medium text-[#231919]">
                Where can I find delivery information?
              </span>
              <span className="material-symbols-outlined text-[20px] text-[#B88A44] transition-transform">
                {faqOpen === 2 ? 'remove' : 'add'}
              </span>
            </button>
            {faqOpen === 2 && (
              <div className="px-4 pb-4 pt-1 border-t border-[#F4EEE5] text-[#5F5552] text-[14px] leading-relaxed">
                <p className="mb-3">
                  Please contact us for current delivery information. Shipping terms are pending final approval.
                </p>
                <button
                  onClick={() => onNavigate('/policies?tab=shipping')}
                  className="inline-flex items-center gap-1 text-[13px] text-[#780D24] font-semibold hover:underline"
                >
                  <span>Read our Shipping Policy</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>
            )}
          </div>

          {/* FAQ 3 */}
          <div className="border border-[#E8DDD6] rounded-xl bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => toggleFaq(3)}
              className="w-full px-4 py-3.5 text-left flex items-center justify-between gap-3 min-h-[48px]"
            >
              <span className="text-[15px] font-medium text-[#231919]">
                Where can I check the returns and exchange policy?
              </span>
              <span className="material-symbols-outlined text-[20px] text-[#B88A44] transition-transform">
                {faqOpen === 3 ? 'remove' : 'add'}
              </span>
            </button>
            {faqOpen === 3 && (
              <div className="px-4 pb-4 pt-1 border-t border-[#F4EEE5] text-[#5F5552] text-[14px] leading-relaxed">
                <p className="mb-3">
                  Returns and exchange terms are pending final approval. Please contact us with any questions.
                </p>
                <button
                  onClick={() => onNavigate('/policies?tab=returns')}
                  className="inline-flex items-center gap-1 text-[13px] text-[#780D24] font-semibold hover:underline"
                >
                  <span>Review Returns &amp; Exchanges</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
