# Admin filter, category ordering and layout repair

12 November 2026. Baseline: local HEAD `6f55db9`; working tree was clean at inspection. This is a local follow-up to [OWNER_IMPROVEMENTS.md](OWNER_IMPROVEMENTS.md), not evidence of a Production release. No commit, push, deployment, rule/index publication, migration or Production data change was performed.

## Root causes and fixes

| Issue | Evidence in local implementation | Fix |
| --- | --- | --- |
| Unexpected Orders filter | The shared sidebar explicitly navigated to `orders?status=Placed`. The list's own default was already unrestricted. | Sidebar opens All. Dashboard status cards remain intentional filtered shortcuts. Explicit list/detail returns retain chosen filters; sidebar entry resets them. |
| Inventory showing one product | Sidebar explicitly sent `stock=alerts`. The supplied screenshot correctly showed one matching low/out-of-stock product from 20; 228 was the total unit quantity, not a product count. | Sidebar opens all stock/publication states. Complete-catalog summary remains independent of table filters; archived and draft products are included. No quantity change. |
| Products vertical delete label | A new permanent-delete button was inserted into a narrow fixed-width Actions cell. It inherited `overflow-wrap:anywhere`, and the declared column widths left inadequate room for three actions. | Deletion moved inside the existing overflow menu. Explicit column proportions, stable horizontal actions, normal word wrapping and compact intermediate desktop controls. Long product/category names can wrap normally. Deletion permissions/dependency rules remain. |
| Category edit rejected or appeared unsaved | The browser Firebase SDK preserves fractional milliseconds; Firebase Admin `Timestamp.toMillis()` truncates them. For the same timestamp the installed SDKs return `1700000000123.456` versus `1700000000123`. The server also originally required integer revision tokens. Separately, `orderCategories` renumbered all displayed values when any zero/duplicate existed, masking valid saved edits. | Server computes the precise browser-compatible timestamp token for saves, normalization and category-deletion revision checks. Reads show exact saved ranks; no implicit rewriting/renumbering. Duplicate new positive ranks reject with a useful conflict message. Concurrency checks remain. |
| Enquiry filter 503 exposure | `/api/catalog` is the correct shared action endpoint. `enquiries:list` combined status/search predicates with createdAt ordering, requiring deployed composite indexes for filtered queries. The screenshots do not reveal the actual server exception. | One single-field indexed predicate per request, bounded complete candidate scan, then server status filtering, stable newest/oldest sorting and 20-row pagination. No composite status/search/date index dependency. Sorting and filters are cursor-bound; changed data rejects stale cursors. |
| Enquiry usability/retry | Sort was a static Newest first label; no clear action/total. Frontend discarded safe request IDs and enquiry errors used one generic caption. A stale continuation could be retried repeatedly. | Added both sort directions, Clear filters, accurate totals, request-ID/configuration/index/permission guidance, explicit retry and stale-page reset. Successful status changes refresh the current list. No automatic request loop or record creation. |
| Product stock/search consistency | Low-stock filtering used a product's summed variant quantity; a low individual colour could be hidden. Variant SKU/name search was omitted. | Filter each authoritative stock source for positive low stock, include variant SKU/name in product search, and use the matching low-stock state in the product badge. No inventory arithmetic changes. |
| Campaign search whitespace | Search did not trim/normalize input. | Shared tested pure filter/sort helper normalizes search and preserves the complete bounded input. Lifecycle/payment/product records are not changed by filtering. |

## Data-loading contracts inspected and verified

