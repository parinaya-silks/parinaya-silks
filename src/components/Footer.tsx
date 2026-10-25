import {BrandLogo} from './BrandLogo.tsx';
import {FooterTextCopy} from '../content/TextCopy.tsx';
import {useStoreContent,usePublicContact} from '../content/public.tsx';
import React from 'react';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const contact=usePublicContact(),{content}=useStoreContent();
  return (
    <footer className="bg-[#231919] text-[#E7DFD5] mt-16 pt-12 pb-28 border-t border-[#3A2D2D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-[#3A2D2D]">
          {/* Col 1: Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <BrandLogo className="w-8 h-8" decorative/>
              <span className="font-serif text-[17px] tracking-wider uppercase text-white font-medium">
                PARINAYA SILKS
              </span>
            </div>
            <FooterTextCopy value={content.textSections?.['footer-brand']}/><p className="text-[13px] text-[#C4B7AC] leading-relaxed">
              {contact.address}
            </p>
            <div className="pt-2 text-[13px] space-y-1.5 text-[#C4B7AC]">
              <p>
                WhatsApp:{' '}
                <a
                  className="text-[#F2BE72] hover:underline"
                  href={'https://wa.me/'+contact.mobile.replace('+','')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {contact.mobile}
                </a>
              </p>
              <p>
                Email:{' '}
                <a
                  className="text-[#F2BE72] hover:underline"
                  href={'mailto:'+contact.email}
                >
                  {contact.email}
                </a>
              </p>
              <p>
                Instagram:{' '}
                <a
                  className="text-[#F2BE72] hover:underline"
                  href={contact.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {new URL(contact.instagram).pathname.replaceAll('/','')}
                </a>
              </p>
            </div>
          </div>

          {/* Col 2: Explore Link Group */}
          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-widest text-[#F2BE72] mb-3">
              Explore
            </h4>
            <ul className="space-y-2 text-[13px] text-[#C4B7AC]">
              <li>
                <button
                  onClick={() => onNavigate('/about')}
                  className="hover:text-white transition-colors text-left"
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/shop')}
                  className="hover:text-white transition-colors text-left"
                >
                  Shop Sarees
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/contact')}
                  className="hover:text-white transition-colors text-left"
                >
                  Contact Us
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/account')}
                  className="hover:text-white transition-colors text-left"
                >
                  My Account
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Policies & Terms Group */}
          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-widest text-[#F2BE72] mb-3">
              Policies &amp; Terms
            </h4>
            <ul className="space-y-2 text-[13px] text-[#C4B7AC]">
              <li>
                <button
                  onClick={() => onNavigate('/policies?tab=shipping')}
                  className="hover:text-white transition-colors text-left"
                >
                  Shipping Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/policies?tab=returns')}
                  className="hover:text-white transition-colors text-left"
                >
                  Returns &amp; Exchanges
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/policies?tab=privacy')}
                  className="hover:text-white transition-colors text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/policies?tab=terms')}
                  className="hover:text-white transition-colors text-left"
                >
                  Terms &amp; Conditions
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Location Notice & 100% Online Payments */}
          <div className="space-y-3">
            <div>
              <h4 className="text-[12px] font-semibold uppercase tracking-widest text-[#F2BE72] mb-2">
                Location
              </h4>
              <FooterTextCopy value={content.textSections?.['footer-support']} fallback="Hyderabad, India. For order verifications, dispatch status, or assistance, contact our team directly via WhatsApp or email."/>
            </div>
            <div className="p-3 bg-black/40 rounded border border-[#B88A44]/30 text-[11px] text-[#C4B7AC] space-y-1">
              <span className="font-semibold text-[#F2BE72] uppercase tracking-wider block">
                Shopping assistance
              </span>
              <p>For product information or assistance, please contact us via WhatsApp or email.</p>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row justify-between items-center text-[12px] text-[#9E9086] gap-3">
          <div>
            © {new Date().getFullYear()} PARINAYA SILKS. All rights reserved.
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => onNavigate('/policies?tab=privacy')}
              className="hover:text-white transition-colors"
            >
              Privacy
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigate('/policies?tab=terms')}
              className="hover:text-white transition-colors"
            >
              Terms
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigate('/policies?tab=shipping')}
              className="hover:text-white transition-colors"
            >
              Shipping
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigate('/policies?tab=returns')}
              className="hover:text-white transition-colors"
            >
              Returns
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
