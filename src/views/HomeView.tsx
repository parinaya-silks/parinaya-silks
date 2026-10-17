import React from 'react';
import type { Product } from '../types/index.ts';

interface HomeViewProps {
  products: Product[];
  onNavigate: (path: string) => void;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (product: Product) => void;
  isWishlisted: (productId: string) => boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => <div className="space-y-6">
  <section className="relative w-full h-[320px] sm:h-[400px] md:h-[460px] overflow-hidden bg-[#231919]">
    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuD1qazM7x4nhlG1x9i7OeRv-PA2gwVUK0YEvgjjHfggLsNBmD7v4_s6_Ju3GFF2UX8VwSqUhgA6hjB2yKiXmeH8x49xLYO2bMNpOWluOq0xi0J5sc6zBZHsXkh3fJgu918qXJ2swSyL-K3KGZR2dy_F8met0_2MhWF4mK_85TuGriJvGlc7lmsFVlpW4uFuPLZ8TD_7w5rVhExoJRtQaZRvr1jXu-ttryDRcUd8ImkPfhbZjpOIvPs')` }} />
    <div className="absolute inset-0 bg-gradient-to-t from-[#231919] via-[#231919]/60 to-transparent" />
    <div className="absolute inset-0 p-4 sm:p-8 flex flex-col justify-end text-white max-w-4xl mx-auto">
      <h1 className="font-serif text-[24px] sm:text-[34px] md:text-[40px] leading-tight font-medium">PARINAYA SILKS</h1>
      <p className="font-sans text-[13px] sm:text-[15px] text-[#E7DFD5] mt-2">Hyderabad, India</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={() => onNavigate('/shop')} className="min-h-11 px-5 bg-[#780D24] text-white border border-[#B88A44] rounded-lg text-sm font-semibold hover:bg-[#5E091B] transition-colors">Shop Sarees</button>
        <button onClick={() => onNavigate('/contact')} className="min-h-11 px-5 border border-[#B88A44] rounded-lg text-sm hover:bg-white/10 transition-colors">Contact Us</button>
      </div>
    </div>
  </section>
  <section className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
    <h2 className="font-serif text-[22px] sm:text-[26px] text-[#780D24] font-semibold pb-3 border-b border-[#E8DDD6]">Our Collection</h2>
    <div className="py-7 text-center space-y-3">
      <p className="text-sm text-[#5F5552]">No products available yet.</p>
      <button onClick={() => onNavigate('/contact')} className="min-h-11 px-5 text-[#780D24] underline underline-offset-4">Contact Us</button>
    </div>
  </section>
</div>;
