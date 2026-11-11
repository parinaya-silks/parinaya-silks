> **Current shipping status (11 November 2026):** `DISTANCE_DELIVERY_ENABLED=false` by default. New checkout uses the existing saved flat shipping configuration, before coupons/points, with free shipping strictly above its saved threshold. Google Routes, dispatch coordinates, slabs and distance quotes are inactive. Historical order charges are unchanged. Distance-specific material below describes a retained, inactive implementation until a future explicitly approved re-enable. See [current flat shipping reference](FLAT_SHIPPING.md).

# Distance delivery and COD configuration (inactive)

## Scope and rollout boundary

All new orders require an address and a trusted driving-distance quote. There is no pickup option and no online-payment OFF setting. Historical orders retain their saved amounts, addresses, payment evidence and delivery metadata.

**Do not deploy this change until the owner accepts the checkout cutover and Google setup is complete.** New orders deliberately stop when the origin, distance pricing or Google configuration is unavailable. A previous flat/all-India configuration is readable for migration but cannot authorize new orders. Existing pending online payments, recovery, webhooks, reconciliation and refunds continue independently of new-delivery readiness.

## Admin → Store Settings

- Dispatch Location: private name, full address, latitude, longitude, optional Google Maps URL and active status. Enter the owner's actual location; the application does not guess KPHB coordinates or copy the public contact address. Manual coordinates and the optional map are supported.
- Distance-based Delivery Pricing: 1–20 ordered upper bounds in kilometres and fees in INR. Initial **unsaved** defaults are 5/10/20/30 km for ₹40/60/90/120. The first range starts at zero; later ranges start above the previous maximum. Duplicate/reversed bounds are invalid. Disabling a range makes that range unavailable; it does not redirect customers to a more expensive range. Beyond the highest configured bound is unavailable.
- Free shipping: initially enabled at ₹10,000. Eligibility is merchandise at the current product selling price, minus coupon discounts, **before Loyalty Points**. The threshold is inclusive. Coverage is checked first: free shipping cannot enable a disabled or out-of-range destination.
- Cash on Delivery: ON/OFF for new COD orders only. An absent setting preserves COD availability; a malformed saved setting fails closed. Online payments retain the existing credential, mode, activation, account and worker-readiness safeguards.

Changes apply only after successful Save. Existing revision checks, operation replay protection and both administrator checks remain in force. Cancel/discard and conflicting-edit review apply to the new fields too.

## Customer addresses and maps

The full postal address and recipient contact remain mandatory, whether entering an address manually or selecting a pin. Pins are optional and stored as `coordinates: {latitude, longitude}` on the existing UID-owned address document. A pin is never treated as a complete postal address. Existing addresses without coordinates remain usable.

Leaflet 1.9.4 is bundled locally and its interactive code is loaded on demand. The map uses standard OpenStreetMap tiles with visible attribution, browser caching and no bulk downloads/prefetch. Map use needs no browser geolocation permission. Keyboard/manual coordinates and full manual address entry remain available when map tiles cannot load.

OSM's public tile service is best-effort, has no SLA, can block inappropriate/heavy usage, and is not an unlimited hosting entitlement. Review expected traffic before release and choose an appropriate OSM-compatible tile host if required. Do not remove attribution or suppress the browser Referer. https://operations.osmfoundation.org/policies/tiles/

The OSM map displays only the customer's/admin's own selected pin. Google routes, polylines and Google-resolved coordinates are not rendered on that map.

## Google Cloud / Vercel setup (not performed by this implementation)

1. Enable billing in the chosen Google Cloud project and enable **Routes API**.
2. Create a restricted server-side API key; restrict it to Routes API. Use application restrictions compatible with the hosting environment rather than a browser HTTP-referrer restriction. Set quotas/billing alerts.
3. Add **`GOOGLE_MAPS_API_KEY`** to Vercel **Production**, server-side only, then redeploy through the approved release workflow. Do not use a `VITE_` prefix. Use a separate restricted development key locally if performing real local route checks. Preview has no need for the production key.
4. Configure and save the approved active origin, distance slabs, free-shipping threshold and COD preference in Admin. A public Contact Information address is not a substitute.
5. Review the public privacy/terms disclosures for Google processing and applicable attribution/licensing requirements before launch. Google policy: https://developers.google.com/maps/documentation/routes/policies
6. Before production use, configure Firestore TTL for `deliveryQuotes.deleteAfter` and `deliveryQuoteLimits.expiresAt`, or an approved equivalent short-lived cleanup policy. No TTL configuration was published here. Expiry is enforced by application checks immediately, independently of delayed TTL deletion. Quotes contain temporary routing/location data and must not be retained as an archive; ensure cleanup/retention complies with the Google agreement. No route response is copied into historical orders.
7. Perform a real, read-only route quotation and separately approved checkout acceptance with the owner's real origin/address. Mocked tests do not establish Google account/API readiness.

Google request: backend POST `https://routes.googleapis.com/directions/v2:computeRoutes`, `DRIVE`, primary route, minimal field mask, eight-second timeout. A selected pin supplies destination coordinates directly. For manual/legacy addresses, Routes resolves the complete address internally; the returned endpoint is bound into the quote. Ambiguous/partial matches, missing routes and invalid responses fail safely. No extra paid Maps JavaScript or standalone geocoding dependency is used.

No mock environment variable exists. Injected route calculators are rejected unless both Firebase emulators are on the known loopback ports and the process is not hosted on Vercel. Automated route tests use synthetic responses only.

## Server trust and data

