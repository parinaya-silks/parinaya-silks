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
`POST {action: "coupons:available", source?, eligibleOnly?}` additionally verifies the customer
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

### Checkout Available Coupons selector

The Review step now has a collapsed **Available Coupons** section beside manual
code entry. Opening it fetches `eligibleOnly: true` through the same authenticated
endpoint. This boolean filters the existing server projection to `eligible`
offers only: future, expired, disabled, private, exhausted, below-minimum and
not-yet-unlocked sequence offers are omitted. Other storefront offer sections
keep their existing informational/upcoming behavior. An empty response explicitly
says **No offers available for this order right now.** Loading skeletons and a
separate retryable failure state never pretend to be an empty result.

Coupon cards derive their description from the saved discount type/value; the
current coupon schema has no separate title/description, product/category scope
or arbitrary customer allowlist. Existing customer restrictions are the saved
per-customer usage limit and exact Delivered-order sequence. No new eligibility
fields or coupon system are introduced. Cancelled, Rejected and other non-Delivered
orders do not unlock a sequence offer.

Apply populates manual entry and requests the existing trusted checkout review.
Only a successful current review displays **Coupon applied**, savings and the
card's **Applied** indicator. Either Remove action clears the same draft code and
recalculates totals. Points Apply/Remove and the existing stacking policy remain
unchanged. The selector stays open across review refreshes; the initial full-page
loading view is reserved for an account's first review.

Cart identity (including item IDs, quantities, prices and stock) and the review
fingerprint refresh discovery even when a changed cart has the same subtotal.
While expanded, discovery refreshes every 15 seconds and on focus/reconnection.
A selected coupon also refreshes its authoritative review every 15 seconds while
visible and on focus, suspended during order/payment recovery or submission.
An invalid selected code is explicitly unconfirmed and blocks progression until
removed or corrected. Both COD acceptance and online reservation continue their
original final transaction checks; discovery never reserves or redeems anything.

`scripts/checkout-coupons-browser.test.py` covers the real loopback flow at
320/390/768/1440px in both themes, including loading, keyboard expansion, retry,
empty results, Apply/Applied/Remove, trusted totals and live cart changes. The
exported-handler assertions in `theme-offers-emulator.test.ts` cover token
ownership, exact input rejection, lifecycle/limit filtering, Delivered-only
sequence qualification and empty carts. Existing coupon/payment transaction
regressions continue to cover concurrent redemption and reservations.

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
