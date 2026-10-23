import React, { useState } from 'react';
import { Product } from '../types/index.ts';
import { formatINR } from '../utils/pricing.ts';

interface ProductDetailViewProps {
  product: Product;
  allProducts: Product[];
  onNavigate: (path: string) => void;
  onAddToCart: (product: Product, quantity?: number, selectedColor?: string) => void;
  onBuyNow: (product: Product, quantity:number, selectedColor?:string)=>void;
  onToggleWishlist: (product: Product) => void;
  isWishlisted: (productId: string) => boolean;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  allProducts,
  onNavigate,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
  isWishlisted,
}) => {
  const [activeImageKey, setActiveImageKey] = useState<string>(product.gallery?.find(image=>image.url===product.images.full)?.mediaId || 'full');
  const [zoomModalOpen, setZoomModalOpen] = useState(false);
  const [purchaseError,setPurchaseError]=useState('');
  const [selectedColor, setSelectedColor] = useState(product.variants?.length ? '' : product.colorName);
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState('500034');
  const [deliveryResult, setDeliveryResult] = useState<string | null>(null);

  const imagesList = product.gallery?.length ? product.gallery.map(image=>({key:image.mediaId,label:image.alt,url:image.url})) : [
    { key: 'full' as const, label: 'Full Saree', url: product.images.full },
    { key: 'pallu' as const, label: 'Pallu', url: product.images.pallu || product.images.full },
    { key: 'border' as const, label: 'Border', url: product.images.border || product.images.full },
    { key: 'blouse' as const, label: 'Blouse', url: product.images.blouse || product.images.full },
  ];

  const currentImageUrl = imagesList.find(image=>image.key===activeImageKey)?.url || product.images.full;

  const colorVariants = product.variants?.length ? product.variants.map(variant=>({...variant,key:variant.id})) : [{key:product.colorName,name:product.colorName,hex:product.colorHex}];
  const selectedVariant = product.variants?.find(variant=>variant.id===selectedColor);
  const selectedStock = selectedVariant ? selectedVariant.quantity : product.variants?.length ? 0 : product.stockCount;

  const handleCheckPincode = () => {
    if (/^[1-9][0-9]{5}$/.test(pincode)) {
      setDeliveryResult(
        `PIN ${pincode} has a valid format. Contact our team to confirm courier availability and delivery estimates.`
      );
    } else {
      setDeliveryResult('Please enter a valid 6-digit India postal PIN code.');
    }
  };

  const handleAdd = () => {
    onAddToCart(product, quantity, selectedColor);

  };

  const handleBuyNow = () => {
    setPurchaseError('');if(!Number.isSafeInteger(quantity)||quantity<1||quantity>selectedStock){setPurchaseError('Choose an available colour and quantity.');return;}
    try{onBuyNow(product, quantity, selectedColor);}catch(error){setPurchaseError(error instanceof Error?error.message:'Unable to start checkout. Please retry.');}
  };

  const relatedProducts = allProducts.filter((p) => p.id !== product.id).slice(0, 4);

  const wishlisted = isWishlisted(product.id);

  return (
    <div className="pb-44 md:pb-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4" style={{overflowWrap:'anywhere'}}>
      {Boolean(product.variants?.length)&&!selectedColor&&<p className="mb-4 p-3 rounded bg-[#F4EEE5] text-sm text-[#780D24]" role="note">Please select a colour before adding to your bag or buying now.</p>}
      {purchaseError&&<p role="alert" className="mb-4 text-[#780D24]">{purchaseError}</p>}
      {/* Breadcrumb strip */}
      <nav aria-label="Breadcrumb" className="mb-4 text-[12px] font-sans text-[#5F5552] flex items-center gap-1.5 flex-wrap">
        <button onClick={() => onNavigate('/')} className="hover:text-[#780D24]">
          Home
        </button>
        <span>&gt;</span>
        <button onClick={() => onNavigate('/shop')} className="hover:text-[#780D24]">
          Shop Sarees
        </button>
        <span>&gt;</span>
        <button onClick={() => onNavigate(`/shop?category=${product.categoryId}`)} className="hover:text-[#780D24]">
          {product.category}
        </button>
        <span>&gt;</span>
        <span className="text-[#231919] font-medium truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
        {/* LEFT COLUMN: Gallery & Lightbox */}
        <div className="space-y-3.5 md:sticky md:top-20">
          <div className="relative w-full aspect-[4/5] bg-[#F4EEE5] rounded-xl overflow-hidden border border-[#E8DDD6] shadow-sm group">
            <img
              src={currentImageUrl}
              alt={imagesList.find(image=>image.key===activeImageKey)?.label || product.name}
              className="w-full h-full object-contain transition-all duration-300"
            />

            {/* Silk Mark Pill */}
            {product.silkMarkCertified && (
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md border border-[#B88A44]/60 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                <span className="material-symbols-outlined text-[#B88A44] text-[15px] fill">
                  verified
                </span>
                <span className="font-sans text-[10px] text-[#231919] uppercase tracking-wider font-semibold">
                  Sample silk details
                </span>
              </div>
            )}

            {/* Wishlist Heart Button */}
            <button
              aria-label="Save to Wishlist"
              aria-pressed={wishlisted}
              onClick={() => onToggleWishlist(product)}
              className="absolute top-3 right-3 w-11 h-11 rounded-full bg-white/85 backdrop-blur-md border border-[#E8DDD6] flex items-center justify-center text-[#231919] hover:text-[#780D24] shadow-sm active:scale-95 transition-all"
              type="button"
            >
              <span className={`material-symbols-outlined text-[22px] ${wishlisted ? 'fill text-[#780D24]' : ''}`}>
                favorite
              </span>
            </button>

            {/* Image Counter Badge */}
            <div className="absolute bottom-3 left-3 bg-[#231919]/80 backdrop-blur-sm text-white px-3 py-1 rounded font-sans text-[11px] tracking-wider uppercase font-medium">
              {imagesList.findIndex((img) => img.key === activeImageKey) + 1} / {imagesList.length} • {product.categoryLabel}
            </div>

            {/* Tap to Zoom Lightbox Button */}
            <button
              aria-label="Zoom image"
              onClick={() => setZoomModalOpen(true)}
              className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur-md border border-[#E8DDD6] flex items-center justify-center text-[#231919] hover:bg-[#F4EEE5] transition-all active:scale-95 shadow"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">zoom_in</span>
            </button>
          </div>

          {/* 4 Thumbnails */}
          <div className="grid grid-cols-4 gap-2.5">
            {imagesList.map((img) => {
              const isActive = activeImageKey === img.key;
              return (
                <button
                  key={img.key}
                  onClick={() => setActiveImageKey(img.key)}
                  className={`relative h-16 sm:h-20 rounded-lg overflow-hidden border transition-all active:scale-95 bg-[#F4EEE5] ${
                    isActive
                      ? 'ring-2 ring-[#780D24] border-transparent shadow-xs'
                      : 'border-[#E8DDD6] hover:border-[#B88A44]'
                  }`}
                  type="button"
                >
                  <img src={img.url} alt={img.label} className="w-full h-full object-contain" />
                  <span
                    className={`absolute inset-x-0 bottom-0 text-[9px] font-sans py-0.5 text-center leading-tight font-medium ${
                      isActive ? 'bg-[#780D24] text-white' : 'bg-[#231919]/75 text-white'
                    }`}
                  >
                    {img.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Product Information & Controls */}
        <div className="space-y-4">

          {/* Summary Card */}
          <div className="bg-white p-5 sm:p-6 rounded-xl border border-[#E8DDD6] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-sans text-[11px] text-[#B88A44] tracking-widest uppercase font-bold">
                {product.categoryLabel}
              </span>
              <div className="inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                {product.variants?.length&&!selectedColor?'Choose a colour':selectedStock > 0 ? 'In Stock' : 'Out of stock'}
              </div>
            </div>

            <h1 className="font-serif text-[22px] sm:text-[28px] text-[#231919] font-medium leading-tight tracking-tight">
              {product.name}
            </h1>

            {/* Pricing */}
            <div className="flex items-baseline gap-3 pt-1">
              <span className="font-sans text-[26px] sm:text-[28px] font-bold text-[#780D24]">
                {formatINR(product.price)}
              </span>
              {product.originalPrice && (
                <span className="font-sans text-[15px] text-[#5F5552] line-through">
                  {formatINR(product.originalPrice)}
                </span>
              )}
              {Boolean(product.discountPercent) && (
                <span className="font-sans text-[11px] text-[#780D24] font-bold bg-[#780D24]/10 px-2 py-0.5 rounded">
                  {product.discountPercent}% OFF
                </span>
              )}
            </div>

            <p className="font-sans text-[13px] text-[#5F5552]">
              Cash on Delivery is available at checkout, subject to current stock and shipping.
            </p>


          </div>
          {/* Color & Quantity Card */}
          <div className="bg-white p-5 sm:p-6 rounded-xl border border-[#E8DDD6] shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Color Swatches */}
              <div>
                <div className="flex items-center gap-2 mb-2 text-[12px] font-sans">
                  <span className="text-[#5F5552] uppercase font-bold tracking-wider">Colour:</span>
                  <span className="text-[#231919] font-semibold">{selectedVariant?.name || product.colorName}</span>
                </div>
                <div className="flex items-center gap-3">
                  {colorVariants.map((c) => {
                    const isSelected = selectedColor === c.key;
                    return (
                      <button
                        key={c.key}
                        onClick={() => {setSelectedColor(c.key);setQuantity(1);}}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                          isSelected ? 'ring-2 ring-offset-2 ring-[#780D24]' : 'opacity-80 hover:opacity-100 border border-black/20'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        type="button"
                        aria-label={c.name}
                      >
                        {isSelected && (
                          <span className="material-symbols-outlined text-white text-[16px]">
                            check
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="flex flex-col items-end">
                <span className="text-[11px] font-sans text-[#5F5552] uppercase font-bold tracking-wider mb-2">
                  Quantity
                </span>
                <div className="inline-flex items-center border border-[#E8DDD6] rounded-lg bg-[#F4EEE5] h-10 px-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 flex items-center justify-center text-[#231919] hover:text-[#780D24] active:scale-95 font-bold"
                    type="button"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-sans text-[14px] font-semibold text-[#231919]">
                    {quantity}
                  </span>
                  <button
                    disabled={selectedStock===0 || quantity>=selectedStock}
                    onClick={() => setQuantity(Math.min(selectedStock, quantity + 1))}
                    className="w-8 h-8 flex items-center justify-center text-[#231919] hover:text-[#780D24] active:scale-95 font-bold"
                    type="button"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Blouse summary callout */}
            <div className="pt-3 border-t border-[#E8DDD6] flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[#B88A44] text-[20px] mt-0.5">
                styler
              </span>
              <div>
                <p className="font-sans text-[13px] text-[#231919] leading-relaxed">
                  <strong className="text-[#780D24]">Blouse piece {product.blouseIncluded ? 'included' : 'not included'}:</strong>{' '}
                  {product.blouseDetails}
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Checker Card */}
          <div className="bg-white p-5 rounded-xl border border-[#E8DDD6] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#780D24] text-[20px]">
                  local_shipping
                </span>
                <h3 className="font-serif text-[16px] text-[#231919] font-semibold">
                  Check Delivery
                </h3>
              </div>
              <span className="text-[11px] font-sans text-[#5F5552]">PIN format check only</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="Enter 6-digit Pincode"
                className="flex-1 h-11 px-3 bg-[#FBF7F0] border border-[#E8DDD6] rounded-lg text-[14px] font-sans text-[#231919] focus:outline-none focus:border-[#780D24]"
              />
              <button
                type="button"
                onClick={handleCheckPincode}
                className="h-11 px-5 bg-[#780D24] hover:bg-[#5E091B] text-white font-sans text-[13px] font-semibold rounded-lg transition-colors"
              >
                Check
              </button>
            </div>
            {deliveryResult && (
              <div className="p-3 bg-[#F4EEE5] rounded-lg border border-[#E8DDD6] flex items-start justify-between gap-2 text-[12px] font-sans">
                <div className="flex items-start gap-2 text-[#231919]">
                  <span className="material-symbols-outlined text-emerald-700 text-[18px]">
                    check_circle
                  </span>
                  <span>{deliveryResult}</span>
                </div>
              </div>
            )}
          </div>

          {/* WhatsApp Direct Atelier Inquiry */}
          <div>
            <a
              href={`https://wa.me/918367383073?text=${encodeURIComponent(
                `Namaste Parinaya Silks, I would like to inquire about ${product.name} (${product.sku}).`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-11 bg-white border border-[#780D24]/50 hover:border-[#780D24] text-[#780D24] flex items-center justify-center gap-2 rounded-lg transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[#25D366] text-[20px]">chat</span>
              <span className="font-sans text-[13px] font-semibold">Ask about this saree on WhatsApp</span>
            </a>
          </div>

          {/* 5 Product Accordions */}
          <div className="bg-white rounded-xl border border-[#E8DDD6] divide-y divide-[#E8DDD6] shadow-xs overflow-hidden">
            {/* Description */}
            <details className="group" open>
              <summary className="flex justify-between items-center p-4 cursor-pointer list-none select-none hover:bg-[#F4EEE5] transition-colors">
                <span className="font-sans text-[14px] text-[#231919] font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#B88A44] text-[18px]">description</span>
                  Description
                </span>
                <span className="material-symbols-outlined text-[#5F5552] transition-transform duration-200 group-open:rotate-180 text-[20px]">
                  expand_more
                </span>
              </summary>
              <div className="px-4 pb-4 pt-1 font-sans text-[13px] text-[#5F5552] leading-relaxed">
                {product.description}
              </div>
            </details>

            {/* Fabric & Dimensions */}
            <details className="group">
              <summary className="flex justify-between items-center p-4 cursor-pointer list-none select-none hover:bg-[#F4EEE5] transition-colors">
                <span className="font-sans text-[14px] text-[#231919] font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#B88A44] text-[18px]">straighten</span>
                  Fabric &amp; Dimensions
                </span>
                <span className="material-symbols-outlined text-[#5F5552] transition-transform duration-200 group-open:rotate-180 text-[20px]">
                  expand_more
                </span>
              </summary>
              <div className="px-4 pb-4 pt-1 font-sans text-[13px] text-[#5F5552] space-y-2">
                <div className="flex justify-between py-1 border-b border-[#F4EEE5]">
                  <span className="text-[#5F5552]">Weave Type</span>
                  <span className="font-medium text-[#231919]">{product.weaveType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#F4EEE5]">
                  <span className="text-[#5F5552]">Zari Quality</span>
                  <span className="font-medium text-[#231919]">{product.zariType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#F4EEE5]">
                  <span className="text-[#5F5552]">Saree Length</span>
                  <span className="font-medium text-[#231919]">{product.sareeLength}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#F4EEE5]">
                  <span className="text-[#5F5552]">Net Weight</span>
                  <span className="font-medium text-[#231919]">{product.weightGrams ? `${product.weightGrams} Grams` : 'Not specified'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#5F5552]">Fabric</span>
                  <span className="font-medium text-[#780D24]">
                    {product.fabric}
                  </span>
                </div>
              </div>
            </details>

            {/* Blouse Details */}
            <details className="group">
              <summary className="flex justify-between items-center p-4 cursor-pointer list-none select-none hover:bg-[#F4EEE5] transition-colors">
                <span className="font-sans text-[14px] text-[#231919] font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#B88A44] text-[18px]">styler</span>
                  Blouse Details
                </span>
                <span className="material-symbols-outlined text-[#5F5552] transition-transform duration-200 group-open:rotate-180 text-[20px]">
                  expand_more
                </span>
              </summary>
              <div className="px-4 pb-4 pt-1 font-sans text-[13px] text-[#5F5552] leading-relaxed">
                <p>• {product.blouseDetails}</p>
                <p className="mt-1 text-[12px] text-[#5F5552]">
                  • Custom bridal blouse stitching with bespoke Maggam / Zardozi hand-embroidery can be requested via our atelier concierge upon placing order.
                </p>
              </div>
            </details>

            {/* Care & Preservation */}
            <details className="group">
              <summary className="flex justify-between items-center p-4 cursor-pointer list-none select-none hover:bg-[#F4EEE5] transition-colors">
                <span className="font-sans text-[14px] text-[#231919] font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#B88A44] text-[18px]">dry_cleaning</span>
                  Care &amp; Preservation
                </span>
                <span className="material-symbols-outlined text-[#5F5552] transition-transform duration-200 group-open:rotate-180 text-[20px]">
                  expand_more
                </span>
              </summary>
              <div className="px-4 pb-4 pt-1 font-sans text-[13px] text-[#5F5552] space-y-1.5">
                {product.careInstructions.map((inst, i) => (
                  <p key={i}>• {inst}</p>
                ))}
              </div>
            </details>

            {/* Shipping & Exchange Policies */}
            <details className="group">
              <summary className="flex justify-between items-center p-4 cursor-pointer list-none select-none hover:bg-[#F4EEE5] transition-colors">
                <span className="font-sans text-[14px] text-[#231919] font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#B88A44] text-[18px]">assignment_return</span>
                  Shipping &amp; Exchange Policies
                </span>
                <span className="material-symbols-outlined text-[#5F5552] transition-transform duration-200 group-open:rotate-180 text-[20px]">
                  expand_more
                </span>
              </summary>
              <div className="px-4 pb-4 pt-1 font-sans text-[13px] text-[#5F5552] space-y-1.5 leading-relaxed">
                <p>Shipping is calculated at checkout. For dispatch and delivery information, see our <button onClick={() => onNavigate('/shipping-policy')} className="text-[#780D24] underline">shipping policy</button> or contact the store.</p>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Related Sarees Rail */}
      {relatedProducts.length > 0 && <section className="mt-12 pt-8 border-t border-[#E8DDD6]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="font-sans text-[11px] text-[#B88A44] uppercase tracking-wider font-bold">
              Curated Complements
            </span>
            <h3 className="font-serif text-[20px] text-[#231919] font-semibold">You May Also Like</h3>
          </div>
          <span className="font-sans text-[10px] text-[#5F5552] uppercase">Scroll to explore →</span>
        </div>

        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3">
          {relatedProducts.map((rel) => (
            <div
              key={rel.id}
              onClick={() => onNavigate(`/product/${rel.slug || rel.id}`)}
              className="min-w-[200px] sm:min-w-[230px] bg-white rounded-xl border border-[#E8DDD6] overflow-hidden hover:shadow-md transition-shadow cursor-pointer shrink-0"
            >
              <div className="relative aspect-[3/4] bg-[#F4EEE5] overflow-hidden">
                <img src={rel.images.full} alt={rel.name} className="w-full h-full object-contain" />
                <span className="absolute top-2 left-2 bg-[#780D24] text-white text-[9px] font-sans px-2 py-0.5 rounded font-medium">
                  {rel.category}
                </span>
              </div>
              <div className="p-3">
                <h4 className="font-serif text-[14px] text-[#231919] font-semibold line-clamp-1">
                  {rel.name}
                </h4>
                <p className="font-sans text-[15px] text-[#780D24] font-bold mt-1">
                  {formatINR(rel.price)}
                </p>
                <span className="font-sans text-[11px] text-[#5F5552]">{rel.categoryLabel}</span>
              </div>
            </div>
          ))}
        </div>
      </section>}

      {/* Lightbox Zoom Modal */}
      {zoomModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <button
            aria-label="Close zoom modal"
            onClick={() => setZoomModalOpen(false)}
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors active:scale-95"
            type="button"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
          <div className="max-w-2xl max-h-[85vh] overflow-auto rounded-lg shadow-2xl">
            <img
              src={currentImageUrl}
              alt="Enlarged high resolution view"
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      )}

      {/* Sticky Mobile Commerce Action Bar */}
      <aside className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0 left-0 w-full z-40 bg-white/95 backdrop-blur-md border-t border-[#E8DDD6] shadow-[0_-4px_16px_rgba(35,25,25,0.08)] pb-safe">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <button
            aria-label="Add to Bag"
            onClick={handleAdd}
            disabled={selectedStock<1||quantity>selectedStock}
            className={`flex-1 h-12 border-2 border-[#780D24] text-[#780D24] font-sans font-semibold rounded-lg flex items-center justify-center gap-2 active:scale-95 transition-all ${
              product.inStock ? 'hover:bg-[#780D24]/5 bg-white' : 'opacity-50 cursor-not-allowed'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
            <span>Add to Bag</span>
          </button>
          <button
            onClick={handleBuyNow}
            disabled={selectedStock<1||quantity>selectedStock}
            className={`flex-1 h-12 bg-[#780D24] hover:bg-[#5E091B] text-white font-sans font-semibold rounded-lg flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all ${
              product.inStock ? '' : 'opacity-50 cursor-not-allowed'
            }`}
            type="button"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">bolt</span>
            <span>Buy Now</span>
          </button>
        </div>
      </aside>
    </div>
  );
};
