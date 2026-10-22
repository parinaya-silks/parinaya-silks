import {usePublicCatalog} from '../products/hooks.ts';
import {storefrontProduct} from '../products/adapter.ts';
import { demoEnabled } from '../config/runtime.ts';
import React, { useState, useMemo } from 'react';
import { Product } from '../types/index.ts';
import { formatINR } from '../utils/pricing.ts';
import { useCategories } from '../categories/useCategories.ts';

interface ShopViewProps {
  products: Product[];
  initialCategory?: string;
  initialSearch?: string;
  categorySlug?: string;
  saleOnly?: boolean;
  onNavigate: (path: string) => void;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (product: Product) => void;
  isWishlisted: (productId: string) => boolean;
}

export const ShopView: React.FC<ShopViewProps> = ({
  products:initialProducts,
  initialCategory,
  initialSearch = '',
  categorySlug: requestedSlug,
  saleOnly = false,
  onNavigate,
  onAddToCart,
  onToggleWishlist,
  isWishlisted,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [sortOption, setSortOption] = useState<'featured' | 'newest' | 'price-asc' | 'price-desc'>('featured');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Filters state
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number>(Infinity);
  const priceCeiling = Math.max(1, ...initialProducts.map(product => Math.ceil(product.price)));

  const { state: categoryState, retry: retryCategories } = useCategories();
  const publicCategories = categoryState.status === 'ready' ? categoryState.items : [];
  const selectedPublic = requestedSlug ? publicCategories.find(category => category.slug === requestedSlug) : initialCategory ? publicCategories.find(category => category.id === initialCategory || category.slug === initialCategory) : undefined;
  const selectedCategory = selectedPublic?.id || 'all';
  const categories = [{ id: 'all', label: 'All Sarees' }, ...publicCategories.map(category => ({ id: category.id, label: category.name }))];
  const page=usePublicCatalog({browse:'1',sort:sortOption,...(selectedPublic?{category:selectedPublic.slug}:{}),...(searchQuery.trim()?{q:searchQuery.trim()}:{}),...(selectedColors.length?{colors:selectedColors.join('|')}:{}),...(inStockOnly?{inStock:'true'}:{}),...(saleOnly?{sale:'true'}:{}),...(Number.isFinite(maxPrice)?{maxPrice:String(Math.round(maxPrice*100))}:{})});
  const products=page.items.map(storefrontProduct);
  const colorProducts=[...initialProducts,...products];
  const colorOptions = Array.from(new Map(colorProducts.flatMap(p => p.variants?.length ? p.variants.map(variant => [variant.name, { name: variant.name, hex: variant.hex }] as const) : p.colorName ? [[p.colorName, { name: p.colorName, hex: p.colorHex }] as const] : [])).values());

  const filteredProducts=products;

  const activeFilterCount =
    (selectedCategory !== 'all' ? 1 : 0) +
    (selectedColors.length > 0 ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (maxPrice < priceCeiling ? 1 : 0);

  const clearAllFilters = () => {
    setSelectedColors([]);
    setInStockOnly(false);
    setMaxPrice(Infinity);
    setSearchQuery('');
    if (requestedSlug || initialCategory) onNavigate('/shop');
  };

  const getSortLabel = () => {
    switch (sortOption) {
      case 'newest':
        return 'Newest Arrivals';
      case 'price-asc':
        return 'Price: Low to High';
      case 'price-desc':
        return 'Price: High to Low';
      default:
        return 'Featured';
    }
  };

  return (
    <div className="space-y-4">
      {/* Title & Saree Count Header */}
      <section className="bg-white border-b border-[#E8DDD6] px-4 py-3.5">
        <div className="max-w-7xl mx-auto flex items-baseline justify-between">
          <div className="flex items-baseline gap-2.5">
            <h1 className="font-serif text-[20px] sm:text-[24px] text-[#231919] font-semibold tracking-tight">
              {selectedPublic ? selectedPublic.name : searchQuery ? `Search: "${searchQuery}"` : 'Shop All Sarees'}
            </h1>
            <span className="font-sans text-[11px] sm:text-[12px] text-[#5F5552] uppercase tracking-wider">
              {filteredProducts.length} Sarees
            </span>
          </div>
          <span className="font-sans text-[12px] text-[#780D24] font-medium hidden sm:inline">
            PARINAYA SILKS
          </span>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 text-sm text-[#5F5552]">
        {categoryState.status === 'loading' && <p role="status">Loading categories…</p>}
        {categoryState.status === 'error' && <div role="alert"><p>Categories are unavailable right now.</p><button className="min-h-11 underline text-[#780D24]" onClick={retryCategories}>Retry categories</button></div>}
        {categoryState.status === 'ready' && publicCategories.length === 0 && !requestedSlug && !initialCategory && <p>No categories available yet.</p>}
        {selectedPublic?.description && <p>{selectedPublic.description}</p>}
      </div>

      {/* Category Pills Horizontal Scroll */}
      <section className="bg-[#FBF7F0] border-b border-[#E8DDD6] px-4 py-2.5 overflow-x-auto no-scrollbar">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => { if (cat.id === 'all') onNavigate('/shop'); else { const category = publicCategories.find(item => item.id === cat.id); if (category) onNavigate(`/collections/${category.slug}`); } }}
                className={`px-4 py-1.5 rounded-full font-sans text-[12px] tracking-wider uppercase flex-shrink-0 transition-all font-semibold ${
                  (selectedPublic?.id === cat.id || (!selectedPublic && isActive))
                    ? 'bg-[#780D24] text-white shadow-xs'
                    : 'bg-white text-[#231919] border border-[#E8DDD6] hover:border-[#B88A44]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Sticky Filter & Sort Control Bar */}
      <section className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-[#E8DDD6] py-2 px-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            {/* Filter Drawer Trigger */}
            <button
              disabled={products.length === 0}
              onClick={() => setFilterDrawerOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-[#F4EEE5] border border-[#E8DDD6] hover:border-[#B88A44] text-[#231919] py-2 px-3 rounded-lg active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px] text-[#780D24]">tune</span>
              <span className="font-sans text-[12px] uppercase tracking-wider font-semibold">
                Filters
              </span>
              {activeFilterCount > 0 && (
                <span className="bg-[#780D24] text-white font-sans text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort Dropdown */}
            <div className="relative flex-1">
              <button
                onClick={() => setSortMenuOpen(!sortMenuOpen)}
                className="w-full flex items-center justify-between bg-white border border-[#E8DDD6] hover:border-[#B88A44] text-[#231919] py-2 px-3 rounded-lg active:scale-95 transition-all"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-sans text-[11px] uppercase tracking-wider text-[#5F5552]">
                    Sort:
                  </span>
                  <span className="font-sans text-[12px] text-[#231919] font-semibold truncate">
                    {getSortLabel()}
                  </span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-[#5F5552]">
                  expand_more
                </span>
              </button>

              {sortMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-full bg-white rounded-lg border border-[#E8DDD6] shadow-xl z-50 py-1 text-[13px] font-sans">
                  <button
                    onClick={() => {
                      setSortOption('featured');
                      setSortMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#F4EEE5] ${
                      sortOption === 'featured' ? 'text-[#780D24] font-semibold bg-[#F4EEE5]' : 'text-[#231919]'
                    }`}
                  >
                    <span>Featured</span>
                    {sortOption === 'featured' && (
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setSortOption('newest');
                      setSortMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#F4EEE5] ${
                      sortOption === 'newest' ? 'text-[#780D24] font-semibold bg-[#F4EEE5]' : 'text-[#231919]'
                    }`}
                  >
                    <span>Newest Arrivals</span>
                    {sortOption === 'newest' && (
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setSortOption('price-asc');
                      setSortMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#F4EEE5] ${
                      sortOption === 'price-asc' ? 'text-[#780D24] font-semibold bg-[#F4EEE5]' : 'text-[#231919]'
                    }`}
                  >
                    <span>Price: Low to High</span>
                    {sortOption === 'price-asc' && (
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setSortOption('price-desc');
                      setSortMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#F4EEE5] ${
                      sortOption === 'price-desc' ? 'text-[#780D24] font-semibold bg-[#F4EEE5]' : 'text-[#231919]'
                    }`}
                  >
                    <span>Price: High to Low</span>
                    {sortOption === 'price-desc' && (
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Active Filter Chips */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
              {selectedCategory !== 'all' && (
                <div className="inline-flex items-center bg-[#F4EEE5] border border-[#B88A44]/30 rounded px-2.5 py-0.5 gap-1 shrink-0 text-[11px] font-sans">
                  <span>Category: {selectedPublic?.name}</span>
                  <button aria-label="Clear category" onClick={() => onNavigate('/shop')}>
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              )}
              {selectedColors.map((color) => (
                <div
                  key={color}
                  className="inline-flex items-center bg-[#F4EEE5] border border-[#B88A44]/30 rounded px-2.5 py-0.5 gap-1 shrink-0 text-[11px] font-sans"
                >
                  <span>Colour: {color}</span>
                  <button
                    onClick={() => setSelectedColors(selectedColors.filter((c) => c !== color))}
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ))}
              {inStockOnly && (
                <div className="inline-flex items-center bg-[#F4EEE5] border border-[#B88A44]/30 rounded px-2.5 py-0.5 gap-1 shrink-0 text-[11px] font-sans">
                  <span>In Stock Only</span>
                  <button onClick={() => setInStockOnly(false)}>
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              )}
              <button
                onClick={clearAllFilters}
                className="text-[#780D24] font-sans text-[11px] font-bold uppercase tracking-wider hover:underline ml-1 shrink-0"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 2-Column Mobile / 4-Column Desktop Product Grid */}
      <main className="max-w-7xl mx-auto px-4 py-2">
        {(requestedSlug || initialCategory) && (categoryState.status !== 'ready' || !selectedPublic) ? <section className="py-8 text-center space-y-3">
          <h2 className="font-serif text-xl">{categoryState.status === 'ready' ? 'Category not found.' : categoryState.status === 'error' ? 'Category unavailable' : 'Loading category…'}</h2>
          {categoryState.status === 'ready' && <button className="min-h-11 px-5 text-[#780D24] underline" onClick={() => onNavigate('/shop')}>Continue Shopping</button>}
        </section> : page.state==='ready' && filteredProducts.length === 0 ? (
          <div className="max-w-xl mx-auto bg-white rounded-xl border border-[#E8DDD6] p-6 text-center my-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#F4EEE5] border border-[#B88A44] flex items-center justify-center text-[#780D24]">
              <span className="material-symbols-outlined text-[32px]">inventory_2</span>
            </div>
            <h2 className="font-serif text-[20px] text-[#231919] font-medium">
              {searchQuery || (products.length > 0 && activeFilterCount > 0) ? 'No products found.' : 'No products available yet.'}
            </h2>
            <p className="font-sans text-[14px] text-[#5F5552] max-w-sm mx-auto">
              {searchQuery || (products.length > 0 && activeFilterCount > 0) ? 'Try another search or clear your filters.' : 'Please check back or contact us for more information.'}
            </p>
            <button
              onClick={() => searchQuery || (products.length > 0 && activeFilterCount > 0) ? clearAllFilters() : onNavigate('/contact')}
              className="px-6 py-2.5 bg-[#780D24] hover:bg-[#5E091B] text-white font-sans text-[12px] font-bold tracking-wider uppercase rounded-lg shadow-sm active:scale-95 transition-all"
            >
              {searchQuery || (products.length > 0 && activeFilterCount > 0) ? 'Clear filters' : 'Contact Us'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {filteredProducts.map((product) => {
              const wishlisted = isWishlisted(product.id);
              return (
                <article
                  key={product.id}
                  className="group bg-white rounded-lg border border-[#E8DDD6] overflow-hidden flex flex-col transition-all hover:border-[#B88A44] shadow-xs hover:shadow-sm"
                >
                  {/* 3:4 Image Box with Badges */}
                  <div
                    className="relative w-full aspect-[3/4] bg-[#F4EEE5] overflow-hidden cursor-pointer"
                    onClick={() => onNavigate(`/product/${product.slug || product.id}`)}
                  >
                    <img
                      src={product.images.full}
                      alt={product.gallery?.find(image=>image.url===product.images.full)?.alt || product.name}
                      className="w-full h-full object-contain"
                    />

                    {/* Saree Weave Tag */}
                    <span className="absolute top-2 left-2 bg-[#FBF7F0]/90 backdrop-blur-xs text-[#231919] border border-[#B88A44]/50 text-[9px] font-semibold px-2 py-0.5 rounded uppercase font-sans tracking-wider">
                      {product.categoryLabel}
                    </span>

                    {/* Wishlist Heart Button */}
                    <button

                      aria-label={`Save ${product.name} to wishlist`}
                      aria-pressed={wishlisted}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWishlist(product);
                      }}
                      className="absolute z-20 top-2 right-2 w-11 h-11 bg-white/85 backdrop-blur-sm rounded-full flex items-center justify-center text-[#780D24] active:scale-90 transition-transform shadow-xs"
                      type="button"
                    >
                      <span className={`material-symbols-outlined text-[18px] ${wishlisted ? 'fill text-[#780D24]' : ''}`}>
                        favorite
                      </span>
                    </button>

                    {/* Sold out overlay */}
                    {!product.inStock && (
                      <div className="absolute inset-0 bg-[#231919]/50 flex flex-col items-center justify-center p-3 text-center backdrop-blur-[1px]">
                        <span className="font-sans text-[11px] uppercase tracking-widest text-[#FBF7F0] bg-[#392E2E]/90 px-3 py-1 rounded-sm border border-white/20 font-medium">
                          Sold Out
                        </span>
                        <button
                          disabled={!demoEnabled}
                          onClick={(e) => {
                            e.stopPropagation();
                            alert('Stock notifications are not connected. No subscription was created.');
                          }}
                          className="mt-2.5 w-full bg-white text-[#231919] font-sans text-[10px] font-semibold py-1.5 px-2 rounded-lg shadow-sm border border-[#E8DDD6] active:scale-95 transition-transform flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px] text-[#780D24]">
                            notifications
                          </span>
                          <span className="truncate">Notifications unavailable</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Details Card */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h3
                        onClick={() => onNavigate(`/product/${product.slug || product.id}`)}
                        className="font-serif text-[14px] leading-snug line-clamp-2 text-[#231919] cursor-pointer hover:text-[#780D24] transition-colors"
                      >
                        {product.name}
                      </h3>
                      <p className="font-sans text-[11px] text-[#5F5552] mt-1 line-clamp-1">
                        {product.subtitle}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#F4EEE5]">
                      <div className="flex items-baseline justify-between">
                        <span className="font-sans text-[16px] font-bold text-[#780D24]">
                          {formatINR(product.price)}
                        </span>
                        {product.originalPrice ? (
                          <span className="text-[11px] text-[#5F5552] line-through">
                            {formatINR(product.originalPrice)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#5F5552]">{product.inStock ? 'In stock' : 'Out of stock'}</span>
                        )}
                      </div>

                      {product.inStock ? (
                        <button
                          aria-label="Add to Bag"
                          onClick={() => onAddToCart(product)}
                          className="w-full mt-2.5 min-h-11 py-2 bg-[#780D24] hover:bg-[#5E091B] text-white rounded text-[11px] font-semibold tracking-wider uppercase font-sans flex items-center justify-center gap-1 active:scale-95 transition-all shadow-xs"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            shopping_bag
                          </span>
                          <span>Add to Bag</span>
                        </button>
                      ) : (
                        <div className="w-full mt-2.5 py-1.5 text-center text-[10px] font-sans uppercase tracking-wider text-[#780D24] font-medium">
                          Out of stock
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <div className="text-center p-4 space-y-3">{page.state==='loading'&&<p role="status">Finding products...</p>}{page.state==='error'&&<div role="alert"><p>Unable to load products.</p><button className="min-h-11 underline" onClick={page.retry}>Retry products</button></div>}{page.hasMore&&<button className="min-h-11 border rounded px-5" disabled={page.busy} onClick={page.loadMore}>Load more matching products</button>}</div>
      {/* Slide-Up Filter Drawer */}
      {filterDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-xs">
          <div
            className="flex-1"
            onClick={() => setFilterDrawerOpen(false)}
          />
          <div className="bg-white rounded-t-xl border-t border-[#B88A44] max-h-[85vh] flex flex-col shadow-2xl max-w-xl mx-auto w-full">
            <div className="w-full flex flex-col items-center pt-2.5 pb-1 cursor-grab">
              <div className="w-10 h-1 bg-[#E8DDD6] rounded-full"></div>
            </div>
            <div className="px-5 py-3 flex items-center justify-between border-b border-[#E8DDD6]">
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-[18px] text-[#231919] font-semibold">
                  Refine Collection
                </h3>
                {activeFilterCount > 0 && (
                  <span className="bg-[#780D24] text-white font-sans text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {activeFilterCount} Active
                  </span>
                )}
              </div>
              <button
                onClick={() => setFilterDrawerOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#5F5552] hover:text-[#231919]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 no-scrollbar">
              {/* Filter: Price Range */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-sans text-[11px] uppercase tracking-wider text-[#231919] font-bold">
                    Price Spectrum
                  </span>
                  <span className="font-sans text-[12px] text-[#780D24] font-bold">
                    Up to {formatINR(Math.min(maxPrice, priceCeiling))}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={priceCeiling}
                  step="1"
                  value={Math.min(maxPrice, priceCeiling)}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-[#780D24] cursor-pointer"
                />
                <div className="flex justify-between text-[11px] font-sans text-[#5F5552] mt-1">
                  <span>{formatINR(0)}</span>
                  <span>{formatINR(priceCeiling / 2)}</span>
                  <span>{formatINR(priceCeiling)}</span>
                </div>
              </div>

              {/* Filter: Categories */}
              <div>
                <span className="font-sans text-[11px] uppercase tracking-wider text-[#231919] font-bold block mb-2">
                  Weave &amp; Category
                </span>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => { const category = publicCategories.find(item => item.id === cat.id); onNavigate(category ? `/collections/${category.slug}` : '/shop'); }}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-sans tracking-wide transition-all ${
                        selectedCategory === cat.id
                          ? 'bg-[#780D24] text-white font-semibold shadow-xs'
                          : 'bg-[#F4EEE5] text-[#231919] border border-[#E8DDD6]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter: Color Palette */}
              <div>
                <span className="font-sans text-[11px] uppercase tracking-wider text-[#231919] font-bold block mb-2">
                  Authentic Palette
                </span>
                <div className="flex items-center gap-3 overflow-x-auto py-1">
                  {colorOptions.map((c) => {
                    const isSelected = selectedColors.includes(c.name);
                    return (
                      <button
                        key={c.name}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedColors(selectedColors.filter((col) => col !== c.name));
                          } else {
                            setSelectedColors([...selectedColors, c.name]);
                          }
                        }}
                        className="flex flex-col items-center gap-1 group shrink-0"
                      >
                        <div
                          className={`w-8 h-8 rounded-full border border-black/20 flex items-center justify-center transition-all ${
                            isSelected ? 'ring-2 ring-offset-2 ring-[#780D24]' : ''
                          }`}
                          style={{ backgroundColor: c.hex }}
                        >
                          {isSelected && (
                            <span className="material-symbols-outlined text-white text-[16px]">
                              check
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-sans text-[#231919]">{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filter: Availability */}
              <div className="pt-2">
                <label className="flex items-center justify-between p-3 rounded-lg bg-[#F4EEE5] border border-[#E8DDD6] cursor-pointer">
                  <span className="font-sans text-[13px] text-[#231919] font-medium">
                    In-stock items
                  </span>
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="w-4 h-4 text-[#780D24] rounded border-[#E8DDD6] focus:ring-[#780D24] accent-[#780D24]"
                  />
                </label>
              </div>
            </div>

            {/* Drawer Actions */}
            <div className="p-4 border-t border-[#E8DDD6] flex items-center gap-3 bg-white">
              <button
                onClick={clearAllFilters}
                className="flex-1 py-3 border border-[#E8DDD6] text-[#231919] font-sans text-[12px] uppercase tracking-wider rounded-lg font-medium hover:bg-[#F4EEE5]"
              >
                Clear All
              </button>
              <button
                onClick={() => setFilterDrawerOpen(false)}
                className="flex-[2] py-3 bg-[#780D24] hover:bg-[#5E091B] text-white font-sans text-[12px] uppercase tracking-wider rounded-lg font-bold shadow-md"
              >
                Apply Filters ({filteredProducts.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
