import React, { useState, useEffect } from 'react';
import { Product } from '../types/index.ts';
import { formatINR } from '../utils/pricing.ts';

interface HomeViewProps {
  products: Product[];
  onNavigate: (path: string) => void;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (product: Product) => void;
  isWishlisted: (productId: string) => boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  products,
  onNavigate,
  onAddToCart,
  onToggleWishlist,
  isWishlisted,
}) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const heroSlides = [
    {
      title: 'The Festive Heirloom Weaves',
      subtitle: 'Handcrafted pure silk sarees directly from loom master weavers.',
      tag: 'Authentic Heritage Handlooms',
      quote: '"Every saree has a story."',
      bg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD1qazM7x4nhlG1x9i7OeRv-PA2gwVUK0YEvgjjHfggLsNBmD7v4_s6_Ju3GFF2UX8VwSqUhgA6hjB2yKiXmeH8x49xLYO2bMNpOWluOq0xi0J5sc6zBZHsXkh3fJgu918qXJ2swSyL-K3KGZR2dy_F8met0_2MhWF4mK_85TuGriJvGlc7lmsFVlpW4uFuPLZ8TD_7w5rVhExoJRtQaZRvr1jXu-ttryDRcUd8ImkPfhbZjpOIvPs',
      cta: 'Shop Festive Edit',
      link: '/shop?category=Kanjeevaram',
    },
    {
      title: 'Royal Bridal Kanjeevarams',
      subtitle: 'Pure mulberry silk woven with tested antique gold zari.',
      tag: 'Bridal Sanctum',
      quote: '"Timeless Muhurtham Grace"',
      bg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBffg8a44vmr6hkzcfyRVsVeXdb-nDpvTa0t0QGXPu809kS-XdAHve-TmxJasxv2T7fTTrh5yMO_K_XAhiEFQsO88W5fynn51SSuh50gBWl4nzrjhsltuCf09tbE26YMqVUcGOgmRHIWwcHsunyUvQ7uNhemGu3q8-rN8BVJal6ZeMmN22lixjyovODgGPhrJNjNwyG7cvl9j8PI0RulxpZY9A0vKM8PsNDcdLSszVLxKX74sLDBWI',
      cta: 'Explore Bridal',
      link: '/shop?category=Kanjeevaram',
    },
    {
      title: 'Wild Tussar & Lightweight Organzas',
      subtitle: 'Effortless festive elegance for daytime celebrations.',
      tag: 'Featherlight Splendor',
      quote: '"Airy luxury drapes"',
      bg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCw2KZTVfjvjHaNNymS7jn0rc8jama-JprJ1gjOeJ4ZIJhrHrmiIp9GHqWytT9MBlZpS1MXsgNOqb1aNANTA8Yv_YJxB8kBO6kuW2OSbe8Uiq5qyeP8sS55ip7YaTF2fjLVYBy7_IUogQ6dcidngCGaUAmKC48wemG0qBi4E2-dX5yjvQskyoTN2dEtmlT8EF_8oX49SsToNacLkFtpisev1NTc0McU_WT7xo8ltFbGz20-6bPEoT0',
      cta: 'Discover Weaves',
      link: '/shop?category=Tussar',
    },
  ];

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPlaying, heroSlides.length]);

  const collections = [
    {
      name: 'Kanjeevaram',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuASkHvsMwFmx_Jg_2jjCVaA1bvYZd4PDVVPVd_zFUZj8BZN04p5CHYuslzE_fCkQBPDGhyHmTtGXuNVvQF2K9GeNefu_knQgmTbIM4Sp9v2Czhfb6hpKwmLBQ9eVuIXe0QlnKk-Yfo82-M48BBwoJYxmNhY9pw-o6SKNC-1Xh-y_xQ2LBzfJN3CJTTKZHSC6eWhUVhfvw2MrLurV0dycQLHPYZPZ3OdeDUljE_AUOpwGkgVGUNOMek',
      category: 'Kanjeevaram',
    },
    {
      name: 'Tussar Silk',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA6X5LUNHRujXk-MMO-IMAbPvzlQ8ioJu78u9DM0KlUamxPlXzGmsTORs0MahWEE0ZOCNaZDgnKJQ8qIuN-yo5xw8qjgMdPzjpHDfycm4BsPfVGEhInoVowtPeWQTyVWZx8Y6XHRy1tomqXun-0dF1Y5zofUXc7XZtyTKYpHlbrW4chxtIRcclKJTCSzpj4qwlUhwGWFC1ZRDKwufuChrQbZwW2CZLUfJD0UJq1QdcDPTvc9CacJFc',
      category: 'Tussar',
    },
    {
      name: 'Pure Organza',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCw2KZTVfjvjHaNNymS7jn0rc8jama-JprJ1gjOeJ4ZIJhrHrmiIp9GHqWytT9MBlZpS1MXsgNOqb1aNANTA8Yv_YJxB8kBO6kuW2OSbe8Uiq5qyeP8sS55ip7YaTF2fjLVYBy7_IUogQ6dcidngCGaUAmKC48wemG0qBi4E2-dX5yjvQskyoTN2dEtmlT8EF_8oX49SsToNacLkFtpisev1NTc0McU_WT7xo8ltFbGz20-6bPEoT0',
      category: 'Organza',
    },
    {
      name: 'Mangalagiri',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDDmbdn5sT_KQgPUUYUXcquOzFZdrR6jLbiT94rsjyqsojBtherHu6nED7JxcDGMVrPs4KA1OoX5G36kqRyh6zraUfUbwhsF18cgGAJT_Jn_c66GOJhevoexDCuCpIc-eDJgdSDnvfLFz_4dZ0IICLCwto11NiEFulD6qdB9r4rPXq8JtfaMbvgmsPdAEw7OS3xkvv5i7xEuU86kD7EuxyPfWPGqqYZxn52c4dp9EFEKRZdDsXEbxg',
      category: 'Mangalagiri',
    },
    {
      name: 'Banarasi',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCSwkHQCgnVxEAhyxUIQ-2W5jm1E8THcmMCDyfgEhGnv3-UK36dwV6mmc9aDy_OqQqJta107U_4LHuJSX9J66PQ6v7heC881piOdg8KfVnrZKMTiniET9oIZ72tRcYdHYCRZu6m1mJ_W7oR_RWqJkPXOF2HLnBI1uK7cU0826q8yEkDXxib8Ab-E0tAoPjtRM8JQ8Zs7r0525UPvndSWHwnZ6QkSKQX5m4v_kCwUNz7rn1KHxtd5Jk',
      category: 'Banarasi',
    },
  ];

  const newArrivals = products.filter((p) => p.status === 'Published').slice(0, 4);

  return (
    <div className="space-y-6">
      {/* 1. Editorial Saree Hero Banner */}
      <section className="relative w-full h-[320px] sm:h-[400px] md:h-[460px] overflow-hidden bg-[#231919]">
        {heroSlides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${slide.bg}')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#231919] via-[#231919]/60 to-transparent" />

            <div className="absolute inset-0 p-4 sm:p-8 flex flex-col justify-end text-white z-10 max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-1.5 bg-[#780D24]/90 backdrop-blur-sm px-2.5 py-1 rounded-sm border border-[#B88A44]/60 self-start mb-2">
                <span className="material-symbols-outlined text-[14px] text-[#F2BE72] fill">
                  verified
                </span>
                <span className="font-sans text-[10px] text-[#FFDDB1] tracking-wider uppercase font-semibold">
                  {slide.tag}
                </span>
              </div>
              <h1 className="font-serif text-[24px] sm:text-[34px] md:text-[40px] leading-tight text-white font-medium drop-shadow-sm max-w-xl">
                {slide.title}
              </h1>
              <p className="font-sans text-[13px] sm:text-[15px] text-[#E7DFD5] line-clamp-1 mt-1 max-w-lg">
                {slide.subtitle}
              </p>
              <div className="mt-4 flex items-center justify-between gap-4">
                <button
                  onClick={() => onNavigate(slide.link)}
                  className="inline-flex items-center gap-2 bg-[#780D24] text-white border border-[#B88A44] px-4 sm:px-6 py-2.5 rounded-lg font-sans text-[12px] sm:text-[13px] font-semibold tracking-wider uppercase hover:bg-[#5E091B] transition-all shadow-md active:scale-95"
                >
                  <span>{slide.cta}</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
                <span className="italic font-serif text-[12px] sm:text-[14px] text-[#F2BE72]/90 hidden sm:inline">
                  {slide.quote}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Carousel Indicators & Pause */}
        <div className="absolute bottom-3 right-4 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">
          <div className="flex items-center gap-1.5">
            {heroSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === activeSlide ? 'w-5 bg-[#B88A44]' : 'w-1.5 bg-white/60'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="text-white/80 hover:text-white flex items-center pl-1"
            aria-label={isPlaying ? 'Pause slider' : 'Play slider'}
          >
            <span className="material-symbols-outlined text-[14px]">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
        </div>
      </section>

      {/* 2. Shop By Collection Shortcuts */}
      <section className="pt-2 pb-3 bg-white border-y border-[#E8DDD6]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-sans text-[11px] uppercase tracking-wider text-[#780D24] font-bold">
              Shop By Collection
            </h2>
            <span className="font-sans text-[10px] text-[#5F5552]">Swipe for more →</span>
          </div>
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-1">
            {collections.map((col) => (
              <button
                key={col.name}
                onClick={() => onNavigate(`/shop?category=${col.category}`)}
                className="flex flex-col items-center flex-shrink-0 group"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-[#B88A44]/60 overflow-hidden shadow-xs group-hover:border-[#780D24] transition-all p-0.5 bg-[#FBF7F0]">
                  <img
                    src={col.image}
                    alt={col.name}
                    className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <span className="mt-1.5 text-[11px] sm:text-[12px] font-sans text-[#231919] font-medium tracking-tight group-hover:text-[#780D24]">
                  {col.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Heirloom Provenance Assurance Strip */}
      <section className="bg-[#FBF7F0] border-b border-[#E8DDD6] py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-center divide-x divide-[#E8DDD6]">
          <div className="flex-1 px-1 flex flex-col items-center">
            <span className="material-symbols-outlined text-[18px] text-[#780D24] fill">
              workspace_premium
            </span>
            <span className="font-sans text-[10px] sm:text-[11px] text-[#5F5552] uppercase mt-0.5 font-semibold">
              Silk Mark Certified
            </span>
          </div>
          <div className="flex-1 px-1 flex flex-col items-center">
            <span className="material-symbols-outlined text-[18px] text-[#780D24] fill">
              diamond
            </span>
            <span className="font-sans text-[10px] sm:text-[11px] text-[#5F5552] uppercase mt-0.5 font-semibold">
              Pure Gold Zari
            </span>
          </div>
          <div className="flex-1 px-1 flex flex-col items-center">
            <span className="material-symbols-outlined text-[18px] text-[#780D24] fill">
              shield_with_heart
            </span>
            <span className="font-sans text-[10px] sm:text-[11px] text-[#5F5552] uppercase mt-0.5 font-semibold">
              Insured Pan-India
            </span>
          </div>
        </div>
      </section>

      {/* 4. New Arrivals: 2-Column Mobile / 4-Column Desktop Product Grid */}
      <section className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-baseline justify-between mb-4 pb-2 border-b border-[#E8DDD6]">
          <div>
            <h2 className="font-serif text-[22px] sm:text-[26px] text-[#780D24] font-semibold">
              New Arrivals
            </h2>
            <p className="font-sans text-[13px] text-[#5F5552]">Fresh off the artisan handlooms</p>
          </div>
          <button
            onClick={() => onNavigate('/shop')}
            className="font-sans text-[12px] text-[#780D24] font-bold flex items-center gap-0.5 hover:underline"
          >
            <span>View All</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {newArrivals.map((product) => {
            const wishlisted = isWishlisted(product.id);
            return (
              <article
                key={product.id}
                className="group bg-white rounded-lg border border-[#E8DDD6] overflow-hidden flex flex-col transition-all hover:border-[#B88A44] shadow-xs hover:shadow-sm"
              >
                {/* 3:4 Aspect Ratio Image Box */}
                <div
                  className="relative w-full aspect-[3/4] bg-[#F4EEE5] overflow-hidden cursor-pointer"
                  onClick={() => onNavigate(`/product/${product.id}`)}
                >
                  <img
                    src={product.images.full}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                  <span className="absolute top-2 left-2 bg-[#FBF7F0]/90 backdrop-blur-xs text-[#231919] border border-[#B88A44]/50 text-[9px] font-semibold px-2 py-0.5 rounded uppercase font-sans tracking-wider">
                    {product.categoryLabel}
                  </span>

                  {/* Wishlist Heart Toggle Button */}
                  <button
                    aria-label={`Save ${product.name} to wishlist`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleWishlist(product);
                    }}
                    className="absolute top-2 right-2 w-8 h-8 bg-white/85 backdrop-blur-sm rounded-full flex items-center justify-center text-[#780D24] active:scale-90 transition-transform shadow-xs"
                    type="button"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${wishlisted ? 'fill text-[#780D24]' : ''}`}>
                      favorite
                    </span>
                  </button>

                  {product.discountPercent && (
                    <div className="absolute bottom-2 left-2 bg-[#780D24] text-white text-[9px] font-semibold px-1.5 py-0.5 rounded font-sans uppercase">
                      SALE {product.discountPercent}% OFF
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3
                      onClick={() => onNavigate(`/product/${product.id}`)}
                      className="font-serif text-[14px] leading-snug line-clamp-2 text-[#231919] cursor-pointer hover:text-[#780D24] transition-colors"
                    >
                      {product.name}
                    </h3>
                    <p className="font-sans text-[11px] text-[#5F5552] mt-1 line-clamp-1">
                      {product.subtitle}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-[#F4EEE5]">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-sans text-[16px] font-bold text-[#780D24]">
                        {formatINR(product.price)}
                      </span>
                      {product.originalPrice && (
                        <span className="text-[11px] text-[#5F5552] line-through">
                          {formatINR(product.originalPrice)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onAddToCart(product)}
                      disabled={!product.inStock}
                      className={`w-full mt-2.5 py-2 rounded text-[11px] font-semibold tracking-wider uppercase font-sans flex items-center justify-center gap-1 active:scale-95 duration-150 transition-colors ${
                        product.inStock
                          ? 'bg-[#780D24] hover:bg-[#5E091B] text-white'
                          : 'bg-[#E8DDD6] text-[#5F5552] cursor-not-allowed'
                      }`}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {product.inStock ? 'shopping_bag' : 'do_not_disturb'}
                      </span>
                      <span>{product.inStock ? 'Add To Bag' : 'Sold Out'}</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 5. Occasion Curations: Asymmetric Feature Cards */}
      <section className="max-w-7xl mx-auto px-4 py-6 bg-[#F4EEE5]/60 border-y border-[#E8DDD6]">
        <div className="mb-4">
          <span className="font-sans text-[10px] text-[#B88A44] uppercase tracking-widest font-bold">
            Bespoke Ensembles
          </span>
          <h2 className="font-serif text-[22px] sm:text-[26px] text-[#780D24] font-semibold">
            Occasion Curations
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Bridal Muhurtham */}
          <div
            onClick={() => onNavigate('/shop?category=Kanjeevaram')}
            className="relative h-32 sm:h-40 rounded-lg overflow-hidden border border-[#E8DDD6] flex items-center group cursor-pointer"
          >
            <div
              className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
              style={{
                backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBffg8a44vmr6hkzcfyRVsVeXdb-nDpvTa0t0QGXPu809kS-XdAHve-TmxJasxv2T7fTTrh5yMO_K_XAhiEFQsO88W5fynn51SSuh50gBWl4nzrjhsltuCf09tbE26YMqVUcGOgmRHIWwcHsunyUvQ7uNhemGu3q8-rN8BVJal6ZeMmN22lixjyovODgGPhrJNjNwyG7cvl9j8PI0RulxpZY9A0vKM8PsNDcdLSszVLxKX74sLDBWI')`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#231919] via-[#231919]/75 to-transparent" />
            <div className="relative z-10 px-5 text-white">
              <span className="font-sans text-[10px] uppercase text-[#F2BE72] tracking-wider font-semibold">
                The Royal Wedding Suite
              </span>
              <h3 className="font-serif text-[18px] sm:text-[20px] text-white font-medium">
                Bridal Muhurtham
              </h3>
              <p className="font-sans text-[12px] text-[#E7DFD5] mt-0.5">
                Pure silk weaves with heirloom provenance
              </p>
            </div>
            <span className="material-symbols-outlined text-white absolute right-4 text-[22px] group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </div>

          {/* Card 2: Festive Pookalam */}
          <div
            onClick={() => onNavigate('/shop?category=Banarasi')}
            className="relative h-32 sm:h-40 rounded-lg overflow-hidden border border-[#E8DDD6] flex items-center group cursor-pointer"
          >
            <div
              className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
              style={{
                backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBGJy0vqDj58QQSttIrwjfbx2hcR5a4etvl6nbVLsDu9l38qkRI3yKV3KLhHHxlHIGwMEo1jN6s_omSueXalk4lj3LeaN7_Vw1ZcujZBXeOErpzgVvBrCzlU7we9DoyRDZA7EjH07UGihJVrurmLQJvgH254ag_Y8iAyEFTCkzEShl7dl5bFX6FOv0mjVw9OU-alnm0imGHB-9PJJXbNMVF1KdvjHqXp-YbDk2KVclAZJVJY3aCVgs')`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#231919] via-[#231919]/75 to-transparent" />
            <div className="relative z-10 px-5 text-white">
              <span className="font-sans text-[10px] uppercase text-[#F2BE72] tracking-wider font-semibold">
                Pooja &amp; Traditions
              </span>
              <h3 className="font-serif text-[18px] sm:text-[20px] text-white font-medium">
                Festive Pookalam
              </h3>
              <p className="font-sans text-[12px] text-[#E7DFD5] mt-0.5">
                Vibrant hues for auspicious gatherings
              </p>
            </div>
            <span className="material-symbols-outlined text-white absolute right-4 text-[22px] group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </div>

          {/* Card 3: Reception Cocktails */}
          <div
            onClick={() => onNavigate('/shop?category=Organza')}
            className="relative h-32 sm:h-40 rounded-lg overflow-hidden border border-[#E8DDD6] flex items-center group cursor-pointer"
          >
            <div
              className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
              style={{
                backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuAD36RHhhRVNNMB7SW3E92aLbpRhCSmDZKe9nqRM80pDF-J2hjqbvWZBHvVERtOZhpZkgMjt17EJIEqZ0dPLYs6iNI3e957s4a9WETFlyJInM-ZGWlFhR0aN6yS_Wjbogj0O0ouPNXh28cDthq5NizJJ9TNJy39GkVMUPkUkhylhv7NK2DeHZArYHqzhQF3nAepSZ1m75GdQQ2wi6-t2d78zqXsVL1C2LNSC4LO53vZPUy1-5IkiEw')`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#231919] via-[#231919]/75 to-transparent" />
            <div className="relative z-10 px-5 text-white">
              <span className="font-sans text-[10px] uppercase text-[#F2BE72] tracking-wider font-semibold">
                Modern Glamour
              </span>
              <h3 className="font-serif text-[18px] sm:text-[20px] text-white font-medium">
                Reception Cocktails
              </h3>
              <p className="font-sans text-[12px] text-[#E7DFD5] mt-0.5">
                Effortless tissue organzas &amp; pastel zaris
              </p>
            </div>
            <span className="material-symbols-outlined text-white absolute right-4 text-[22px] group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </div>
        </div>
      </section>

      {/* 6. Curator's Spotlight: The Royal Temple Border Weaves */}
      <section className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-[#780D24] text-white rounded-xl p-5 sm:p-8 border border-[#B88A44]/50 shadow-md">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="w-full md:w-1/2 aspect-[16/9] rounded-lg overflow-hidden border border-[#B88A44]/60 relative shadow-inner">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD1qazM7x4nhlG1x9i7OeRv-PA2gwVUK0YEvgjjHfggLsNBmD7v4_s6_Ju3GFF2UX8VwSqUhgA6hjB2yKiXmeH8x49xLYO2bMNpOWluOq0xi0J5sc6zBZHsXkh3fJgu918qXJ2swSyL-K3KGZR2dy_F8met0_2MhWF4mK_85TuGriJvGlc7lmsFVlpW4uFuPLZ8TD_7w5rVhExoJRtQaZRvr1jXu-ttryDRcUd8ImkPfhbZjpOIvPs"
                alt="Royal Temple Border Weave"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2.5 left-3 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded text-[11px] font-sans text-[#F2BE72] border border-white/10">
                Handwoven Korvai Technique
              </div>
            </div>

            <div className="w-full md:w-1/2 space-y-3">
              <div className="flex items-center gap-1.5 text-[#F2BE72]">
                <span className="material-symbols-outlined text-[18px]">stars</span>
                <span className="font-sans text-[11px] uppercase tracking-widest font-semibold text-[#FFDDB1]">
                  Curator&apos;s Spotlight
                </span>
              </div>
              <h2 className="font-serif text-[24px] sm:text-[28px] text-white font-medium leading-tight">
                The Royal Temple Border Weaves
              </h2>
              <p className="font-sans text-[14px] text-[#E7DFD5] leading-relaxed">
                Reviving ancient Chola dynasty temple architectural motifs handwoven with heritage Korvai interlocking techniques. Each warp is meticulously linked by hand on traditional pit looms.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => onNavigate('/shop?category=Kanjeevaram')}
                  className="inline-flex items-center gap-2 bg-[#B88A44] hover:bg-[#d4a856] text-[#231919] px-5 py-2.5 rounded-lg font-sans text-[12px] font-bold tracking-wider uppercase transition-colors shadow-sm active:scale-95"
                >
                  <span>Explore Collection</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
                <span className="font-sans text-[11px] uppercase tracking-wider text-[#FFDDB1]/80">
                  Limited Looms Available
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Hyderabad Atelier Brand Note Section */}
      <section className="max-w-3xl mx-auto px-4 py-4 text-center">
        <div className="border border-[#B88A44]/40 bg-white p-6 rounded-xl shadow-xs relative">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#F4EEE5] flex items-center justify-center text-[#780D24] mb-3 border border-[#E8DDD6]">
            <span className="material-symbols-outlined text-[24px]">auto_awesome</span>
          </div>
          <h2 className="font-serif text-[20px] sm:text-[24px] text-[#780D24] font-medium mb-1.5">
            Woven with grace in Hyderabad
          </h2>
          <p className="font-sans text-[14px] text-[#5F5552] max-w-md mx-auto leading-relaxed">
            Pan-India insured delivery. 100% genuine silk certified directly from the loom master craftsmen.
          </p>
          <div className="mt-5 pt-4 border-t border-[#E8DDD6] flex items-center justify-center gap-6 text-[#5F5552] text-[12px] font-sans">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#B88A44]">verified</span>
              100% Handloom
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#B88A44]">local_shipping</span>
              Insured Transit
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#B88A44]">video_call</span>
              Video Atelier
            </span>
          </div>
        </div>
      </section>

      {/* Floating WhatsApp pill button */}
      <a
        href="https://wa.me/918367383073?text=Namaste%20Parinaya%20Silks,%20I%20would%20like%20to%20inquire%20about%20your%20saree%20curations."
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp with Atelier"
        className="fixed bottom-20 right-4 z-40 bg-[#25D366] text-white p-3 rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-150 border-2 border-white"
      >
        <span className="material-symbols-outlined text-[24px]">chat</span>
      </a>
    </div>
  );
};
