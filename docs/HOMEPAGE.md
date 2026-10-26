# Approved customer homepage

Implemented from the supplied mobile Stitch screenshot, HTML and DESIGN.md. No separate desktop screenshot was supplied: desktop uses the same section order, with a four-column product grid, three campaign cards and a split spotlight. Admin shell, typography sizing and business workflows are unchanged.

## Section mapping

| Design section | Existing source and behavior |
| --- | --- |
| Header / five bottom tabs | Shared customer Header and MobileBottomNav, approved `parinaya_logo.png`, existing routes and actual shopping counts. Mobile header contains Menu, brand and Search only. Desktop adds navigation, Wishlist, Bag and Account. |
| Hero | Existing `siteSettings/storeContent.banners` public projection. Saved order, enabled state, schedule and destination validation stay server-controlled. Zero banners shows a neutral Shop link, never a sample photograph. |
| Shop by collection | Existing `featuredCategoryIds` and eligible public `featuredCategories`, in saved order. Artwork is the first matching eligible product cover in the loaded public catalogue; a neutral icon is used when none is loaded. No category image fields or sample categories are created. |
| Information strip | Truthful links to Shop, Shipping Policy and Contact. No hardcoded certifications or insurance guarantees. |
| New Arrivals | Four newest eligible published products from the existing browse API (`sort=newest`, descending ID tie-break), not a new collection. New Arrival badges appear only when the saved product flag is present. View All opens Shop. |
| Occasion Curations | First three live campaigns from the existing public campaign list, retaining saved display order. Links use permanent campaign slugs. No campaign-based pricing or new discounts are introduced. |
| Curator's Spotlight | First eligible existing homepage `featuredProductIds` assignment. Uses that product's real cover, name, description and product destination. Hidden when no eligible assignment exists. Other assignment records are preserved. |
| Story card | Saved public About Us heading and introduction, falling back to its first story paragraph. Hidden when About Us has never been explicitly saved. Links to the existing About page. |
| Footer | Existing `footer-brand`, `footer-support`, public Contact Information, social links and configured WhatsApp behavior. Homepage-only compact footer; other storefront pages retain their existing footer. |

No loyalty promotion appears in the approved design, so none is added. Existing account balances and checkout redemption remain untouched; the homepage makes no loyalty account requests.

## Small editable copy extension

Two bounded HomeText entries are added to the existing Website Content registry and editor:

- **New Arrivals Section** → `textSections.home-new-arrivals`.
- **Occasion Curations Section** → `textSections.home-campaigns`.

Both use the existing heading/supportingText/description fields, private source document, revision checks, dual administrator authorization and narrow public projection. Missing entries use neutral section labels. Explicitly blank saved headings remain blank. Featured Sarees Section (`home-featured`) supplies spotlight copy; Shop by Category (`home-categories`) retains category-rail copy. No alternate CMS, sidebar section, new upload facility, migration or read-side initialization is added.

## Necessary differences from prototype

- The prototype's “100% Online Payments Only / No COD” block is incorrect for this application. The matching footer panel states the actual COD behavior and that online payments are unavailable. Checkout/payment logic is unchanged.
- Certification, pure-gold-zari, insurance, video appointments and limited-stock promises are omitted unless present in actual saved content. Sample names, descriptions, prices, badges, contact details and pictures are not application fallbacks.
- Variant products use **Choose colour**, unavailable products disable Add, and accepted shopping changes use the existing confirmation/retry notices. Product links stay usable while actions are pending. Wishlist buttons are independent of product links.
- The brand treatment uses the existing local Lora font and local Lucide SVG icons, with the existing sans-serif stack. No new font CDN or scripts are added. Existing site metadata, canonical handling and analytics are preserved.
- Primary touch controls have at least 44px height even where the export uses smaller controls. The exact five tabs are Home, Shop, Wishlist, Bag and Account.

## Artwork and responsive behavior

Product cards reserve a strict **3:4** image cell and use contain sizing, preserving 960 × 1280 saree proportions. Lazy-loaded images do not expand the cell through their intrinsic dimensions. Images that fail show a neutral placeholder.

Hero desktop retains **8:3** (1600 × 600). Public mobile now uses **3:2**, matching the shallow Stitch composition instead of the previous square. The shared mobile banner preview is updated to 3:2 for consistency. Existing portrait/square uploads are cropped more at top/bottom; their saved focal point remains authoritative. Campaign teaser tiles also use intentional focal-point crops; the actual campaign-page artwork layout is unchanged. Review saved artwork in the existing Banners preview before release. No media is rewritten, removed or uploaded automatically.

Responsive picture sources select the mobile hero first; desktop artwork is not downloaded unnecessarily on mobile. If mobile artwork fails, desktop is attempted as a fallback. If all artwork fails, the frame and saved overlay/CTA remain usable. Initial hero imagery is eager/high priority; lower imagery is lazy. Empty optional headings do not create duplicate artwork overlays.

Carousel controls keep pause, previous/next and direct slide access. Existing five-second rotation pauses for focus, hover, reduced motion, hidden tabs and explicit pause. Listeners/timers are cleaned up. Public content and campaigns refresh through their existing trusted-time sources; failures remove stale promotions and expose isolated retries.

The category rail scrolls internally without widening the page. Footer padding and floating WhatsApp positioning respect mobile navigation and safe areas. Navigation drawer traps focus, locks body scroll, closes with Escape and restores trigger focus. Authentication retains its existing tablet bottom-navigation breakpoint.

## Validation and release

- `src/home/model.test.tsx`: deterministic newest selection, real price/badge/card states, category fallback, bounded CMS projection.
- `scripts/homepage-browser.test.py`: actual loopback API/Auth/Firestore, widths 320/390/768/1024/1440/1920, zero/one/multiple/artwork-only/long heroes, mobile media selection/fallback, empty/error/retry isolation, guest sign-in restoration, Wishlist/Bag counts and duplicate protection, variants, unavailable products, search, drawer accessibility and sign-out isolation.
- Existing content/banner/campaign/catalog/shopping emulator tests and affected storefront/browser regressions are reused.

Synthetic fixture data and sample-asset comparisons are isolated to loopback tests and ignored `.cache` files. The fixture tool refuses non-loopback environments. No production mutations or media uploads are needed.

No new Firestore rules, indexes, serverless functions or environment variables are required. Release still requires the owner's normal code review/commit/deployment and a read-only hosted acceptance check. Real banners, assignments, campaigns, About text and contact information determine which optional sections appear. Nothing is seeded or activated in production by this work.
