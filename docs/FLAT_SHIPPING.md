# Active flat shipping and inactive distance delivery

Current local implementation: 11 November 2026. No Production configuration/data, provider settings or deployment was changed for this work.

## Active policy and exact historical source

`DISTANCE_DELIVERY_ENABLED=false` is the safe default in `server/deliveryMode.ts` and the documented value in `.env.example`. Only an exact server-side `true` can explicitly opt into the retained distance branch. No browser flag or checkout payload can enable it.

The previous implementation is preserved in Git commit `7b5e54e` (`Address management and checkout P2`) and in HEAD `405716c`, at `src/shipping/model.ts`:

- Initial draft/local-seed fee: **₹99 = 9,900 paise**.
- Initial enabled free-shipping threshold: **₹10,000 = 1,000,000 paise**.
- Free shipping qualifies only when original merchandise subtotal is **strictly greater than** the saved threshold, before coupons and Loyalty Points. Equality pays the configured flat fee.
- Saved valid Admin shipping configuration is authoritative. The historic default was not a permission to substitute ₹99 for missing/invalid settings or overwrite a different approved saved fee.

| Merchandise subtotal with the historical default settings | Shipping |
| --- | --- |
| ₹9,999.99 | ₹99 |
| ₹10,000.00 | ₹99 |
| ₹10,000.01 | Free |

The existing `quoteShipping` helper and new-order calculation policy `pre-coupon-strict-shipping-v1` are active again. Coupons and Loyalty Points reduce payable merchandise after shipping qualification. Their validation, usage, reservations, earnings and recovery remain server-authoritative.

## Backend and customer behaviour

- The disabled order service does not instantiate/use distance quotes, request Google Routes, calculate driving distance, read dispatch origin/slabs or require quote IDs/coordinates.
- A supplied stale/invalid distance quote field does not change or authorize the flat amount. Browser-submitted shipping totals remain rejected.
- The route adapter and quote service also reject direct use while the server flag is disabled, before provider requests or quote writes.
- Missing Google billing/key/API configuration cannot block flat checkout. Missing/invalid **flat shipping settings** still require trusted Admin review, just as before; no invented fee is used.
- Checkout shows the restored pre-coupon strict-threshold rule. Ordinary checkout does not mount the map picker or depend on its tiles. Existing address coordinates are preserved; manual postal/contact fields remain required.
- Admin Settings shows the flat editor while disabled, preserves existing COD availability and introduces no payment toggle. Backend shipping writes reject road-distance settings while disabled.

An existing saved `road-distance` settings document is not converted silently because its `flatFeePaise: 0` was a distance-schema placeholder, not an approved flat fee. If such a document exists in an environment, an authorized owner must save the known approved flat settings through Admin. No Production record was inspected or migrated here. The existing legacy flat document requires no migration.

## History and commerce

Existing orders retain their original shipping amounts, calculation policy, address, payment/refund evidence and loyalty terms. Accepted-operation recovery remains receipt-based; no historical order is recalculated. Razorpay mode/credentials/activation, signature verification, webhook processing, reconciliation queues and provider refund handling are unchanged. COD and online orders use the same trusted flat calculation for new acceptance.

## Future distance release

The retained route adapter, quote validation, dispatch/slab models, optional picker and guarded emulator tests are not deleted. A future owner-approved release must explicitly enable the server flag, complete Google/provider/retention requirements, save approved distance settings and perform relevant acceptance. It is not currently available merely because those files exist. See the clearly labelled inactive [distance reference](DISTANCE_DELIVERY.md) and [future Google setup](operations/google-routes-setup.md).

## Focused verification

Focused coverage is in `src/shipping/mode.test.ts`, existing shipping tests and `scripts/flat-shipping-emulator.test.ts`. It checks default-off semantics, zero route HTTP requests, no quote/rate-limit writes, invalid dormant origin isolation, exact threshold boundaries, coupon/points totals, COD idempotency and historical preservation. Existing payment/coupon/loyalty suites exercise reservations, capture/release/refunds and worker safety with flat settings. Dormant distance tests explicitly opt in only inside their guarded test process.

Execution results are reported by the final task report; no real provider transaction or hosted acceptance is inferred from emulator tests. This guide supersedes any historical sentence claiming new orders currently require Google Routes.

## Local check record - 11 November 2026

- 35 focused unit tests passed, with no failures or skips.
- 32 emulator TAP tests across 10 focused service files passed, with no failures or skips. This includes shipping/COD, payments and cutover, coupons, loyalty, settings and explicitly enabled dormant distance coverage.
- TypeScript (`npm.cmd run lint`), production build and diff whitespace checks passed. Existing large-chunk build advisory remains.
- No real Google route, Razorpay transaction, production write or deployment was performed.

## Files changed for this follow-up

- Configuration: `.env.example`, `package.json` (register the mode unit test only; no dependency changes).
- Server: `server/deliveryMode.ts` (new), `server/delivery.ts`, `server/orders.ts`, `server/routes.ts`, `server/deliveryQuotes.ts`, `server/shipping.ts`, `server/storeSettings.ts`.
- Customer/Admin: `src/shipping/model.ts`, `src/shipping/AdminShippingSettings.tsx`, `src/admin/settings/model.ts`, `src/admin/settings/StoreSettingsPage.tsx`, `src/admin/settings/DeliverySettingsFields.tsx`, `src/delivery/AddressManager.tsx`, `src/delivery/AddressEditor.tsx`, `src/views/CheckoutView.tsx`, `src/checkout/CheckoutPresentation.tsx`.
- Focused tests/fixtures: `src/shipping/mode.test.ts` (new), `src/shipping/distance.test.ts`, `scripts/flat-shipping-emulator.test.ts` (new), `scripts/distance-delivery-emulator.test.ts`, `scripts/payments-emulator.test.ts`, `scripts/coupons-emulator.test.ts`, `scripts/loyalty-emulator.test.ts`, `scripts/settings-emulator.test.ts`.
- PDF tooling: `scripts/export-documentation.mjs`, `scripts/export-documentation-pdf.py`, `scripts/verify-documentation-pdf.ps1` (new; existing host Markdown/Chromium/Windows PDF tools, no added dependencies).
- Documentation: this guide, root `README.md`, `docs/README.md`, `docs/overview.md`, `docs/DELIVERY_REVIEW.md`, `docs/DISTANCE_DELIVERY.md`, `docs/SHIPPING.md`, `docs/STORE_SETTINGS.md`, all affected current client/technical/operations/handover guides. Status notices identify inactive distance material without rewriting dated historical evidence.
- Generated deliverables: 82 individual PDFs in `Parinaya_Documents_PDF`, including 80 Markdown documents, the font licence and a separate PDF index. Source-code dumps, environment files, patches and generated test artifacts are excluded.

Pre-existing unrelated changes, payment configuration/settlement/queue code, all production settings/data and historical records are preserved. Test-generated packaging metadata was returned to its previously clean baseline.
