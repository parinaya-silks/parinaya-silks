import React from 'react';

interface AboutViewProps {
  onNavigate: (path: string) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-6">
      {/* Clean Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-[12px] font-sans text-[#5F5552] flex items-center gap-1.5">
        <button onClick={() => onNavigate('/')} className="hover:text-[#780D24]">
          Home
        </button>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-[#231919] font-semibold">About Us</span>
      </nav>

      {/* Heading & Introduction */}
      <section className="space-y-2">
        <h1 className="font-serif text-[28px] sm:text-[36px] text-[#231919] font-medium tracking-tight leading-tight">
          About Parinaya Silks
        </h1>
        <p className="font-sans text-[15px] sm:text-[16px] text-[#5F5552] leading-relaxed">
          Discover sarees for celebrations, special occasions and everyday elegance.
        </p>
      </section>

      {/* Saree Photograph (~4:3 ratio with subtle border and shadow) */}
      <section>
        <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-[#E8DDD6] shadow-sm bg-white">
          <img
            src="https://lh3.googleusercontent.com/aida/AEtjO1WWb89xEHPaMRY7UWw_vRreP4eG4DkHD20JEzI2M_ZcPzkU-vjrJ-1JhOm7DBGy6cJx6R9w2o1Sd7rumSzUCf-zvPC7p8-Q-JoFPhmWgW7Q-Fg6WS7-yBQWEoE4U8aCbvrZG1oqOZzP0KurIPpnIS88te2iD083FdfetS4W-MedTChT-0BI2suALPQVhyWmr9RACAtbs4dpH345PR5Opmuz8NnbjyTLmQZSp27o9Pzha-PjrhRlZZNE6w"
            alt="Parinaya Silks authentic handwoven saree drape"
            className="w-full h-full object-cover object-center"
          />
        </div>
      </section>

      {/* Content Sections */}
      <div className="space-y-6 font-sans text-[15px] sm:text-[16px] text-[#5F5552] leading-relaxed">
        {/* Section: About the Store */}
        <section className="space-y-2">
          <h2 className="font-serif text-[22px] text-[#780D24] font-medium">
            About the Store
          </h2>
          <p>
            PARINAYA SILKS is based in Hyderabad, India. Browse our saree collection and contact us via WhatsApp or email for product information.
          </p>
        </section>

        {/* Section: Our Collection */}
        <section className="space-y-2">
          <h2 className="font-serif text-[22px] text-[#780D24] font-medium">
            Our Collection
          </h2>
          <p>
            Our curations embrace the spectrum of occasionwear and refined staples. From opulent bridal silks rich with heritage motifs to lightweight, graceful drapes crafted for celebrations and everyday elegance, each piece is selected for distinct craftsmanship and drape quality.
          </p>
        </section>

        {/* Section: Your Shopping Experience */}
        <section className="space-y-2">
          <h2 className="font-serif text-[22px] text-[#780D24] font-medium">
            Your Shopping Experience
          </h2>
          <p>
            We strive to make discovering sarees effortless and personal. Patrons can enjoy seamless digital browsing, supportive customer assistance, and secure, protective packaging designed to preserve every drape until it arrives at your doorstep.
          </p>
        </section>
      </div>

      {/* Actions */}
      <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
        <button
          onClick={() => onNavigate('/shop')}
          className="w-full sm:w-auto min-h-[44px] px-8 bg-[#780D24] hover:bg-[#5E091B] text-white rounded-lg font-sans text-[14px] font-semibold tracking-wider uppercase shadow-sm active:scale-95 transition-all"
        >
          Shop Sarees
        </button>
        <button
          onClick={() => onNavigate('/contact')}
          className="inline-flex items-center gap-1.5 text-[#780D24] hover:text-[#5E091B] font-sans text-[14px] font-semibold underline underline-offset-4 py-2"
        >
          <span>Contact Us</span>
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};
