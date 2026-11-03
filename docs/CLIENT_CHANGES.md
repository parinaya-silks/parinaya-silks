# Approved client changes — local handoff

Implemented in the existing application. No commit, push, deployment, security-rule/index publication or production data repair was performed.

## Seven changes

| Change | Implementation and main files |
| --- | --- |
| Shop discount badge | `src/products/model.ts` derives the floored percentage with integer paise/BigInt; `adapter.ts` supplies it to `src/views/ShopView.tsx`. Compact maroon badge, clear of the Wishlist target. Invalid, zero, missing or non-discounted prices hide it. Shop, category, search and campaign use the same cards. No price or stored discount changes. |
| Hex colour entry | `src/admin/AdminProductForm.tsx` uses labelled text inputs and decorative swatches. Shared client/server validation accepts `#RGB` or `#RRGGBB`, saves uppercase six digits, retains optional blank main colour and rejects invalid variant hex. Existing variant IDs, SKUs, quantities, mode safeguards and conflict recovery remain. |
| Social controls | `src/contact/FloatingSocial.tsx`, `socialLinks.ts`, `social.css` use only the existing public Contact projection and URL helper. Instagram/Facebook only; this schema has no separate social visibility switches, so clearing a saved link is its existing off setting. Desktop keeps fixed right-side links on browsing screens. Through the existing 1100px navigation breakpoint, labelled links appear near the bottom of the shared navigation drawer; no standalone social row or reserved space remains beneath the header. Existing WhatsApp remains separate; no duplicate action or SDK. See [mobile social verification](SOCIAL_DRAWER.md). |
| Recent Unveiled | Homepage heading and associated visible badges/admin labels are renamed. The `home-new-arrivals` key, `newArrival` flag, internal tag, routes and selection rules remain. No expiry. The homepage heading uses the exact requested wording while retaining saved supporting copy. |
| Parinaya Sarees | `src/config/brand.ts` centralizes shell/SEO display branding. Storefront, Admin, authentication, checkout/orders, policy shell/fallback copy, generated enquiry acknowledgement and accessibility labels use the new name. Infrastructure and existing content records remain unchanged. |
| Product reel | Optional `videoUrl` in the existing product input/save/public projection, Admin field and Product Details link. Exact HTTPS host allowlist, no credentials/ports/lookalikes/unsafe schemes; no server URL fetch, embedding or autoplay. Clearing saves an empty string; invalid stored values are withheld from the public reel action. New tabs use `noopener noreferrer`. |
| Delivery earning | `server/loyalty.ts` and `loyaltyEligibility.ts` settle eligible saved terms on the trusted Delivered transition, independent of collection. Redemption calculations, reservation/receipt recovery, settings snapshots, rounding, coupons, shipping, refunds and debt remain server authoritative. |

## API compatibility and security

`videoUrl?: string` is the only new product field. Schema version stays 1. Older records and clients that omit it remain valid; missing values normalize to `''`. Existing saves preserve unrelated stored fields. No second endpoint, media upload system or new public/private settings document is introduced.

Supported reel hosts are `instagram.com`, `www.instagram.com`, `facebook.com`, `www.facebook.com`, `m.facebook.com`, `fb.watch`, `youtube.com`, `www.youtube.com`, `m.youtube.com` and `youtu.be`. A non-root resource path is required. The destination is validated, not fetched or guaranteed to remain available on the external platform.

Customer ownership remains token based. Both the `admin: true` claim and enabled `adminAccess/{uid}` record remain required by the existing API. Browser writes to protected balances, ledger, product and settings documents are not enabled. No rules or indexes need changing for these additions.

## Loyalty before and after

Before: Delivered plus recorded COD collection settled reservations and credited earnings.

After: the trusted Delivered transition settles an eligible pending snapshot. `{orderId}_earned` remains the stable award identity; the ledger, account projection and order lifecycle update commit in one transaction. Same-operation receipt recovery, concurrent/repeated transitions and later collection cannot add another award. Processing, dispatch and collection alone do not earn. Delivery never sets payment collection.

Eligibility comes from the saved enabled configuration, earning basis, line allocations and expected whole points. An already refunded, reversed, returned or awarded order cannot regain points through delivery updates. Collected returns retain the existing allocated financial-refund path. Resolving an unpaid delivered return reverses credited earnings and restores redemption atomically without inventing a cash refund. Debt arithmetic remains intact when earnings have been spent.

Customer/Admin explanations now describe delivery earning. A historical Delivered order whose snapshot is still pending says its expected points await store review, rather than implying delivery has not happened. Existing immutable ledger reasons are not rewritten. Existing focus/reconnect refresh and mutation reloads remain; no polling was added.

## Historical uncredited orders: separate explicit review

No production history was scanned, counted or credited. Whether production has eligible uncredited historical orders remains unverified. Already Delivered pending orders deliberately do not settle merely because someone edits notes or records collection later.

