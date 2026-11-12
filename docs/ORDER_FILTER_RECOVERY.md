# Orders COD filter recovery

Local change, 12 November 2026. No commit, push, deployment, index publication or Production data change was performed.

The reported Orders screen returns HTTP 503 after selecting **COD — Due**. The Admin summary query combines `paymentStatus` with descending `createdAt` and document-ID ordering. The required composite index is already in `firestore.indexes.json`; declaring it in source does not establish deployed READY status. The screenshot alone does not identify the server exception. The exact hosted cause remains **Pending confirmation** from the response code/request ID and matching Vercel log.

## Local repair

- The existing indexed query remains the primary read path.
- Only an explicitly identified Firestore missing-index failure enables a read-only fallback for the dual-authorized Admin summary. Customer history, customer-directory order history and other query errors retain their existing behavior.
- The fallback reads newest-first using the ordinary `createdAt` index, retains inclusive date bounds, and applies the original validated COD/status/reference/customer predicates before pagination. It scans in batches of 100 until a full page plus lookahead is found or the scope is exhausted. The existing cursor remains the last displayed document.
- A scan is bounded to 5,000 documents plus one exhaustion check per request. If insufficient evidence exists to complete the page within that budget, the original index error surfaces; a partial or false empty result is never returned. The fallback can read more documents than the indexed query. Publishing the existing approved indexes separately remains the preferred operational resolution.
- Orders now displays bounded configuration/index guidance and a safe request ID when supplied. Raw backend messages, credentials and customer data are not displayed in diagnostics.
- There are no changes to order acceptance, COD money, Razorpay, inventory, coupons, loyalty, refunds, shipping or historical records.

## Verification

- Focused unit/handler/index run: **21 passed, 1 failed**. All new fallback/error tests and existing Orders query/model checks passed. The failure is in the untouched public browse-index test: it expects descending document-ID order while `server/browse.ts` currently uses ascending order. This unrelated mismatch was not changed.
- Auth/Firestore Orders integration: **1 comprehensive test passed**, including six filter combinations with simulated composite-index failures compared against actual indexed emulator results, complete pagination, empty results, dual authorization, invalid input and unchanged order snapshots.
- TypeScript and production frontend build passed. The existing large-chunk advisory remains.
- Catalog packaged-runtime checks passed with Vercel builder 24.0.3 (Node 24 artifacts executed locally on Node 22.22.2, without a tsx runtime loader).
- Whitespace/diff validation passed. No hosted browser or Production filter acceptance was performed. Emulators do not enforce composite-index readiness, so the missing-index failure is deliberately injected while fallback reads use real emulator documents.

Implementation: `server/orderListQuery.ts`, `server/orders.ts`, `src/admin/orders/model.ts`, `src/admin/orders/OrdersList.tsx`, and the optional error formatter in `src/admin/dashboard/resource.tsx`. Regression coverage: `server/orderListQuery.test.ts` and `scripts/orders-list-emulator.test.ts`; the unit test is registered in `package.json`.

After a separately authorized release, verify the hosted COD filters. If a 503 remains, use its safe request ID and response code to locate the exact failure; do not treat this local missing-index reproduction as proof of Production recovery.
