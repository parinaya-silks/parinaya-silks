# Customer order-history index recovery

The production `orders:list` failure (request `736c1519-eb82-400c-86b2-eb0a7976ed26`) was Firestore code 9, `firestore-index-required`. This is separate from dashboard reporting.

`server/catalog.ts` verifies the authentication token and passes its UID to `ordersService.customer`. `server/orders.ts` always filters customer lists by that UID, then orders by `createdAt DESC` and document ID `DESC`. A client-supplied `customerUid` does not replace the authenticated UID. Pagination validates cursor ownership.

Required physical index:

- Project: `parinaya-silks`; database: `(default)`.
- Collection: `orders`; scope: `COLLECTION`.
- Ordered fields: `uid ASCENDING`, `createdAt DESCENDING`, `__name__ DESCENDING`.

`firestore.indexes.json` already includes `uid ASCENDING, createdAt DESCENDING`. Following the existing manifest convention, Firestore implicitly adds `__name__` in the final ordered field's direction. No manifest change or bulk publication is needed.

## Live verification on 2026-10-23

Read-only metadata showed 13 existing orders indexes and no exact match. Only the authorized missing definition was created. Its index ID is `CICAgLiIjZIK`; metadata subsequently confirmed `READY`. All pre-existing index IDs and definitions were preserved.

The first immediate query after READY still returned code 9. A subsequent metadata check and identical query succeeded, without another index creation or configuration change.

The trusted Admin SDK ran the same UID equality query and descending ordering with `limit(25)` for the already known approved account: one matching order, ownership/order assertions passed, and the cursor query returned zero additional rows. No customer contents were logged and no business records were changed. This verifies live index serving, not the affected customer's hosted authentication session or multi-page production data.

## Local regression coverage

- Actual query-builder calls and manifest coverage, including attempted client UID substitution.
- Exported API handler with unverified emulator customers: signed-out rejection, account isolation, private-field projection, tied timestamps, 25-row pagination, foreign-cursor rejection, foreign-order rejection and genuinely empty history.
- Authenticated browser: index/network failures use order-history loading copy; loading/failure never displays empty-history copy; Retry reaches a real empty handler result; no horizontal overflow at 320, 390, 768 and 1440 pixels.

Refresh `/account/orders` in the existing signed-in production session to finish hosted acceptance. The index repair needs no application deployment. The revised customer-facing copy remains a local code change until the owner deploys it. No security-rule publication is required.