- Existing `orders:review` prepares the route outside transactions and returns a five-minute quote. Review refreshes can reuse a matching unexpired quote rather than repeating a billable route request.
- Private `deliveryQuotes/{opaqueId}` binds UID, address ID/revision/content hash, destination coordinates, dispatch/pricing revisions, road metres, merchandise subtotal, fee, free eligibility and expiry. Quote creation is limited per UID/minute and never reserves inventory.
- Final COD placement and Razorpay reservation read and revalidate the quote and current settings in the existing transaction. Browser-supplied prices/fees are rejected. Coupons and points are revalidated in that transaction too.
- Quote IDs and expiration timestamps are excluded from the semantic review fingerprint so an identical refreshed quote does not force a navigation loop; amounts, settings revisions, address, COD availability, products and discounts remain bound. A supplied quote is always checked independently.
- New orders save a business `deliverySnapshot` (quote reference, config revisions, slab maximum, fee, free status and quotation time) and calculation policy `road-distance-post-coupon-before-points-v2`. Raw Google routes/distance/location results are not copied into that snapshot.
- Settings: `siteSettings/dispatchLocation` v1, `siteSettings/shipping` v2, `siteSettings/codAvailability` v1. Existing `siteSettings/shippingRevision` invalidates customer reviews after origin, pricing or COD edits. Full configuration remains private.
- Accepted operation receipts are checked before new-order validations. Disabling COD or changing an origin does not invalidate an already accepted order or its recovery receipt.
- No Firestore rule/index deployment is required: existing private-settings/default-deny protections cover new documents; all quote access is through the authenticated backend, using direct document references. TTL is a separate operational cleanup step.

## Focused verification commands

```
node --import tsx --test src/shipping/distance.test.ts src/shipping/model.test.ts src/delivery/model.test.ts src/admin/settings/model.test.ts src/orders/model.test.ts src/loyalty/model.test.ts src/payments/security.test.ts src/checkout/source.test.ts src/checkout/presentation.test.tsx src/orders/customerPresentation.test.tsx src/admin/orders/detailModel.test.ts
```

Use the existing `test:client-changes` harness with `PARINAYA_CLIENT_SERVICES_ONLY=1` and `PARINAYA_CLIENT_SERVICE_FILES=distance-delivery-emulator,payments-emulator,payment-cutover-emulator,delivery-update-emulator,settings-emulator` for loopback integration checks. `PARINAYA_CLIENT_BROWSER_ONLY=1` and `PARINAYA_CLIENT_FILES=distance-delivery` select the focused browser check. Never run fixture scripts against production.

Also run TypeScript, production build, Catalog/payment packaged-runtime checks and `git diff --check`. No real Google request, real payment, production setting, rule/index, order or account is changed by these tests.

## Local validation (2026-11-09)

- Focused unit tests: 45 passed, zero failures.
- Firestore/Auth emulator checks: 29 passed across distance delivery, Razorpay, payment cutover, optional shipment updates, combined settings, coupons, loyalty and delivery award regression suites. This includes reservation/capture/release/refund, mode/key isolation, dual admin authorization, stale/tampered quotes, ownership and exact operation recovery.
- Focused Chromium browser flow: manual legacy address, map pin persistence, checkout stage stability, rejected cached quote recovery, COD OFF, settings save/reload; layouts at 320, 390, 768 and 1440 px.
- TypeScript (`npm run lint`) and production frontend build passed. Existing large-chunk build advisory remains.
- Catalog and payments Vercel packaged-runtime checks passed using builder 24.0.3, Node 24 artifacts executed locally on Node 22.22.2; no tsx runtime loader. Packaged webhook bytes/signature checks also passed in the payment integration suite.
- No real Google route request, hosted checkout, real Razorpay transaction or production configuration/data change was performed. No commit, push, merge or deployment.

Screenshots are local test fixtures under `.cache/distance-delivery/` (checkout/settings at each reviewed width, plus `map-mobile.png`). The map tile image is intercepted in automated tests; these images do not establish public OSM tile availability.

## Exact implementation file list

- `.env.example`
- `docs/DELIVERY_REVIEW.md`
- `docs/DISTANCE_DELIVERY.md`
- `docs/SHIPPING.md`
- `docs/STORE_SETTINGS.md`
- `package-lock.json`
- `package.json`
- `scripts/catalog-emulator-server.ts`
- `scripts/coupons-emulator.test.ts`
- `scripts/distance-delivery-browser.test.py`
- `scripts/distance-delivery-emulator.test.ts`
- `scripts/distance-delivery-fixture-control.ts`
- `scripts/loyalty-emulator.test.ts`
- `scripts/payments-emulator.test.ts`
- `scripts/settings-emulator.test.ts`
- `server/catalog.ts`
- `server/delivery.ts`
- `server/deliveryQuotes.ts`
- `server/orders.ts`
- `server/payments/service.ts`
- `server/routes.ts`
- `server/shipping.ts`
- `server/storeSettings.ts`
- `src/admin/settings/DeliverySettingsFields.tsx`
- `src/admin/settings/StoreSettingsPage.tsx`
- `src/admin/settings/model.ts`
- `src/admin/settings/settings.css`
- `src/checkout/CheckoutPresentation.tsx`
- `src/components/modalLayer.ts`
- `src/delivery/AddressEditor.tsx`
- `src/delivery/LocationPicker.tsx`
- `src/delivery/locationPicker.css`
- `src/delivery/model.ts`
- `src/delivery/useCheckoutReview.ts`
- `src/orders/model.ts`
- `src/orders/useCodOrder.ts`
- `src/payments/useOnlinePayment.ts`
- `src/shipping/AdminShippingSettings.tsx`
- `src/shipping/distance.test.ts`
- `src/shipping/distance.ts`
- `src/shipping/model.ts`
- `src/views/CheckoutView.tsx`