| Section | Source and filter/paging contract |
| --- | --- |
| Products | Authenticated catalog `list` pages are fully loaded before local search/filter/sort and 10-row UI pagination. A partial, duplicate or looping catalog fails visibly; it is never labelled complete. |
| Categories | Existing full category listener; saved numeric order, then name/ID tie-break. Search/visibility operate on the full list. Both storefront and Admin use the same ordering function. |
| Orders | `adminOrders:list` performs exact reference, status, COD and date filters server-side before 10-row pagination. Export covers only the displayed page. |
| Customers | `customers:list` uses the existing server directory query, matching total, account-scoped detail-return context and cursor pages. No directory rebuild or customer migration was performed against Production. |
| Inventory | Full Admin catalog before local name/code/colour/category/stock/structure/publication filtering and sorting. Summary uses the complete catalog; filters do not mutate it. Existing adjustment validation and history service are retained. |
| Enquiries | `enquiries:list` uses one search-prefix or status predicate (or collection read for All), scans at most 5,001 candidates and refuses scopes above 5,000 before returning any apparently complete result. Search remains documented case-insensitive prefix search across full name/name word/email/international or national phone. Both sorts and all status filters apply before paging. |
| Campaigns | Existing complete bounded `campaigns:list`, local query/status/sort and 5-row pages. Membership counts load only for visible campaigns. |
| Coupons | All `coupons:list` pages load before local code/status/type/sort and 5-row pages. Usage/history and checkout validation are unchanged. |

Sidebar section clicks start neutral lists. Product/customer detail-return contexts remain account-scoped. Orders retain deliberately selected filters when returning from their details, while a fresh sidebar/direct entry starts All. No hidden Placed/alerts/New filter is attached to a normal sidebar click. Dashboard status navigation is still explicit.

## Category ordering operation

- New positive rank changes must be unique; a collision rejects instead of silently replacing another category's rank.
- Legacy zero/duplicate ranks remain visible as saved. Review them, then optionally choose **Save sequential order** on the complete category list. The label explains that it assigns 1 through N in the current full-list sequence.
- That explicit operation uses the full ID/update-time snapshot and applies every proposed rank in one guarded transaction (maximum 400 records). A concurrent edit rejects it. Names, slugs, category/product associations and visibility are preserved.
- New-category suggestion uses the actual maximum positive saved rank + 1. An entirely unassigned legacy list proposes a number after its current list length until normalization is explicitly saved.
- No automatic normalization/migration ran against Production. Existing dates/slugs/settings are not rewritten by reads.

## API diagnostics and security

The catalog route intentionally dispatches sections by the validated `action`; sharing `/api/catalog` is not a routing defect. Existing token/audience checks, dual Admin authorization and transaction permission checks remain. No new unauthenticated privileged operation or serverless function was introduced.

Existing diagnostics already distinguish invalid requests (400), unauthenticated/permission failures (401/403), conflicts (409), schema/unexpected bugs (500), and missing configuration/indexes/upstream failures (503). Explicit ProductError unavailable now correctly uses 503. Raw exceptions/environment/customer messages remain excluded from logs/responses. Only validated opaque request IDs are carried to the enquiry error UI; server logs retain action/phase/safe reason and recognized error metadata.

The enquiry rewrite removes a concrete index-dependent failure path. **The exact exception behind the supplied Production 503 remains Pending confirmation.** No current Vercel logs, failed response JSON/request ID, provider credentials or deployed index metadata were accessed. A dated failed-request log and the matching deployment/index state are needed to identify whether the observed incident was index readiness, server configuration/permissions, an upstream outage or another failure. No claim is made that a local emulator proves current Production health.

The 5,000-candidate enquiry bound is intentional: index-independent sorting reads the complete bounded matching source before paging. An oversized scope fails visibly and must be narrowed/reviewed rather than silently returning only its first records. Existing ephemeral old-format enquiry cursors can require Refresh after release; no stored enquiry data migration is required.

## Validation results

