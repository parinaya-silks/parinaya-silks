> **Current shipping status (11 November 2026):** `DISTANCE_DELIVERY_ENABLED=false` by default. New checkout uses the existing saved flat shipping configuration, before coupons/points, with free shipping strictly above its saved threshold. Google Routes, dispatch coordinates, slabs and distance quotes are inactive. Historical order charges are unchanged. Distance-specific material below describes a retained, inactive implementation until a future explicitly approved re-enable. See [current flat shipping reference](../FLAT_SHIPPING.md).

# Future Google Cloud and Routes delivery setup (inactive)

For the client Google Cloud owner and release maintainer. The application integration is implemented locally; real billing/key/provider acceptance and deployed delivery cutover are **Pending confirmation**. No Cloud account, API key, TTL policy or production setting was changed for this guide.

## Why this service is needed

Delivery prices use actual driving distance from the approved dispatch origin, not an aerial approximation. The backend calls Routes API `computeRoutes`; the browser's optional map uses Leaflet/OSM tiles. Opening the map successfully does not prove Google routing is configured, and Google setup does not guarantee OSM tile availability.

There is no pickup option, flat-fee fallback or production mock switch. Missing configuration blocks new distance checkout safely. Existing historical order totals and accepted pending payment recovery are not recalculated.

## Owner preparation

1. Choose a client-owned Google Cloud project and identify its billing administrator, API administrator and operational contact. Project ID, billing account and ownership are **Pending confirmation**; do not invent an account to match the Firebase name.
2. Associate an approved active billing account. Confirm payment method, access and commercial responsibility privately.
3. Enable **Routes API** in that project. Review current official product availability, pricing and applicable terms before production use.
4. Create a server-side API key. Restrict it to Routes API and choose application restrictions compatible with the actual Vercel hosting/network environment. A browser HTTP-referrer restriction is not a substitute for server access controls. Static egress availability is **Pending confirmation**; do not configure guessed IP restrictions.
5. Set usage quotas, budget alerts and owner-monitored notifications. Budget alerts must not be represented as guaranteed spend caps. Agree usage monitoring and escalation thresholds.
6. Store the key privately as **`GOOGLE_MAPS_API_KEY`**, server-side, in Vercel Production. Never use a `VITE_` prefix, commit the value or expose it in API errors. Use a separate restricted development key for intentional real local route checks.
7. Coordinate a separately approved deployment so functions receive the variable. Saving a variable does not alter an already deployed function. Production deployment is not performed by this document.

Use [Google Routes documentation](https://developers.google.com/maps/documentation/routes) and [Routes policies](https://developers.google.com/maps/documentation/routes/policies) for current console instructions/terms. Exact current console navigation and account activation state are **Pending confirmation**.

## Store configuration and data cleanup

With the intended application deployed through an approved cutover, save the real dispatch name/address/coordinates and active status in Admin → Settings. The optional Google Maps link is not automatically geocoded. Confirm the pin is the shop's actual dispatch origin, not the public contact office or initial map centre.

Save owner-approved ordered slabs, enabled ranges, free-shipping threshold and COD preference. Sample unsaved values are 5/10/20/30 km and ₹40/₹60/₹90/₹120 with ₹10,000 free eligibility; they are examples, not an approved policy. Coverage precedes free eligibility; disabled and beyond-maximum destinations remain unavailable.

Configure Firestore TTL for `deliveryQuotes.deleteAfter` and `deliveryQuoteLimits.expiresAt`, or an approved equivalent short-lived cleanup. Both are Timestamp fields. TTL is an operational configuration and was not published by adding those fields. Application expiry rejects old quotes immediately, independent of delayed deletion. Confirm privacy, Google data retention and cleanup compliance with the owner's responsible reviewer.

Review OSM traffic suitability and attribution. Standard public tiles are best-effort, without an application SLA or unlimited entitlement. Keep attribution and ordinary browser caching/Referer behaviour; do not bulk-prefetch. See [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/). A commercial/alternative compatible tile-host decision, if needed, requires separate application/configuration work; this guide does not claim a tile-provider selector exists.

## Real acceptance after separate approval

Use the actual approved origin and a non-sensitive, approved destination. A route quotation does not reserve stock, but can create temporary private quote/rate-limit documents and incur provider charges; obtain approval before using Production for it.

- Confirm the provider returns a plausible driving route/distance and the expected configured slab; record only a sanitized outcome and date, not the full provider response/customer address.
- Check a manual postal address and an intentionally selected pin. Confirm full postal fields remain required.
- Verify upper-bound inclusivity, a disabled/out-of-range destination, and threshold eligibility after coupons/before points. Use mocks/emulators for exhaustive boundary cases; do not generate unnecessary billable requests.
- Verify failure presentation when appropriate in a safe environment. Never remove a live key merely to test a failure without an approved maintenance plan.
- Perform separately authorized checkout acceptance and confirm final fee/quote validation. A quote alone is not end-to-end order acceptance.

Current real route results and Production acceptance: **Pending confirmation**. Existing synthetic route tests demonstrate application behaviour only.

## Troubleshooting

| Symptom | Safe checks | Owner |
| --- | --- | --- |
| Delivery calculation unavailable | Key presence/scope/injection; active origin; road-pricing validity; billing/API access; quota/provider availability | Developer and Cloud owner |
| Map tiles fail but address form works | Network/tile policy, attribution and usage; manual address remains available | Developer/service owner |
| Location out of range | Actual destination/pin and configured enabled slab; free shipping must not bypass coverage | Store owner |
| Quote expired/changed | Refresh review; inspect address/settings revision and cached-quote recovery | Customer/support, then developer |
| Provider rejects request | Inspect safe status/request diagnostics; key restriction/API/billing compatibility; never log the key or address | Developer and Cloud owner |
| Checkout blocked after release | Verify coordinated configuration/cutover; do not add a guessed flat or straight-line fee | Release owner |

Implementation sources: `server/routes.ts`, `server/deliveryQuotes.ts`, `src/shipping/distance.ts`, `server/storeSettings.ts`, `src/delivery/LocationPicker.tsx`. Reused detail: [DISTANCE_DELIVERY.md](../DISTANCE_DELIVERY.md).
