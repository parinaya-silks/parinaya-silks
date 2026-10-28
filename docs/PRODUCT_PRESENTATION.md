# Product gallery and shopping cards: local presentation correction

## Confirmed cause

The recommendation slides had `min-width:200px` (230px above the small breakpoint), `flex-basis:auto`, and `flex-shrink:0`, without a width or maximum width. Their images therefore contributed their intrinsic width to slide sizing. With a 960 x 1280 fixture, computed slides were **962px wide and 1377.5px tall**, including the border and text, at every tested viewport. Smaller cached photos produced smaller slides, confirming the dependence on intrinsic media dimensions. The page kept horizontal scrolling inside the track, but each slide was far larger than the viewport.

The normal main gallery was separate: it filled its column at 4:5, measuring 358 x 447.5px on a 390px viewport and 584 x 730px on desktop. It was not entering the explicit zoom modal automatically.

## Correction

- `ProductDetailView.tsx` and `product-detail.css`: bounded, centered 3:4 gallery with `object-fit:contain`, compact thumbnails and unchanged selection/explicit zoom behavior. At 390px it measures **342 x 456px**; desktop caps it at **480 x 640px**. Intermediate widths adapt to their column. The desktop grid keeps product information adjacent, with a 32px gap.
- Recommendation cards now have an explicit flex basis/width: half the available mobile track minus the 12px gap, and 240px on desktop. Images are contained in bounded 3:4 frames and cannot contribute intrinsic width/height to the slide. At 320px, cards are 138px; at 390px, 173px. One card retains that size. Names and categories are bounded and wrap/clamp without widening the slide. Horizontal scrolling and product selection remain unchanged. Links support keyboard and normal browser navigation.
- Category overlays are removed from Shop/Collections and recommendations. The existing public API resolves category display names from enabled category records (`server/catalog.ts`); `storefrontProduct()` already maps that name to `product.category`. Cards now show it under the name, once. Empty names omit the line. No field, stored fabric value, assignment, eligibility rule or fabric filter is changed.
- The recommendation heading and footer spacing are reduced. Bottom clearance remains 140px plus safe area on mobile and 80px on desktop for the fixed purchase controls/navigation; no arbitrary spacer is added.

Admin, homepage sizing, Lora setup, purchase calculations, authentication, prices, stock, variants and all production data/media remain untouched.

## Evidence and checks

`scripts/product-presentation-browser.test.py` uses only loopback Auth/Firestore/API fixtures and refuses non-emulator execution. A code-native 960 x 1280 SVG fixture supplies realistic intrinsic dimensions around cached photography (or a tracked local fallback). It never rewrites/uploads saved media. The actual source photograph can have its own embedded gutters; containment deliberately preserves those pixels.

Checked widths: **320, 390, 768, 1440, 1920px**. Checks cover computed gallery/card/image bounds, natural image size, containment, one/multiple recommendations, long/missing categories, no page overflow, thumbnails, explicit zoom, category placement on Shop and Collections, real local sign-in/Wishlist/Bag actions, navigation and fixed purchase control clearance.

Also passed: typecheck, 133 unit tests, production build, existing homepage browser regression and existing purchase-journey browser regression (variants/quantities, signed-out Buy Now restoration, independent Bag, checkout stages and local COD order flow). These are local/emulator results, not hosted-production acceptance. The production build retains its existing large-chunk advisory.

Before/after metrics and four aligned screenshot pairs are in ignored `.cache/product-presentation/`:

- `comparison-mobile-gallery.png`
- `comparison-mobile-recommendations.png`
- `comparison-desktop-recommendations.png`
- `comparison-shop-categories.png`

Screenshots use isolated sample photography and local Lora. External icon-font downloads are blocked by the fixture browser, so icon ligatures can appear as clipped text in these offline screenshots; application icon code is unchanged. No source image resolution was reduced to fix sizing.

Nothing was committed, pushed, deployed, uploaded or changed in production. No rule, index, environment or database preparation is required. The owner can review and release the local code through the normal process, then check existing real photographs on the hosted site.
