# Orders list redesign

Local implementation only. No production records, users, rules, indexes or deployments are changed by this work.

## Behavior and design

The new Orders list uses the existing compact Lora admin shell: 192px sidebar and approximately 58px desktop header. The dashboard, shared navigation/notifications and existing Order Details / delivery controls retain their implementation. Page styles live in `src/admin/orders/orders.css`.

Desktop uses a searchable/filterable table with snapshot customer name/mobile, reference/date, integer-paise total, fulfilment status, independent COD status and View Order. Below 768px, the same results become cards with selected borders, a mobile filter sheet and contextual bulk controls. All icons are SVGs. The existing logo and local font remain. No prototype records, scripts, fonts or CDN dependencies are imported.

The first desktop screenshot path supplied with this request was missing. Its pasted desktop HTML and the available mobile screenshot/export were used as references. The exported DESIGN.md's conflicting fonts/sidebar dimensions do not override the requested existing Lora/compact shell.

Intentional differences from the reference:

- Actual order references are long immutable identifiers; they wrap rather than being truncated or replaced by invented short IDs.
- Search is exact, case-normalized `PS-` reference search. Customer-name/phone search is not advertised. The older exact-email capability remains available to existing callers, but is rejected by this new summary view.
- Status labels are the actual Placed, Confirmed, Processing, Shipped, Delivered, Cancelled and Rejected values. Processing/shipped/delivered records cannot be selected for a bulk transition that the existing engine does not support.
- No invented total or last page is shown. Ten rows per page, Previous/Next and the current page position are provided. An extra server-side lookahead establishes whether Next exists.
- Export explicitly means **Export current page**; it never scans the database. CSV cells use the existing formula-injection escaping, including names and `+` phone numbers. Private account email, UID, address, notes and audit history are not exported.
- The filter sheet is shared across viewport sizes. Desktop also has direct date/COD controls. The existing mobile admin drawer is retained; reference-only Artisans/bottom navigation is omitted.
- No bulk dispatch, payment collection, cancellation or refund shortcuts are added. Those workflows require the existing detail controls and safeguards.

## Data and security

The existing authorized `adminOrders:list` action accepts the optional admin-only `view: "summary"` and `statuses` arguments. Single status and all older callers retain their previous behavior. Customer operations reject these admin-only fields. Summary responses contain only ID/reference, revision/status, creation time, snapshot name/mobile, total, collection status and recorded collection amount. Both administrator custom claim and enabled server-managed `adminAccess/{uid}` checks remain required. No direct browser writes are introduced.

Partial recorded collections are shown as part collected, with recorded and remaining amounts. Delivered does not imply collection. No changes were made to the order transition engine, inventory/coupon cancellation safeguards, collection/refund engine or Razorpay availability.

Dates reuse `customRange`/`periodRange`, applying Asia/Kolkata boundaries and the entire inclusive end date. Invalid dates/ranges are rejected. Search, status/COD/date predicates and cursor ordering run on the server, not on one downloaded page.

List filters, cursor history and scroll are held in the account-scoped AdminPanel component while navigating to/from details. They survive ordinary in-app navigation, not a full reload or sign-out. Selection is page-local, clears on filter/page changes and is reconciled against refreshed eligibility. Successful bulk items are removed; failures remain available if still eligible. Confirmation freezes revisions and operation IDs. Uncertain retries reuse the original request/operation ID, and are offered only while that record remains displayed. Leaving the page/account stops unsent sequential operations.

The existing admin resource/provider supplies cancellation, stale-response protection, visible-tab polling, debounced same-account cross-tab refresh, freshness/error feedback and cleanup. No auth overlay or full page reload is used for background refresh. Failed initial reads show an error, not an empty catalogue. Background errors retain and label the last successful result. Filters and confirmation dialogs use native modal dialogs, focus trapping, Escape and focus restoration.

## Query/index dependencies

No rules or index manifests were changed. All shapes use the existing `orders`, COLLECTION-scope definitions. Equality fields below are ASCENDING; the final `createdAt` is DESCENDING, with the implicit document-ID DESCENDING tie-break. Optional date predicates use that same `createdAt` field and do not add another index field.