`server/loyaltyRepair.ts` and `scripts/repair-delivery-awards.ts` provide a workstation-only procedure, absent from the catalog API. It accepts **1–25 explicit, distinct reviewed order IDs**, never scans a collection, and defaults to read-only. Using the existing secure Admin environment, the review command is:

```powershell
node --import tsx scripts/repair-delivery-awards.ts <reviewed-order-id> [another-reviewed-order-id]
```

It explicitly targets `parinaya-silks` / `(default)`, validates the owner, Delivered status, pending eligible saved terms, exact snapshot math, placement reservation and account conservation, and checks the stable award entry. Missing snapshots, previous awards/refunds/reversals/restorations, active/resolved returns and inconsistent allocations are excluded. Current loyalty settings cannot qualify a historical ineligible order.

Only after a **separate explicit production repair instruction**, the same reviewed IDs can be applied with `--apply --confirm-project=parinaya-silks`. Each order is processed in its own recoverable transaction through the same earning transition. The allowed write scope is that order's loyalty lifecycle, revision/updated timestamp, its stable redeemed/earned ledger entries and the owner's merged loyalty balance projection. No payment status, stock, commercial snapshot or unrelated fields are changed. Exact-ID reruns skip existing awards; competing repairs cannot duplicate credit. Review errors stop processing; completed IDs remain safely rerunnable. No production invocation of either mode was made here.

## Validation and screenshots

All writes were confined to guarded loopback Auth/Firestore fixtures. External social/video destinations were not opened. Cloudinary image delivery in browser fixtures was stubbed.

- `npm.cmd test`: 166 passing unit/handler/model tests, including invalid badges/URLs, legacy hex normalization, brand/infra separation and truthful historical pending copy.
- `npm.cmd run lint`: TypeScript check.
- `npm.cmd run build`: production Vite build. The existing large-chunk advisory remains; no new dependency was added.
- `npm.cmd run test:client-changes`: eight emulator groups (admin, customer and category rules; catalog; campaigns; loyalty; delivery awards/repair; contact), plus browser suites for these changes, checkout Apply/Remove/recovery, Wishlist/Bag and customer order states.
- `npm.cmd run test:catalog-runtime`: packaged Vercel handler executes with require(ESM) enabled and disabled. Pinned builder 24.0.3 emits a nodejs24.x artifact; invocation uses the available local Node 22.22.2, not a hosted Node 24 runtime.

The delivery tests cover unpaid delivery, earlier/later collection, repeated and concurrent transitions, transaction rollback, stable existing awards, resolved returns, already-spent refund debt, default-dry-run and concurrent repair, and invalid conservation/snapshot exclusions. Catalog tests use the real service/public API for reel save/edit/clear and hex edits while preserving stock, identities and unrelated fields.

Captures exist for **320, 390, 768, 1440 and 1920px**:

- [Shop discounts and branding, mobile](../.cache/client-changes/shop-discounts-social-390.png) / [desktop](../.cache/client-changes/shop-discounts-social-1440.png).
- [Mobile drawer social links](../.cache/client-changes/social-open-390.png).
- [Recent Unveiled](../.cache/client-changes/recent-brand-390.png).
- [Variant hex input](../.cache/client-changes/admin-variant-hex-viewport-390.png) / [optional blank main hex](../.cache/client-changes/admin-main-hex-viewport-390.png).
- [Product reel](../.cache/client-changes/reel-brand-viewport-390.png).
- [Delivery-based checkout points copy](../.cache/checkout-design/delivery-points-390.png).
- [Historical Delivered pending review](../.cache/customer-order-design/delivered-pending-review-390.png).

Other width variants use the same filename stem. `.cache` is intentionally ignored by Git. Screenshots show synthetic local products/contact settings, not production content. External icon-font loading was blocked by the offline browser fixture; local Lora and the new SVG social/play icons remain available. Hosted browser acceptance is outstanding.

## Branding content and release dependencies

The bundled root `parinaya_logo.png` was visually inspected: it reads **PARINAYA**, with no “Silks” suffix, so it needs no pixel edit. `BrandLogo` still uses this approved asset, with updated accessible text. No substitute logo was generated.

Owner review is still needed for persisted `siteSettings/storeContent` About headings/story/founder copy, homepage/footer text sections, policies, contact/WhatsApp greeting, and any uploaded banner/campaign/login/founder image containing the old brand. Relevant controls remain in About Us, Website Content, Contact Information, Banners, Sale Campaigns and Login Page Appearance. Production CMS/media were not fetched, so no exact uploaded Cloudinary asset is claimed to have been identified or replaced. Historical order snapshots, enquiry bodies and immutable ledger reasons are preserved.

Release the frontend and `/api/catalog` server changes together: the old server would reject the new product field. No new environment variable, migration, rate change, rule publication or index creation is required by this task. Existing enabled loyalty configuration and the existing public Contact links continue to govern availability. A production deployment and authorized hosted smoke check are still required; neither is claimed complete by local tests. Historical repair and CMS/media replacements remain separate owner-approved actions.
