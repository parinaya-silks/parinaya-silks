import {ContactChannels} from '../contact/ContactPresentation.tsx';
import {usePublicContact} from '../content/public.tsx';
import React, { useState } from 'react';

interface ContactViewProps {
  onNavigate: (path: string) => void;
}

export const ContactView: React.FC<ContactViewProps> = ({ onNavigate }) => {
  const contact=usePublicContact();
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

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

      <ContactChannels contact={contact}/>

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
