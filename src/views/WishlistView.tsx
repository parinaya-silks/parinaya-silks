import React, { useState } from 'react';
import { WishlistItem, Product } from '../types/index.ts';
import { formatINR } from '../utils/pricing.ts';

interface WishlistViewProps {
  wishlist: WishlistItem[];
  onNavigate: (path: string) => void;
  onAddToCart: (product: Product, quantity?: number, selectedColor?: string) => void;
  onRemoveFromWishlist: (productId: string) => WishlistItem | undefined;
  isInCart: (productId: string) => boolean;
}

export const WishlistView: React.FC<WishlistViewProps> = ({
  wishlist,
  onNavigate,
  onAddToCart,
  onRemoveFromWishlist,
  isInCart,
}) => {
  const [removedItem, setRemovedItem] = useState<{ id: string; name: string } | null>(null);
  const [variantSheetProduct, setVariantSheetProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [demoState, setDemoState] = useState<'default' | 'empty' | 'signedout'>('default');

  const handleAdd = (product: Product) => {
    setAddingId(product.id);
    setTimeout(() => {
      onAddToCart(product);
      setAddingId(null);
    }, 400);
  };

  const handleRemove = (productId: string, name: string) => {
    onRemoveFromWishlist(productId);
    setRemovedItem({ id: productId, name });
    setTimeout(() => {
      setRemovedItem(null);
    }, 5000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'My PARINAYA SILKS Wishlist',
          text: 'Explore my heirloom bridal saree curation at Parinaya Silks.',
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert('Wishlist link copied to clipboard!');
    }
  };

  const currentWishlist = demoState === 'empty' ? [] : wishlist;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-5">
      {/* Undo Toast Notification */}
      {removedItem && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#231919] text-white px-4 py-3 rounded-lg shadow-xl flex items-center justify-between gap-4 border border-[#E8DDD6]/20">
          <span className="text-[13px] font-sans truncate max-w-[200px]">
            {removedItem.name} removed
          </span>
          <button
            onClick={() => {
              setRemovedItem(null);
            }}
            className="text-[12px] font-bold text-[#F2BE72] uppercase tracking-wider hover:underline"
          >
            Undo
          </button>
        </div>
      )}

      {/* Subheader Row: Title, Count Pill & Share */}
      <div className="flex items-center justify-between border-b border-[#E8DDD6] pb-3">
        <div className="flex items-baseline gap-2.5">
          <h1 className="font-serif text-[22px] sm:text-[28px] text-[#231919] font-medium">
            My Wishlist
          </h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#F4EEE5] text-[#5F5552] font-sans text-[11px] uppercase tracking-wider font-semibold">
            {currentWishlist.length} Saved Sarees
          </span>
        </div>

        <button
          onClick={handleShare}
          className="text-[#780D24] hover:text-[#5E091B] flex items-center gap-1.5 font-sans text-[12px] font-bold tracking-wider uppercase min-h-[44px] px-2"
        >
          <span className="material-symbols-outlined text-[18px]">share</span>
          <span className="hidden sm:inline">Share List</span>
        </button>
      </div>

      {/* Empty State */}
      {currentWishlist.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E8DDD6] p-12 text-center max-w-md mx-auto space-y-4 my-8">
          <div className="w-16 h-16 mx-auto rounded-full border border-[#B88A44] bg-[#F4EEE5] flex items-center justify-center text-[#780D24]">
            <span className="material-symbols-outlined text-[32px]">favorite_border</span>
          </div>
          <h2 className="font-serif text-[22px] text-[#231919] font-semibold">
            Your wishlist is empty
          </h2>
          <p className="font-sans text-[14px] text-[#5F5552] leading-relaxed">
            Your saved products will appear here.
          </p>
          <div className="pt-2">
            <button
              onClick={() => onNavigate('/shop')}
              className="px-8 py-3 bg-[#780D24] hover:bg-[#5E091B] text-white rounded font-sans text-[13px] font-bold tracking-wider uppercase shadow-md active:scale-95 transition-all"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      ) : (
        /* 2-Column Mobile / 4-Column Desktop Grid */
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {currentWishlist.map(({ product }) => {
            const inCart = isInCart(product.id);
            const isAdding = addingId === product.id;

            return (
              <article
                key={product.id}
                className="group bg-white rounded-lg border border-[#E8DDD6] overflow-hidden flex flex-col justify-between transition-all hover:border-[#B88A44] shadow-xs relative"
              >
                {/* 3:4 Image Container */}
                <div
                  className="relative aspect-[3/4] bg-[#F4EEE5] overflow-hidden cursor-pointer"
                  onClick={() => onNavigate(`/product/${product.id}`)}
                >
                  <img
                    src={product.images.full}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />

                  {/* Weave Tag */}
                  <div className="absolute top-2 left-2 bg-[#FBF7F0]/90 backdrop-blur-xs px-2 py-0.5 rounded-sm border border-[#B88A44]/50 text-[#231919] font-sans text-[9px] uppercase tracking-wider font-semibold">
                    {product.categoryLabel}
                  </div>

                  {/* Filled Red Wishlist Heart */}
                  <button
                    aria-label={`Remove ${product.name} from wishlist`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(product.id, product.name);
                    }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-[#780D24] active:scale-90 transition-transform shadow-xs"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px] fill text-[#780D24]">
                      favorite
                    </span>
                  </button>

                  {/* In-cart or Out-of-Stock Badges */}
                  {inCart && (
                    <div className="absolute bottom-2 left-2 bg-[#780D24] text-white font-sans text-[9px] px-2 py-0.5 rounded font-semibold uppercase flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">check</span>
                      In Bag
                    </div>
                  )}

                  {!product.inStock && (
                    <div className="absolute top-2 left-2 bg-[#231919]/90 text-white px-2 py-0.5 rounded font-sans text-[9px] uppercase tracking-wider font-bold">
                      Out of Stock
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h2
                      onClick={() => onNavigate(`/product/${product.id}`)}
                      className="font-serif text-[14px] leading-snug line-clamp-2 text-[#231919] cursor-pointer hover:text-[#780D24] transition-colors"
                    >
                      {product.name}
                    </h2>
                    <p className="font-sans text-[11px] text-[#5F5552] mt-0.5 truncate">
                      {product.subtitle}
                    </p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="font-sans text-[16px] font-bold text-[#780D24]">
                        {formatINR(product.price)}
                      </span>
                      {product.originalPrice && (
                        <span className="text-[11px] text-[#5F5552] line-through">
                          {formatINR(product.originalPrice)}
                        </span>
                      )}
                      {product.discountPercent && (
                        <span className="text-[10px] font-bold text-[#B88A44]">
                          {product.discountPercent}% OFF
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-3">
                    {!product.inStock ? (
                      <button
                        disabled
                        className="w-full py-2 bg-[#F4EEE5] text-[#5F5552] cursor-not-allowed rounded font-sans text-[11px] font-semibold tracking-wider uppercase flex items-center justify-center gap-1 border border-[#E8DDD6]"
                      >
                        <span className="material-symbols-outlined text-[14px]">notifications</span>
                        <span>Notify When Available</span>
                      </button>
                    ) : inCart ? (
                      <button
                        onClick={() => onNavigate('/bag')}
                        className="w-full py-2 bg-white text-[#780D24] border border-[#780D24] hover:bg-[#F4EEE5] rounded font-sans text-[11px] font-bold tracking-wider uppercase flex items-center justify-center gap-1 transition-all"
                      >
                        <span className="material-symbols-outlined text-[14px]">shopping_bag</span>
                        <span>View in Bag</span>
                      </button>
                    ) : product.category === 'Banarasi' ? (
                      <button
                        onClick={() => setVariantSheetProduct(product)}
                        className="w-full py-2 bg-[#780D24] hover:bg-[#5E091B] text-white rounded font-sans text-[11px] font-bold tracking-wider uppercase flex items-center justify-center gap-1 transition-all shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[14px]">tune</span>
                        <span>Select Options</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAdd(product)}
                        disabled={isAdding}
                        className="w-full py-2 bg-[#780D24] hover:bg-[#5E091B] text-white rounded font-sans text-[11px] font-bold tracking-wider uppercase flex items-center justify-center gap-1 transition-all shadow-xs active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {isAdding ? 'sync' : 'shopping_bag'}
                        </span>
                        <span>{isAdding ? 'Adding...' : 'Add to Bag'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Provenance Assurance Footer Strip */}
      <section className="mt-12 p-4 sm:p-6 rounded-xl border border-[#E8DDD6] bg-[#F4EEE5]/50 flex flex-col sm:flex-row items-center justify-around gap-4 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[26px] text-[#780D24] fill">
            verified
          </span>
          <div>
            <h3 className="font-serif text-[14px] font-semibold text-[#231919]">
              100% Certified Silk Mark
            </h3>
            <p className="font-sans text-[12px] text-[#5F5552]">
              Pure natural mulberry &amp; wild handloom yardage
            </p>
          </div>
        </div>
        <div className="hidden sm:block h-8 w-px bg-[#E8DDD6]"></div>
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[26px] text-[#780D24]">
            video_call
          </span>
          <div>
            <h3 className="font-serif text-[14px] font-semibold text-[#231919]">
              Private Video Atelier
            </h3>
            <p className="font-sans text-[12px] text-[#5F5552]">
              Live drape inspection from our Hyderabad loom
            </p>
          </div>
        </div>
      </section>

      {/* Variant Selection Modal / Bottom Sheet */}
      {variantSheetProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white rounded-t-xl sm:rounded-xl border border-[#E8DDD6] shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-start justify-between border-b border-[#E8DDD6] pb-3">
              <div className="flex gap-3">
                <div className="w-14 h-18 aspect-[3/4] rounded overflow-hidden bg-[#F4EEE5] shrink-0 border border-[#E8DDD6]">
                  <img
                    src={variantSheetProduct.images.full}
                    alt={variantSheetProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <span className="font-sans text-[10px] text-[#780D24] font-bold uppercase tracking-wider">
                    Select Options
                  </span>
                  <h3 className="font-serif text-[15px] text-[#231919] font-medium line-clamp-1">
                    {variantSheetProduct.name}
                  </h3>
                  <p className="font-sans text-[15px] font-bold text-[#780D24] mt-0.5">
                    {formatINR(variantSheetProduct.price)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVariantSheetProduct(null)}
                className="text-[#5F5552] hover:text-[#231919] p-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-2">
              <label className="block font-sans text-[11px] font-bold uppercase tracking-wider text-[#231919]">
                Select Color / Zari Weave
              </label>
              {[{ name: variantSheetProduct.colorName, desc: variantSheetProduct.subtitle }].map((variant) => (
                <label
                  key={variant.name}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedVariant === variant.name
                      ? 'border-[#780D24] bg-[#F4EEE5]/50'
                      : 'border-[#E8DDD6] hover:border-[#B88A44]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="weave-variant"
                      checked={selectedVariant === variant.name}
                      onChange={() => setSelectedVariant(variant.name)}
                      className="w-4 h-4 text-[#780D24] focus:ring-[#780D24] accent-[#780D24]"
                    />
                    <div>
                      <span className="block font-sans text-[13px] font-semibold text-[#231919]">
                        {variant.name}
                      </span>
                      <span className="block font-sans text-[11px] text-[#5F5552]">
                        {variant.desc}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-sans font-bold text-[#780D24] uppercase">
                    {selectedVariant === variant.name ? 'Selected' : 'Available'}
                  </span>
                </label>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  onAddToCart(variantSheetProduct, 1, selectedVariant);
                  setVariantSheetProduct(null);
                }}
                className="w-full h-12 bg-[#780D24] hover:bg-[#5E091B] text-white font-sans text-[13px] font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                <span>Confirm &amp; Add to Bag</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
