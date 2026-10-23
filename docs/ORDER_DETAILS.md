# Administrator Order Details

Local implementation only. This work does not commit, push, deploy, publish rules/indexes or modify production records/users.

## Layout and routes

The canonical route remains `/admin/orders/{id}`. The existing compact Lora shell, 192px sidebar, approximately 58px header, logo, mobile drawer, dashboard and Orders List are preserved. Desktop uses independent two-thirds/one-third columns: purchased items, financial summary and timeline on the left; collection, customer and delivery cards on the right. Mobile stacks items, summary/collection, delivery, customer and recorded activity. Page-specific CSS is in `src/admin/orders/detail.css`.

Back to Orders restores the existing account-scoped list filter/cursor/scroll state when available. Direct visits have the normal unfiltered list fallback. Refresh and browser history retain the canonical route. View Customer opens the existing authorized customer directory and its UID-filtered customer-orders view; no new customer profile API or public customer route was invented.

The supplied HTML/screenshot guide the layout. Prototype sample records, state simulators, fictional loyalty/verified-patron labels, channel information, CDN fonts/scripts, raw Material Symbol names and simulated phone frames are omitted. The existing local Lora font and SVG icons are reused. No browser zoom or transform scaling is applied.

## Historical information

All purchased names, variants, SKUs, images, quantities, unit/line prices, coupon/discount, shipping, total and delivery/contact information come from the authorized order document. There are no current catalogue, profile, coupon or shipping lookups that could reprice or replace a historical order snapshot. Deleted/renamed catalogue products do not prevent a read. Missing images preserve thumbnail space and show an explicit unavailable state. Optional name/mobile/email/SKU/variant/history values have truthful fallbacks.

Amounts use integer paise/BigInt and Indian formatting. No tax is invented. Timestamps use the shared Asia/Kolkata formatter. Timeline rows come only from actual stored history: progress, cancellation, request/return, payment/refund and internal-note events are visually distinguished. No planned future rows or inferred completion timestamps are generated. Actor UIDs are shown as recorded, without inventing names or roles.

Email/mobile copy controls provide success/failure feedback and clean up timers. Call links require a normalized international number. Stored tracking URLs render as links only when credential-free HTTPS, with safe external-link attributes.

## Actual workflow and deliberate design differences

The former working order-action form was extracted into `OrderActions.tsx`; its existing `adminOrders:update` transition service and request field names are retained. The unused old list/detail workspace was removed from the shared customer/order UI module. The delivery extension is documented in [DELIVERY_UPDATE.md](DELIVERY_UPDATE.md); it adds a dedicated drawer and narrow delivery-metadata support to the same service.

General header actions focus/select the existing action form; dispatch and delivery shortcuts open the Delivery Update panel. Save opens an accessible explicit confirmation before the mutation. All existing supported actions remain: confirmation, processing, dispatch, delivery, pre-dispatch cancellation/rejection, internal note, request review, inspected return restock/resolution, external collection and external manual refund. Required reasons, courier details, references and refund amounts remain validated by the trusted server.

The reference contains capabilities the service does not implement; the page does not advertise them as working:

- There is no Packed or Ready to Dispatch state.
- Update Delivery now opens the dedicated status/details panel for eligible pre-terminal orders. Courier/tracking edits and date-only estimated delivery are persisted through the existing authorized transaction; see [DELIVERY_UPDATE.md](DELIVERY_UPDATE.md).
- There is no stored customer delivery-instruction field. The actual saved landmark is shown as Landmark, separately from administrator internal notes. No dispatch promises or courier synchronization are implied.
- COD collection can be recorded only after delivery, and the existing service completes the full remaining balance. Historical partial collections are displayed accurately; no new arbitrary partial-entry API is introduced. The amount shown for confirmation is read-only, derived from the stored record.
- No delivery event automatically records a collection. Active due-order outstanding equals stored total minus recorded collections; cancelled/rejected and already-collected orders have no outstanding delivery payment. Refunds describe external returns of previously collected funds and do not create new COD debt. These are the existing report/dashboard semantics.
- Record Collection and manual refund explicitly describe external actions. This screen does not charge the customer or transfer money. Razorpay remains on hold; no cancellation automatically initiates a refund.

The reference's combined mobile financial section is implemented as adjacent summary and collection cards for reuse with the desktop columns. The general action form stays below the detail cards for existing refund/request controls. Delivery Update now uses its own responsive drawer while retaining the same trusted order service.

## Concurrency, refresh and security

