import {usePublicContact} from '../content/public.tsx';
import React, { useState, useEffect } from 'react';
import {useStoreContent} from '../content/public.tsx';

type PolicyKey = 'shipping' | 'returns' | 'privacy' | 'terms';

interface PoliciesViewProps {
  initialTab?: PolicyKey;
  onNavigate: (path: string) => void;
}

export const PoliciesView: React.FC<PoliciesViewProps> = ({ initialTab = 'shipping', onNavigate }) => {
  const contact=usePublicContact();
  const {content}=useStoreContent();
  const [activeKey, setActiveKey] = useState<PolicyKey>(initialTab);
  const [tocOpen, setTocOpen] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveKey(initialTab);
    }
  }, [initialTab]);

  const policies = {
    shipping: { title: 'Shipping Policy', badge: 'Policies', breadcrumb: 'Shipping Policy' },
    returns: { title: 'Returns & Exchanges', badge: 'Policies', breadcrumb: 'Returns & Exchanges' },
    privacy: { title: 'Privacy Policy', badge: 'Policies', breadcrumb: 'Privacy Policy' },
    terms: { title: 'Terms & Conditions', badge: 'Policies', breadcrumb: 'Terms & Conditions' },
  };
  const currentPolicy = policies[activeKey];
  const otherKeys = (Object.keys(policies) as PolicyKey[]).filter((k) => k !== activeKey);

  return (
    <div className="pb-28">
      {!content.policies[activeKey]?.approved&&<p role="note" className="bg-amber-50 text-amber-950 border-b border-amber-200 p-4 text-sm text-center">Policy terms are pending final approval.</p>}
      {/* Breadcrumb Strip */}
      <section className="bg-[#F4EEE5] border-b border-[#E8DDD6]">
        <div className="max-w-[760px] mx-auto px-4 py-2.5 flex items-center text-[13px] font-sans text-[#5F5552]">
          <nav aria-label="Breadcrumb" className="flex items-center space-x-2 flex-wrap">
            <button onClick={() => onNavigate('/')} className="hover:text-[#780D24]">
              Home
            </button>
            <span className="text-[#B88A44]">&gt;</span>
            <span>Policies</span>
            <span className="text-[#B88A44]">&gt;</span>
            <span className="text-[#780D24] font-medium">{currentPolicy.breadcrumb}</span>
          </nav>
        </div>
      </section>

      {/* Horizontal Scrollable Tabs */}
      <section className="sticky top-16 z-30 bg-[#FBF7F0]/95 backdrop-blur-md border-b border-[#E8DDD6]">
        <div className="max-w-[760px] mx-auto px-4">
          <div
            role="tablist"
            className="flex items-center gap-2 overflow-x-auto py-3 no-scrollbar select-none whitespace-nowrap"
          >
            {(Object.keys(policies) as PolicyKey[]).map((key) => {
              const isActive = activeKey === key;
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveKey(key)}
                  className={`flex-shrink-0 px-4 py-2 text-[13px] sm:text-[14px] font-sans font-medium rounded transition-all duration-150 border ${
                    isActive
                      ? 'bg-[#780D24] text-white border-[#780D24] shadow-xs'
                      : 'bg-white border-[#E8DDD6] text-[#5F5552] hover:border-[#B88A44] hover:text-[#231919]'
                  }`}
                >
                  {policies[key].title}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Column */}
      <main className="max-w-[760px] w-full mx-auto px-4 py-6 md:py-10 space-y-6">
        {/* Header & Meta Section */}
        <div className="pb-6 border-b border-[#E8DDD6]">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block w-6 h-[1px] bg-[#B88A44]" />
            <span className="text-[11px] font-sans font-bold uppercase tracking-widest text-[#B88A44]">
              {currentPolicy.badge}
            </span>
          </div>
          <h1 className="font-serif text-[28px] sm:text-[34px] leading-tight text-[#231919] font-medium">
            {currentPolicy.title}
          </h1>

          {content.policies[activeKey]?.approved?<div className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed">{content.policies[activeKey].text}</div>:<><div className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 bg-[#F4EEE5] border border-[#B88A44]/40 rounded text-[11px]">Draft Document - Pending final client approval</div><p className="mt-4 text-[15px] text-[#5F5552]">Final policy terms are pending. Please contact us with any questions.</p></>}
        </div>

        {/* Compact Support Row */}
        <div className="p-5 bg-white border border-[#E8DDD6] rounded-xl shadow-xs text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4 font-sans">
          <div>
            <p className="text-[15px] font-semibold text-[#231919]">
              Need help with our policies?
            </p>
            <p className="text-[13px] text-[#5F5552] mt-0.5">
              WhatsApp:{' '}
              <a
                className="text-[#780D24] font-medium hover:underline"
                href={'https://wa.me/'+contact.mobile.replace('+','')}
                target="_blank"
                rel="noopener noreferrer"
              >
                {contact.mobile}
              </a>{' '}
              &nbsp;|&nbsp; Email:{' '}
              <a
                className="text-[#780D24] font-medium hover:underline"
                href={'mailto:'+contact.email}
              >
                {contact.email}
              </a>
            </p>
          </div>
          <a
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#780D24] text-white text-[13px] font-semibold rounded-lg hover:bg-[#5E091B] transition-colors shrink-0"
            href={'https://wa.me/'+contact.mobile.replace('+','')}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="material-symbols-outlined text-[16px]">chat</span>
            <span>WhatsApp Support</span>
          </a>
        </div>

        {/* Related Policies (Excludes current active) */}
        <div className="pt-6 border-t border-[#E8DDD6] space-y-3 font-sans">
          <h3 className="font-serif text-[18px] text-[#231919]">Other Policies</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {otherKeys.map((key) => {
              const item = policies[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setActiveKey(key);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-left p-3.5 bg-white border border-[#E8DDD6] rounded-lg hover:border-[#B88A44] hover:bg-[#FBF7F0] transition-all group"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#B88A44] block mb-1">
                    Policy
                  </span>
                  <div className="text-[14px] font-medium text-[#231919] group-hover:text-[#780D24] flex items-center justify-between">
                    <span>{item.title}</span>
                    <span className="material-symbols-outlined text-[16px] text-[#B88A44] opacity-0 group-hover:opacity-100 transition-opacity">
                      arrow_forward
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};
