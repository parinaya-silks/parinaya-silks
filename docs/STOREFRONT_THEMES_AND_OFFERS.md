# Storefront themes and Available Offers

## Owner controls

Admin > Store Settings > Storefront Appearance > Colour Theme offers Classic
Cream and Light Maroon. Selection previews only the card; **Save Theme** applies
it. Cancel discards the selection. Existing Lora typography, artwork, layouts,
semantic statuses and Admin colours are retained.

`siteSettings/storefrontAppearance` contains `schemaVersion: 1`, a positive
`revision`, and `theme: "classic-cream" | "light-maroon"`. Trusted server writes
also record the existing settings operation/audit metadata. Saves check both the
admin claim and enabled access record, use revision conflict protection and merge
unrelated fields. A missing setting defaults to Classic Cream. Public content
exposes only the theme and revision; invalid public appearance safely falls back
to Classic Cream. Other devices refresh within 15 seconds while visible, on
focus/reconnection, or on reopening. No authentication or browser preference is
needed to retain the store's saved theme.

Admin > Coupons > Add/Edit > **Show in Available Offers** publishes discovery
details. This is separate from Enabled. Existing and newly created coupons are
private unless this checkbox is explicitly saved. Private codes can still be
entered manually at checkout. No existing production coupon is auto-published.

## Customer behaviour and security

One component provides offers on Shop/category pages, Product Details, Bag and
the checkout Review step beside the existing coupon input. It does not add a
homepage section. Copy works for guests and customers; guests are asked to sign
in for personal eligibility. Product offers use the selected colour/quantity;
Shop and Bag use current Bag items.

`GET /api/catalog?coupons=available` returns a whitelist of public offer fields.
`POST {action: "coupons:available", source?}` additionally verifies the customer
token and reads only that UID's Delivered orders and usage. Client UID/count
parameters are rejected. This is read-only and does not reserve or redeem a code.
Raw coupon documents, usage, customer identity and audit fields are not public.
An explicit publication flag, validity, enabled state and global/customer usage
limits govern visibility. Read failure is distinct from no offers and leaves
manual checkout coupon entry usable. A bounded 10,000-published-offer limit (matching Admin listing) fails
explicitly rather than exposing partial discovery results.

Validity, usage limits, sequence policy and discount arithmetic reuse checkout's
validators. Order number N means exactly N-1 Delivered orders, including COD
orders with unrecorded collection. Coupon names do not determine the sequence.
Upcoming offers show the remaining Delivered count, eligible offers allow Apply,
and offers already passed or used are omitted. Subtotals use server product data.

Apply on Shop/Bag/Product first invokes the existing `orders:review`, stores one
coupon code in the existing UID-scoped checkout draft and opens checkout. Apply
on Review populates the existing input and triggers its validator. Final
`orders:place` still revalidates coupon, totals, usage, sequence and stock inside
the existing acceptance transaction. Apply/Remove Points is unchanged; coupon
savings are never accumulated by the discovery component.

Offers refresh within 15 seconds while visible, and on focus/reconnection. An
offer may change between discovery and acceptance; checkout remains authoritative.

## Operations and verification

No new environment variables, secrets, functions, rules or composite indexes are
required. The publication query uses the default single-field `discoverable`
index; the existing token-owned Delivered query is reused. No index exemptions
should be introduced for this field. Direct browser access to settings/coupons
continues to be governed by the existing deny rules; all writes use the API.

Unit coverage is included in `npm test`. The loopback service/browser regressions
are `scripts/theme-offers-emulator.test.ts` and
`scripts/theme-offers-browser.test.py`, registered in the existing test harnesses.
They use synthetic data only. Emulator readiness does not prove deployed indexes
or production eligibility. Local screenshots are in `.cache/theme-offers/`.

Release through the existing GitHub/Vercel workflow after typecheck, build,
runtime and regressions. Verify the deployment's commit SHA, READY state, public
appearance/offer projections and responsive pages separately. Real production
coupon redemption and customer-specific eligibility require owner acceptance
with an existing account; no production business records are changed by tests.