| Filters | Existing index field order |
| --- | --- |
| None / dates only | createdAt DESC (automatic single-field) |
| Reference | reference ASC, createdAt DESC |
| Status (single or `in`) | status ASC, createdAt DESC |
| COD | paymentStatus ASC, createdAt DESC |
| Status + COD | status ASC, paymentStatus ASC, createdAt DESC |
| Status + reference | status ASC, reference ASC, createdAt DESC |
| COD + reference | paymentStatus ASC, reference ASC, createdAt DESC |
| Status + COD + reference | status ASC, paymentStatus ASC, reference ASC, createdAt DESC |

The query-builder regression checks all combinations against the local manifest. This is not verification of current production index readiness. Before release, the existing applicable indexes must be READY in the target database; no additional definitions or redundant recreation are recommended by this change. No rule publication or data migration is required.

## Changed files

- New list UI/model/tests: `src/admin/orders/OrdersList.tsx`, `Filters.tsx`, `BulkActions.tsx`, `model.ts`, `model.test.ts`, `orders.css`.
- Integration: `src/admin/AdminPanel.tsx`, `server/orders.ts`.
- Checks: `scripts/orders-list-emulator.test.ts`, `scripts/orders-list-browser.test.py`, `scripts/orders-list-fixture-control.ts`, `scripts/catalog-indexes.test.ts`, `scripts/admin-emulator-suite.ts`, `package.json`.
- Documentation: this file.

## Local acceptance

1. Run the established local API/Vite environment and sign in as an authorized administrator. Open Orders and verify the approved shell and responsive table/cards.
2. Apply exact reference, multiple statuses, COD and custom dates. Check chips, inclusive India dates and Next/Previous. Change filters quickly; prior responses must not overwrite current results.
3. Open View Order and return with All orders or browser Back; verify the list filter/page context. Existing delivery actions remain in details.
4. Select eligible Placed or Confirmed records in isolated emulator fixtures only. Review/confirm the plan. Verify partial failure feedback, refreshed revisions and identical uncertain retries, with no repeated side effects.
5. Export current page and check the actual row count and spreadsheet-safe cells. Check failure/retry, no-match and empty states.
6. Open another local admin tab; save an existing supported fixture transition and verify background refresh without losing filters or opening auth overlays. Sign out and verify list data is no longer accessible.

Use the repository's `npm.cmd run test:admin` for emulator/browser coverage, `npm.cmd run lint`, `npm.cmd test` and `npm.cmd run build` for static/unit/build checks. Test fixtures enforce loopback emulators and never target production records. Validation results for this work are reported with the final implementation response.

## Validation completed

- Typecheck (`npm.cmd run lint`): passed.
- Unit/query-builder tests (`npm.cmd test`): 81 passed, 0 failed. Includes all summary filter/index combinations, exact search validation, inclusive India boundaries, narrow financial/customer projection and spreadsheet-safe CSV.
- Production Vite build: passed.
- Local exported-handler emulator suites: existing COD/orders, dashboard, and new orders-list suites passed. These cover dual administrator authorization, customer rejection, private field projection, real listing/empty responses, cursor/lookahead behavior, invalid filters, atomic stock/cancellation/collection safeguards and revision/idempotency behavior.
- Browser regressions: existing purchase journey, COD and dashboard suites passed. The new Orders list suite passed after the final UI changes, covering pagination, combined filters, exact search, detail return context, page-scoped CSV, a real partial revision failure, refreshed confirmation, identical lost-response retry, stale response cancellation, cross-tab updates, keyboard focus/Escape, mobile Apply/Reset/Cancel, sign-out and customer denial.
- Normal-zoom screenshots/checks: 320, 390, 768, 1024, 1440 and 1920px; no horizontal page overflow. Desktop, tablet and mobile captures visually reviewed. Images are ignored local artifacts in `.cache/orders-list-browser/`.
- Packaged Vercel function: local builder/runtime check passed using builder 24.0.3, nodejs24.x artifact and local Node 22.22.2; executed without a tsx loader with require(ESM) both disabled and enabled. This does not claim hosted Node 24 or deployed behavior was tested.
- `git diff --check`: passed. The complete all-feature `test:admin` suite was not rerun as one uninterrupted invocation; the affected suites above were run through the existing isolated emulator harness.

No hosted smoke test or live index metadata check was performed. No commit, push, application deployment, rules/index publication, production user change or production-record modification was performed. The owner's existing Test product was not touched.
