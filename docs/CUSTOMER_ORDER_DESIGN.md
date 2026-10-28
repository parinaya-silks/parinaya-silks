# Customer confirmation and tracking

Local implementation of the four approved Stitch screens. Admin, catalogue,
stock, payment, loyalty settlement and cancellation policy are unchanged.

## Routes and authoritative services

| Experience | Route | Service |
| --- | --- | --- |
| Placement confirmation | `/order-confirmed/{id}` | Authenticated `orders:get` |
| Details and tracking | `/order-tracking/{id}` | Authenticated `orders:get` |
| Existing result link | `/order-result/{id}` | Current details via `orders:get` |
| Permanent account link | `/account/orders/{id}` | Current details via `orders:get` |
| Customer history | `/account/orders` | Existing `orders:list` and pagination |
| Request assistance | Dialog/sheet on details | Existing `orders:request` |

The server derives customer identity from the verified token and enforces order
ownership. The UI additionally checks the returned UID and order ID/reference.
Sign-in return validation allows only implemented internal order destinations.
Initial failures never render success. Cancelled/rejected confirmation links show
current details, without a thank-you or celebration. Order reads ignore aborted,
superseded or signed-out responses. A 30-second/focus refresh preserves the last
loaded view; failures identify it as the last loaded snapshot and offer Retry.

## Components and presentation

- `src/orders/CustomerOrderPage.tsx`: owned reads, distinct compositions, assistance
  dialog, refresh and stale-response handling.
- `customerPresentation.tsx`: immutable purchased items, address, totals, separate
  payment/fulfilment states, actual timeline and safe shipment links.
- `OrderNavigation.tsx` and `customerOrders.css`: scoped compact chrome, existing
  logo/local Lora, local Lucide SVGs, responsive cards and mobile navigation.
- `confirmation.ts` and `useCodOrder.ts`: motion-only fresh placement hint.
- `ui.tsx`: retains history and shared administrator summary; delegates customer
  detail routes to the new view. No administrator components or rules changed.

Names, variants, quantities, images, address and prices come from the saved order.
Current product or shipping settings never recalculate a historical order. Zero
coupon/points discount rows are hidden. The actual total is always authoritative.
COD remains due after delivery until collection is recorded. Collected orders
show order value, collection information and zero amount due. External recorded
refunds remain separate from the original total. Pending, earned, reversed,
reserved/released and restored loyalty points retain their saved meanings.

## Animation and requests

A trusted placement result sets an in-memory UID/order-ID hint. A successful owned
read consumes it once. Only a fresh `Placed` confirmation animates the gold ring,
maroon check and greeting, completing within one second. Refresh, direct/history
visits, background updates and mount recovery are static. No full order or
address is persisted for motion, and no timer, animation or query flag creates
success, submits an order or changes navigation eligibility. Reduced-motion CSS
renders the completed static motif immediately.

Cancellation is a secondary action opening a native dialog (bottom sheet on
mobile), with initial focus, native containment, Escape, restoration, visible
focus and a scrollable keyboard-safe form. Failed submissions retain the reason.
An uncertain retry keeps the exact operation body/idempotency key. Server revision
and eligibility checks remain authoritative. Requests do not cancel orders or
restore stock. The original request kind is preserved if fulfilment changes while
the sheet is open; it cannot silently become a return/exchange request. Existing
policy-enabled return/exchange assistance remains available separately when
eligible. Only explicit clicks open configured support/tracking links.

## Necessary differences from the prototypes

- Existing logo, local Lora for all customer text and `#780D24`/`#FBF7F0` palette.
- Real references wrap and Copy returns the full value; no invented short IDs.
- Actual stages: Placed, Confirmed, Processing, Shipped, Delivered. Cancelled and
  Rejected show their exceptional state instead of a normal delivery journey.
- No invented manufacture, weaving, certification, insurance, packaging, tax,
  concierge, notification, courier event or delivery promises.
- Shipment fields and estimates appear only when saved. Missing shipment data has
  one message: “Tracking details will appear here when available.”
- Configured public contact links, with Contact Us as the safe fallback.
- No state simulators, replay controls, fictional orders or payment-success claims.

## Verification and release

Focused tests are `src/orders/customerPresentation.test.tsx`, the safe-return test,
`scripts/customer-order-design-browser.test.py` (real local accepted order), and
`scripts/customer-order-states-browser.test.py` (controlled read states with local
emulator sign-in). Both browser scripts require loopback Auth/Firestore, the
existing local API/Vite harness and its ephemeral test password in the environment.
`customer-order-design-fixture.ts` refuses non-emulator/production use. Fixtures
and their cleanup affect only local emulator data.

Validation includes typecheck, unit tests, production build, order ownership and
loyalty emulator regressions, purchase journey, lost-response COD recovery and
late checkout-response regressions. Screen checks cover 320, 390, 768 and 1440px,
bounded thumbnails, local fonts, no icon ligatures/overflow, copied full reference,
no order/stock/points mutations on reads, cancellation recovery and current-state
eligibility. Stale/order-switch/sign-out responses and reduced motion are covered
by controlled state tests. Backend emulator success does not verify hosted state.

Completed checks: typecheck, 141 unit tests, production build, two emulator suites
(three top-level tests), and five browser groups (design, controlled states,
purchase journey, COD and late checkout response). The build retains its existing
large-chunk advisory. All test servers/emulators are stopped after verification.

Screenshots are under `.cache/customer-order-design/`:
`confirmation-{320,390,768,1440}.png`, `details-{320,390,768,1440}.png`,
`tracking-available-390.png` and `cancellation-sheet-390.png`.
The final scoped-layout captures are `confirmation-static-{320,390,768,1440}.png`
and `details-static-{320,390,768,1440}.png`, using one-item controlled read fixtures
with local emulator sign-in. The earlier real accepted-order captures cover two
items and a long reference. Viewport assertions wait for two animation frames
after resizing before checking layout.
The four `comparison-{confirmation,details}-{390,1440}.png` artifacts compare the
export and local view at equivalent CSS widths. Prototype imagery is replaced
only inside the reference capture by an existing local image; synthetic fixture
text/prices intentionally differ. Floating mobile navigation stays viewport-fixed
in full-page captures; the last content/footer has bottom clearance.

No new environment variables, dependencies, rules, indexes or media preparation
are required by this change. The owner must commit/release the local code and
perform hosted acceptance with an existing customer-owned order/session. Hosted
acceptance remains outstanding. Nothing was committed, pushed, deployed,
published, uploaded or changed in production during this implementation.
