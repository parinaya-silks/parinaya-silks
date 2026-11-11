> **Current shipping status (11 November 2026):** `DISTANCE_DELIVERY_ENABLED=false` by default. New checkout uses the existing saved flat shipping configuration, before coupons/points, with free shipping strictly above its saved threshold. Google Routes, dispatch coordinates, slabs and distance quotes are inactive. Historical order charges are unchanged. Distance-specific material below describes a retained, inactive implementation until a future explicitly approved re-enable. See [current flat shipping reference](../FLAT_SHIPPING.md).

# Retained distance delivery architecture (inactive)

For developers and release owners. Baseline: existing local uncommitted distance-delivery changes, 11 November 2026. Detailed retained implementation/file inventory: [DISTANCE_DELIVERY.md](../DISTANCE_DELIVERY.md). This guide does not establish Google or Production readiness.

## Configuration and addresses

Private `siteSettings/dispatchLocation` v1 contains name, full address, latitude, longitude, optional Google Maps URL, active state and revision/audit metadata. `siteSettings/shipping` v2 contains road-distance slabs and free-shipping settings. `siteSettings/codAvailability` v1 controls new COD acceptance. The combined Store Settings service enforces dual Admin authorization, expected revisions and replay protection.

Dispatch is separate from public contact details. A Maps URL is optional metadata; it is not parsed to guess coordinates. Unsaved defaults do not count as approved configuration. A single revision-only shipping signal invalidates customer reviews after origin, pricing or COD changes.

Owned saved addresses keep full postal/contact fields and optional `coordinates: {latitude, longitude}`. Pins do not remove postal requirements. Legacy/manual addresses remain valid inputs. Address changes update revision and invalidate quote identity. Removing a pin deletes its stored coordinate field through the server save path.

## Browser map and server routes

The optional picker loads Leaflet code on demand and displays OSM standard tiles with attribution. It supports click/drag and manual coordinates, with manual address entry available if tiles fail. It does not request browser geolocation or perform a Google geocoder call. The initial Hyderabad map centre is not a selected dispatch/customer pin.

`server/routes.ts` calls `https://routes.googleapis.com/directions/v2:computeRoutes` using a server-only key, DRIVE, one primary route, minimal field mask and an eight-second timeout. Selected coordinates are submitted directly; otherwise the complete manual postal address is supplied for provider resolution. Missing/bad routes, partial matches and invalid/provider-error responses fail with a safe generic message. No secret or full customer address is leaked in that error.

Google route data/polylines/resolved positions are not rendered on the OSM map. OSM tile availability, usage suitability and provider terms require operational review. See [Google setup](../operations/google-routes-setup.md).

## Quote preparation and validation

1. Existing `orders:review` performs a preliminary trusted product/address/coupon/points review.
2. For a valid address/review, `deliveryQuotes.prepare` reads active origin and road pricing, rate-limits calculation (20 per UID/minute), and calls the route provider outside the order transaction.
3. Fee selection uses the first slab whose upper distance contains the route. The upper bound is inclusive; disabled/out-of-range coverage is unavailable. Free delivery is considered only after coverage succeeds, at or above the threshold after coupons and before points.
4. A private random quote document binds UID, address ID/revision/content identity, destination, origin/pricing revisions, road metres, merchandise basis, fee/free decision and five-minute expiry.
5. Final review and placement transaction re-read quote/settings/address, recompute fee and validate identity, expiry, amounts and revisions. A supplied browser fee cannot authorize an order.

The hook can reuse a matching quote with enough lifetime, refresh before expiry and drop a rejected cached quote before Retry. Quote ID/expiry and quotation time are excluded from the semantic confirmation fingerprint so an identical refresh does not bounce checkout stages. Amounts/settings/address/discount/product terms remain bound; a supplied quote is independently checked.

No quote reserves inventory. COD acceptance and Razorpay reservation consume the final reviewed contract through the existing transaction. Accepted-operation recovery is checked before new settings eligibility. Existing pending online payments can continue reconciliation/resume if new delivery calculation later becomes unavailable.

## Failure and historical behaviour

Missing/inactive origin, invalid or legacy-only pricing, absent/invalid key, Google failure, expired/tampered/foreign quote or unavailable range prevents a new delivery checkout. There is no pickup, straight-line fee, production mock switch or flat-fee fallback. Existing historical orders retain their saved totals/addresses and do not require a new route to display.

New order `deliverySnapshot` stores business evidence: quote reference, configuration revisions, slab maximum, fee/free flag and quotation time. Raw Google routes/distance/resolved destination are not copied into that snapshot. Customer-supplied address coordinates are a separate address field and must be covered by the approved privacy/retention policy.

## Operational dependencies

- Google Cloud billing, Routes API, restricted server key and quotas: **Pending confirmation**.
- Actual dispatch/slabs/threshold and owner cutover acceptance: **Pending confirmation**.
- TTL/equivalent cleanup for `deliveryQuotes.deleteAfter` and `deliveryQuoteLimits.expiresAt`: **Pending confirmation**. Application expiry does not wait for TTL deletion.
- Real route acceptance and separately approved deployed checkout acceptance: **Pending confirmation**.

Injected route doubles are permitted only with the exact loopback Auth/Firestore emulator ports and no hosted Vercel context. They do not prove real API readiness. No provider response or live fixture should be archived in documentation.

Sources: `server/routes.ts`, `server/deliveryQuotes.ts`, `server/delivery.ts`, `server/orders.ts`, `server/storeSettings.ts`, `src/shipping/distance.ts`, `src/shipping/model.ts`, `src/delivery/LocationPicker.tsx`, `src/delivery/useCheckoutReview.ts`, `src/components/modalLayer.ts`. Local dated checks remain in the retained implementation note; they were not rerun for documentation.
