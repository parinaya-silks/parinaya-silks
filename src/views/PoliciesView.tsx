import React, { useState, useEffect } from 'react';

type PolicyKey = 'shipping' | 'returns' | 'privacy' | 'terms';

interface PoliciesViewProps {
  initialTab?: PolicyKey;
  onNavigate: (path: string) => void;
}

export const PoliciesView: React.FC<PoliciesViewProps> = ({ initialTab = 'shipping', onNavigate }) => {
  const [activeKey, setActiveKey] = useState<PolicyKey>(initialTab);
  const [tocOpen, setTocOpen] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveKey(initialTab);
    }
  }, [initialTab]);

  const policies = {
    shipping: {
      title: 'Shipping Policy',
      badge: 'Customer Policy Document',
      breadcrumb: 'Shipping Policy',
      intro: 'Please review our order processing, dispatch schedules, and delivery guidelines applicable to all purchases made with Parinaya Silks, Hyderabad.',
      sections: [
        {
          num: '01',
          title: 'Delivery Regions',
          content: 'Parinaya Silks arranges fulfillment across serviceable postal codes in India. Consignments are packed securely to ensure safe transit from Hyderabad to your designated destination address.',
        },
        {
          num: '02',
          title: 'Dispatch Preparation',
          content: 'Each saree undergoes careful standard inspection and fabric packing prior to handoff for transit. Standard orders are prepared for dispatch within [Client-approved dispatch timeframe]. Customized services such as falls, edging, or tassel work may require additional processing business days prior to dispatch.',
        },
        {
          num: '03',
          title: 'Delivery Estimates',
          content: 'Estimated delivery windows depend upon recipient location and courier network timelines: [Client-approved shipping rates & delivery estimates]. Deliveries may occasionally experience delays during national holidays, weather disruptions, or local logistical contingencies.',
        },
        {
          num: '04',
          title: 'Shipping Charges',
          content: 'Standard applicable shipping fees or qualifying complimentary thresholds are detailed during checkout: [Client-approved shipping rates & delivery estimates]. Any applicable regional entry taxes or local cess levied in particular destinations remain as per statutory norms.',
        },
        {
          num: '05',
          title: 'Consignment Tracking',
          content: 'Once your package is handed over to the courier partner, tracking credentials will be shared via your registered WhatsApp contact number and email address. You may monitor shipment milestones directly via the courier tracking portal.',
        },
        {
          num: '06',
          title: 'Delivery Issues',
          content: 'In case of external package damage or significant transit discrepancies, please contact our support desk immediately with order details and parcel photographs so our team can investigate with the delivery partner promptly.',
        },
      ],
    },
    returns: {
      title: 'Returns & Exchanges',
      badge: 'Customer Support & Returns',
      breadcrumb: 'Returns & Exchanges',
      intro: 'We want you to be fully satisfied with your purchase. Please review our conditions for exchanges, eligibility criteria, and store credit procedures.',
      sections: [
        {
          num: '01',
          title: 'Eligibility',
          content: 'To qualify for an exchange or return evaluation, items must satisfy: [Client-approved returns terms]. Items must be unused, unpleated, unworn, and unwashed. Original attached product tags and initial packaging must be returned intact. Exchange requests must be submitted within the eligible timeframe from delivery date.',
        },
        {
          num: '02',
          title: 'Request Process',
          content: 'Patrons can initiate an exchange request through our official channels: Message our team via WhatsApp at +91 8367383073 or email parinayasilks.in@gmail.com with your Order ID. Share clear photographs or video showcasing the unpleated saree and tags. Our support desk will verify eligibility and coordinate reverse logistics or drop-off guidelines.',
        },
        {
          num: '03',
          title: 'Exceptions',
          content: 'The following categories are non-returnable and non-exchangeable: Customized orders, including sarees with stitched falls, hem edging, or cut blouse pieces; items marked as Final Sale or Clearance items; natural yarn slubs, minor handloom irregularities, and slight screen display color variations inherent to traditional textile weaving.',
        },
        {
          num: '04',
          title: 'Refund Information',
          content: 'Upon receipt and inspection of returned merchandise at Hyderabad, eligible exchanges or store credit notes will be issued in accordance with: [Client-approved returns terms].',
        },
        {
          num: '05',
          title: 'Support Contact',
          content: 'For all queries related to exchanges, size verifications, or fabric specifications, please reach out directly to our support desk via WhatsApp: +91 8367383073 or email: parinayasilks.in@gmail.com.',
        },
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      badge: 'Data Protection & Privacy',
      breadcrumb: 'Privacy Policy',
      intro: 'Parinaya Silks respects your privacy and is committed to protecting your personal information. Read our transparent privacy guidelines below.',
      sections: [
        {
          num: '01',
          title: 'Information Collected',
          content: 'Parinaya Silks collects details required to process, bill, and dispatch your orders safely: Contact details (Name, billing address, delivery address, phone number, and email); Order history, transaction references, and support communications; Device and browsing telemetry necessary for website reliability.',
        },
        {
          num: '02',
          title: 'How Information is Used',
          content: 'We use patron data exclusively for order fulfillment, dispatch tracking updates, customer support, and legitimate business operations: [Client-approved privacy & data handling practices]. We do not sell patron information to external marketing brokers.',
        },
        {
          num: '03',
          title: 'Service Providers',
          content: 'Necessary information is shared strictly with trusted operational vendors such as logistics couriers and certified payment gateways for checkout execution. Payment processing complies with standard banking encryption frameworks.',
        },
        {
          num: '04',
          title: 'Cookies & Analytics',
          content: 'We use standard cookies and lightweight analytics to maintain session continuity, shopping bag contents, and load responsiveness across mobile devices.',
        },
        {
          num: '05',
          title: 'Customer Choices',
          content: 'Customers may request updates, corrections, or deletion of their stored account details at any time by contacting our support team, subject to statutory tax and bookkeeping guidelines.',
        },
        {
          num: '06',
          title: 'Contact',
          content: 'For privacy inquiries or data rights requests, contact us at parinayasilks.in@gmail.com or via WhatsApp at +91 8367383073 (Hyderabad, India).',
        },
      ],
    },
    terms: {
      title: 'Terms & Conditions',
      badge: 'Storefront Terms of Service',
      breadcrumb: 'Terms & Conditions',
      intro: 'These Terms and Conditions govern access to and transactions placed on Parinaya Silks, Hyderabad. Please review before proceeding.',
      sections: [
        {
          num: '01',
          title: 'Website Use',
          content: 'By visiting or placing orders through Parinaya Silks, you agree to comply with our stated storefront guidelines and conditions of use: [Client-approved terms of service].',
        },
        {
          num: '02',
          title: 'Products & Availability',
          content: 'Handcrafted sarees may feature subtle variations in color, yarn texture, and weave characteristics: Photographic lighting and screen calibrations may produce minor variations in apparent color tones; handwoven saree quantities are limited and subject to availability at the time of checkout confirmation.',
        },
        {
          num: '03',
          title: 'Pricing & Payments',
          content: 'Prices are listed in Indian Rupees (INR) inclusive of applicable goods and services tax. In the event of an inadvertent typographical error or system pricing anomaly, Parinaya Silks reserves the right to notify the customer and rectify the order.',
        },
        {
          num: '04',
          title: 'Orders & Delivery',
          content: 'Orders are confirmed upon receipt of successful payment or verified authorization. Title passes upon delivery by our authorized courier partner.',
        },
        {
          num: '05',
          title: 'Policy References',
          content: 'These Terms & Conditions operate alongside our Shipping Policy, Returns & Exchanges, and Privacy Policy. Applicable jurisdiction is Hyderabad, India.',
        },
        {
          num: '06',
          title: 'Contact',
          content: 'Formal inquiries regarding legal governance can be sent to parinayasilks.in@gmail.com, Hyderabad, India.',
        },
      ],
    },
  };

  const currentPolicy = policies[activeKey];
  const otherKeys = (Object.keys(policies) as PolicyKey[]).filter((k) => k !== activeKey);

  return (
    <div className="pb-28">
      <p role="note" className="bg-amber-50 text-amber-950 border-b border-amber-200 p-4 text-sm text-center">Draft policy preview. Shipping charges, dispatch estimates and final policy terms require business approval.</p>
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

          {/* Draft Annotation Badge */}
          <div className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 bg-[#F4EEE5] border border-[#B88A44]/40 rounded text-[11px] font-sans text-[#5F5552]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B88A44]" />
            <span>Draft Document • Pending final client approval</span>
          </div>

          <p className="mt-4 text-[15px] sm:text-[16px] leading-relaxed text-[#5F5552] font-sans">
            {currentPolicy.intro}
          </p>
        </div>

        {/* Section Jump Dropdown */}
        <div className="bg-white border border-[#E8DDD6] rounded-lg p-3 shadow-xs">
          <details className="group" open={tocOpen} onToggle={(e) => setTocOpen(e.currentTarget.open)}>
            <summary className="flex justify-between items-center cursor-pointer list-none py-1 text-[14px] font-sans font-semibold text-[#780D24]">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">format_list_numbered</span>
                <span>On this page (Jump to section)</span>
              </span>
              <span className="material-symbols-outlined text-[20px] transition-transform duration-200 group-open:rotate-180 text-[#5F5552]">
                expand_more
              </span>
            </summary>
            <div className="pt-3 mt-2 border-t border-[#F4EEE5] flex flex-col space-y-1.5 text-[13px] font-sans">
              {currentPolicy.sections.map((sec) => (
                <a
                  key={sec.num}
                  href={`#sec-${sec.num}`}
                  className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-[#F4EEE5] text-[#5F5552] hover:text-[#780D24]"
                >
                  <span className="text-[#B88A44] font-medium font-serif text-[12px]">{sec.num}.</span>
                  <span>{sec.title}</span>
                </a>
              ))}
            </div>
          </details>
        </div>

        {/* Policy Sections */}
        <article className="space-y-8 font-sans">
          {currentPolicy.sections.map((sec, index) => (
            <div key={sec.num} id={`sec-${sec.num}`} className="scroll-mt-36 space-y-2">
              <div className="flex items-baseline gap-2.5">
                <span className="font-serif text-[20px] font-medium text-[#B88A44]">{sec.num}.</span>
                <h2 className="font-serif text-[20px] text-[#231919] font-medium">{sec.title}</h2>
              </div>
              <p className="text-[15px] sm:text-[16px] leading-relaxed text-[#5F5552]">
                {sec.content}
              </p>
              {index < currentPolicy.sections.length - 1 && (
                <hr className="border-[#E8DDD6] pt-6" />
              )}
            </div>
          ))}
        </article>

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
                href="https://wa.me/918367383073"
                target="_blank"
                rel="noopener noreferrer"
              >
                +91 8367383073
              </a>{' '}
              &nbsp;|&nbsp; Email:{' '}
              <a
                className="text-[#780D24] font-medium hover:underline"
                href="mailto:parinayasilks.in@gmail.com"
              >
                parinayasilks.in@gmail.com
              </a>
            </p>
          </div>
          <a
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#780D24] text-white text-[13px] font-semibold rounded-lg hover:bg-[#5E091B] transition-colors shrink-0"
            href="https://wa.me/918367383073"
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
