# Approved checkout presentation

Implemented from all six supplied Stitch checkout HTML/screens and their shared DESIGN.md. Work is local only; sample records and simulator handlers are not application data or controls.

## Steps and existing services

| Screen | Canonical route | Behavior |
| --- | --- | --- |
| Delivery | `/checkout` | Existing UID-owned `useAddressBook`, `AddressManager` and `AddressEditor`; saved/default selection, Add/Edit/Delete, client/server validation, revision conflict and recoverable save handling. Continue to Review requires a valid trusted quote and selected address. |
| Order Summary / Review | `/checkout/summary` | Actual items, variants, quantities, unit/line prices, selected address and Change; correct product/Bag editing; coupon Apply/Remove and relevant enabled loyalty controls. Existing `useCheckoutReview` calls authenticated `orders:review`; updated prices require acknowledgement. Continue to Payment approves that review fingerprint and requests revalidation. |
| Payment | `/checkout/payment` | COD only, selected address and final trusted summary. Existing `useCodOrder` calls `orders:place` and `orders:recover`, then navigates to `/order-confirmed/{id}` only after server confirmation. |

The existing `?buyNow={id}` context stays on every step/back link. Buy Now contains the selected product/variant/quantity and leaves the saved Bag unchanged; Bag checkout keeps its established eligible contents and post-acceptance cleanup. No routes or storage formats are added. Draft address/coupon/points, delivery confirmation and approved fingerprint remain in the established UID/context session storage. Typed coupon and points input remain in component state across step/viewport changes. Authentication account changes remount the customer gate by UID. Stale review requests are aborted/ignored by the existing keyed review hook.

Direct later-step navigation still returns to the required prior step. Refresh, browser Back/Forward and expired-source recovery retain their existing validation. Address saves keep the selected address/revision consistent; removed addresses expose the existing recovery notice.

## Presentation and safety

- `CheckoutHeader.tsx`, `CheckoutPresentation.tsx`, `checkout.css` and `CheckoutView.tsx` implement the compact logo/back/care header, three-step progress, desktop content/summary columns, address cards, compact portrait order rows, coupon/points cards, totals, COD card, feedback and legal links. Mobile uses one fixed primary-action bar; the general storefront header, announcement, toast, footer, five-tab navigation and floating contact control do not stack onto checkout. Other storefront routes and Admin retain their existing shells.
- Local Lora is inherited throughout. Icons are local Lucide SVGs; the approved `parinaya_logo.png` remains the graphical brand. No checkout icon-font or CDN dependency is introduced.
- The shared native address dialog keeps focus containment, Escape, focus restoration, edit values, request locks and safe retry identity. Only checkout applies the bottom-sheet/sticky form-actions treatment and close icon. The normal account address layout and internal address limit are retained; the limit is not promoted in checkout.
- A single breakdown renders server-returned items subtotal, optional coupon/points savings, delivery and total. Paise math, minimum payable, coupon compatibility and point limits stay authoritative on the server. Shipping remains based on the **pre-coupon subtotal, strictly greater than the configured threshold**. A zero configured fee is not automatically described as free-threshold eligibility.
- Disabled/irrelevant loyalty redemption is hidden. Pending earnings and reserved points stay separate from the available balance. A changed/disabled program while points were requested displays the trusted reconciliation warning and updated quote; it does not silently claim the old savings or change balances client-side.
- Pending COD submission disables selection changes. “Check order status” reuses the existing durable pending operation and idempotency key; View My Orders is also available. It does not start a second operation or imply cancellation. A mounted-state guard in `useCodOrder` now prevents delayed acknowledgements from navigating or updating a newer screen after checkout unmounts, while retaining recovery storage.
- Opening Delivery/Review only reads existing services. No order, stock deduction, loyalty reservation, notification or production write is introduced by page entry.

## Necessary differences from the prototype

Lora replaces the exports' mixed font stacks as requested. Real saved products, addresses, counts, money, stock and configured shipping replace every screenshot example. The UI does not claim insurance, Silk Mark/zari certification, GST figures, packaging promises, delivery estimates, PIN serviceability, stock reservations or production origin facts not supported by existing records. There is no functioning UPI/card/net-banking/Razorpay control; online payment is explicitly unavailable. Prototype simulator bars, fake success, automatic-location behavior and sample discount calculations are omitted. The contact link leads to the existing Contact page.

## Verification

- Typecheck, 136 unit tests (including three focused rendering regressions), production build and diff checks.
- Design browser: Delivery/Review/Payment at 320, 390, 768 and 1440px; local Lora/SVGs, bounded thumbnails, no overflow/stacked navigation, address dialog/edit/validation/focus/small-height behavior, confirmed save/selection after refresh, coupon and points Apply/Remove/disabled, authoritative totals, price acknowledgement, stock blocking and no order creation on reads.
- Existing purchase-journey and COD browser regressions: Buy Now/Bag isolation, variants/quantity, safe return, staged refresh/Back, local COD confirmation, correctable rejection, lost-response retry, one order and one stock deduction. New context browser explicitly holds an accepted response, leaves checkout, verifies no late redirect, then recovers the same order without resubmission.
- Five existing emulator service/security suites: delivery, shipping, orders, business/coupons and loyalty. These cover ownership/rules, shipping thresholds and late quotes, authoritative prices/stock/coupons/loyalty, order idempotency and lifecycle behavior. No security rules or backend calculations are changed.

All service/browser mutations are isolated loopback fixtures. They do not establish hosted production acceptance. Production build retains its existing large-chunk advisory.

All six reference exports were rendered at equivalent CSS widths (390 mobile / 1440 desktop), with simulator bars removed. Side-by-side comparisons, step screenshots and the address sheet are in ignored `.cache/checkout-design/`. `summary-discounts-{390,1440}.png` shows actual emulator coupon/points quotes. Reference photography is substituted only in isolated comparisons; the application continues to render saved image URLs. No images are uploaded or changed.

## Release dependencies

No new environment keys, service integrations, Firebase rules, indexes, media uploads or data preparation are required. Existing shipping configuration and commerce availability gates remain authoritative; unsupported/missing setup continues to block progression honestly. The owner must review/commit/deploy the local code through the normal process and perform hosted acceptance afterward. Online payment integration remains outside this task.

Nothing was committed, pushed, deployed, published or changed in production.