Reads reuse `useAdminResource` and the established visible-tab polling, same-account cross-tab signals, cancellation and stale-response protection. The hook now exposes its safe error code so this page can distinguish unavailable, invalid/not-found and denied states without changing existing consumers' messages. Stable last-successful content remains during ordinary background updates. Unsaved form values are not replaced by fresh order data. Successful mutations emit the existing change signal and refresh details/list/dashboard resources.

Each confirmation freezes the request's revision and operation ID. Duplicate clicks are locked. If the revision changes while the confirmation is open, confirmation is disabled for review. Definitive conflicts preserve inputs and require refresh/review. An uncertain response freezes the inputs and offers only the identical original request/operation ID; the existing server receipt prevents repeated side effects. No new action is silently substituted during a retry. Navigation/account cleanup stops applying late results. Unsaved/uncertain action navigation receives an explicit discard warning.

All protected reads and mutations still require `admin: true` AND an enabled server-managed `adminAccess/{uid}` record. No direct browser writes, credential changes, frontend UID exceptions or public customer-data reads are introduced. Server revision/receipt, inventory, coupon, cancellation, collection and manual-refund safeguards remain intact. No Delete Order action is added.

## Files

- New page/components/model: `src/admin/orders/OrderDetails.tsx`, `OrderActions.tsx`, `detailModel.ts`, `detailModel.test.ts`, `detail.css`.
- Integration: `src/admin/AdminPanel.tsx`, `src/admin/dashboard/resource.tsx`, `src/orders/AdminBusiness.tsx`, `src/orders/ui.tsx`.
- Tests: `scripts/order-details-emulator.test.ts`, `scripts/order-details-browser.test.py`, `scripts/order-details-fixture-control.ts`, `scripts/admin-emulator-suite.ts`, existing COD/dashboard/Orders List browser scripts updated for explicit confirmation, and `package.json`.
- This document.

## Local acceptance

1. In the established local emulator/API/Vite environment, open an order from Orders List, then use Back to Orders. Check filter/cursor restoration; also try direct navigation, reload and browser history.
2. Compare the historical item/price/address snapshots with the isolated fixture, including renamed/deleted catalogue data, missing images and incomplete history. Check mobile/desktop layouts without changing browser zoom.
3. Select an eligible action, enter required values, Save and inspect the confirmation. Cancel must perform no mutation. Use isolated fixtures for confirmation, stale revision, identical uncertain retry, dispatch, collection and request/refund checks.
4. Open a second local admin tab, save a supported update and verify background refresh without losing unsaved input or showing an auth overlay. Check copy/call/tracking, customer navigation, not-found/error Retry and sign-out cleanup.

No new Firestore queries, indexes, rules or data migration are required. Production smoke tests and current hosted rules/index availability remain separate release checks; local tests do not verify deployment state. The owner's existing Test product is not used or changed by the isolated fixture tests.


## Validation completed

- `npm.cmd run lint`: passed.
- `npm.cmd test`: 85 tests passed, 0 failed, including new financial, partial/refunded/cancelled states, command eligibility, timeline classification, safe links and exact integer-paise refund parsing.
- `npm.cmd run build`: passed.
- Three exported-handler emulator suites passed: existing orders/COD, dashboard, and new Order Details. They cover both admin checks, ordinary-customer/claim-only/record-only rejection, historical reads after catalogue deletion/profile changes, original pricing/address preservation, revision conflicts, collection/refund idempotency and existing inventory/cancellation safeguards.
- Five affected browser suites passed across focused runs: Order Details, Orders List, dashboard, COD and purchase journey. The new detail suite verifies direct load/reload, historical snapshots, image fallback, copy/call, authorized customer navigation, confirmation/focus/Escape, real revision conflict, identical uncertain retry, cross-tab updates while preserving an unsaved note, existing courier dispatch, full remaining collection after historical partial COD, request review, missing legacy values, not-found/error/retry and sign-out/customer rejection.
- Screenshots and no-overflow assertions covered 320, 390, 768, 1024, 1440 and 1920px at normal browser zoom. Desktop, tablet and mobile images were visually reviewed. Local ignored artifacts are in `.cache/order-details-browser/`.
- `git diff --check`: passed. The complete all-feature `test:admin` command was not rerun as one uninterrupted invocation. The affected suites above ran through the established loopback emulator harness. The dashboard regression's bulk-review interaction now waits for the enabled action and uses keyboard activation; dashboard application behavior/layout were not changed.

No production smoke test, live index metadata read, rules publication, deployment, commit, push or production-record/user modification was performed. No service-account key was read or exposed by this task. The owner?s Test product remains untouched.