- 43 distinct focused unit/model/handler checks passed across product/inventory/order/customer/coupon/campaign/category/enquiry filtering, complete loading, request IDs and safe HTTP errors. Updated the earlier category-read assertion to require exact saved ranks.
- Six emulator TAP checks passed: two new category/enquiry regressions plus existing enquiry, order-list, customer-directory/export and campaign suites. They cover duplicate/stale/concurrent category writes, normalization preservation, both enquiry sorts/all pages/search/status persistence, exact/combined order filters, customer filtering/exports and dual authorization. The campaign fixture was brought into line with the already-existing removed-member rejection, with an additional explicit rejection assertion; the safety rule was not weakened.
- Chromium acceptance passed across all eight sections: actual filtered rows/sort order, count/clear behaviour, pagination, product and current-order-page CSV downloads, category save/reload/storefront consistency, new-rank suggestion, neutral sidebar entry, enquiry failure/retry and read/replied persistence.
- Products checked for horizontal overflow at 320/390/768/1024/1280/1440px; enquiry layout at 320/390/768/1440px. One useful local Products screenshot was captured and visually reviewed at `.cache/admin-filter-repair/products-1440.png` (synthetic data/images).
- A before/after hash comparison confirmed the browser filter acceptance did not alter seeded products/quantities, orders/payment evidence, shipping/store settings or loyalty records. Intended category and enquiry edits were limited to guarded loopback fixtures.
- TypeScript, production build, packaged Catalog runtime and `git diff --check` passed. Existing bundle-size advisory remains. No dependencies installed.

Focused emulator/browser commands use the existing guarded `test:client-changes` harness and selectors `admin-filter-repair-emulator,enquiries-emulator,orders-list-emulator,customers-emulator,campaigns-emulator` / `admin-filter-repair`. The new unit file is `src/admin/filterRepair.test.ts`. Fixture scripts refuse execution without both exact loopback emulator endpoints and reject a Vercel context.

## Manual actions and remaining limits

No production data migration, rule/index publication, credential change or data repair is required/performed by these source changes. If legacy category zeros/duplicates should be normalized, review the complete sequence and explicitly save it after a separately approved release; individual free positive rank edits do not require a blanket migration. Product/category deletion still follows existing conservative safety rules.

Production release and read-only hosted acceptance remain separate, owner-authorized work. In particular, the supplied Production enquiry 503 cannot be certified resolved without its server exception evidence and matching hosted verification. Existing records, payments, fulfilment history, quantities, shipping charges and loyalty balances were preserved.

## Files changed

- `docs/ADMIN_FILTER_REPAIR.md`
- `docs/OWNER_IMPROVEMENTS.md`
- `docs/README.md`
- `docs/client/admin-catalog-inventory.md`
- `docs/client/admin-orders-customers.md`
- `docs/technical/api-reference.md`
- `package.json`
- `scripts/admin-filter-repair-browser.test.py`
- `scripts/admin-filter-repair-emulator.test.ts`
- `scripts/admin-filter-repair-fixture-control.ts`
- `scripts/campaigns-emulator.test.ts`
- `server/categories.ts`
- `server/diagnostics.ts`
- `server/enquiries.ts`
- `server/safeDeletion.ts`
- `src/admin/AdminCategories.tsx`
- `src/admin/AdminLayout.tsx`
- `src/admin/AdminPanel.tsx`
- `src/admin/AdminProducts.tsx`
- `src/admin/campaigns/CampaignManager.tsx`
- `src/admin/campaigns/filter.ts`
- `src/admin/categories/CategoryEditor.tsx`
- `src/admin/enquiries/EnquiriesPage.tsx`
- `src/admin/enquiries/enquiries.css`
- `src/admin/filterRepair.test.ts`
- `src/admin/improvements.test.ts`
- `src/admin/products/model.ts`
- `src/admin/products/products.css`
- `src/categories/model.ts`
- `src/categories/repository.ts`
- `src/enquiries/model.ts`
- `src/products/response.ts`

## Orders COD filter follow-up

The 12 November follow-up adds bounded missing-index recovery for the Orders summary and safe error/request-ID guidance. See [Orders COD filter recovery](ORDER_FILTER_RECOVERY.md) for scope, validation and the unresolved hosted exception.
