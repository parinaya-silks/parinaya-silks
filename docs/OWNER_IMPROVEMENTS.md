# Admin panel and storefront improvements

Prepared 12 November 2026. Local implementation only. No commit, push, deployment, production Firestore change, migration, credential change or billing operation was performed. Production acceptance is **Pending confirmation**.

## Implemented behaviour

| Area | Local behaviour |
| --- | --- |
| Dashboard | Five current all-date status counts: Placed/New, Confirmed/To Pack, Processing/To Dispatch, Shipped/Out for Delivery and Delivered. Cards filter Orders. Selected-period new orders remain separately labelled. |
| Sidebar | Shared actionable counts for new orders, New enquiries and products with low/out-of-stock sources. Zero badges are hidden; large counts use 99+. Existing notification bell/history/read controls remain. |
| Categories | Legacy zero/missing/duplicate orders display sequentially from 1 while preserving the previous stored-order/name/ID sequence. New categories suggest maximum effective order + 1. Unchanged edits retain their original stored rank. Save displayed order is an explicit concurrency-checked correction. |
| Fulfilment | Placed ? Confirmed. Confirmed ? Processing, Shipped or Delivered. Processing ? Shipped or Delivered. Shipped ? Delivered. Existing cancellation/rejection and captured-online-payment checks remain. All courier/tracking/ETA fields stay optional. Stored Shipped remains the canonical status; no historical status migration. |
| COD | New Record Collection commands and the visible action are removed. Payment method/status, historical collection records, refund evidence and accepted operation recovery remain. Delivery does not manufacture collection or paid status. |
| Permanent deletion | Named dialog, typed DELETE, expected revision, stable operation identity, dual Admin checks and transactional dependency checks. No cascade deletion. See limits below. |
| Social platforms | Up to 20 named HTTPS profiles with optional icon identifier, visibility and order. Add/edit/remove through existing Contact save/cancel/conflict handling. Only enabled profiles project publicly. Legacy Instagram/Facebook are read as initial entries; explicit empty socials suppresses them without deleting other contact fields. |
| Loyalty | Plain-language labels, per-field examples and delivery/merchandise/rounding explanations. Earning/redemption allocation, caps, balances and saved order terms are unchanged. |
| Payment settings | Existing server-enforced COD toggle retained. No Online Payments OFF toggle. Existing Razorpay readiness/security gates remain mandatory. |
| Maintenance | Separate revision/replay-protected Save Availability action, default OFF. ON blocks normal public catalog/content/offers/campaign/appearance reads, enquiry submission, customer shopping/address/profile/review APIs and new COD/Razorpay reservation. New acceptance checks maintenance within its transaction after accepted-receipt recovery. |
| Maintenance screen | Supplied Stitch desktop/mobile layout adapted to local branding/fonts, real logo and configured public support email. Replay/static/reduced-motion behaviour. No invented business email, account or provider service. |
| Classic Cream header | Strong established #780D24 header through the storefront colour-token layer. Cream surfaces and Light Maroon theme retained. |
| Inventory history | Single-field productId query, bounded complete history response, stable timestamp/ID order, legacy missing timestamps, client Scope/Source filters, empty state and explicit Retry. Filter changes do not requery Firestore. Recorded data is not rewritten. |
| Shop | Server substring/case-insensitive filtering, then stable feature/newest/price sorting across the bounded source before pagination. Source array stays intact; cursors still bind query and source revision. Removed unsupported stock-notification button/note. |
| Login artwork | Relevant saved device image only. No built-in fallback, no cross-device fallback or initial default-image flash. Missing/failed image leaves the normal background blank. |
| Banners | Visible arrows/dots/pause controls removed. Autoplay retains hover/focus/visibility/reduced-motion safeguards. Touch and mouse/pen drag retained/supported with click suppression after swipes. Arrow keys and Space support keyboard operation. Existing destination policy is unchanged: regular hero banners open Shop, campaign heroes open their sale route. |
| SVG | Replaced the motion-interpolated loading path with its valid static infinity path, eliminating the interpolation route that could emit an undefined path. Other loading/status controls remain. |

Dashboard/notification data uses the existing roughly 30-second Admin pulse, immediate supported-mutation invalidation and cross-tab signal. Inventory attention counts scan only inventory/threshold fields, bounded to 5,000 products; an oversized scan yields an unavailable count rather than an invented total. Existing low-stock dashboard detail retains its explicit bounded-scan label.

## Maintenance boundaries and schema

- Private `siteSettings/maintenance` v1: enabled, revision, operationId, updatedBy and updatedAt. Missing means OFF; malformed saved configuration fails closed.
- Public `storefrontAvailability/current`: only schemaVersion, enabled and revision. Saved atomically with the private setting; anonymous get is allowed, list/write denied. Connected pages react immediately and reject stale revisions; a 15-second API check is retained as fallback.
- Firestore rules also block direct public product/category reads, owned shopping/address reads and customer profile creation during maintenance. Admin permissions remain unchanged. Raw Firebase Authentication REST identity endpoints are provider-owned; the application hides normal login/registration and denies protected business operations, but does not claim to disable those provider endpoints or delete accounts.
- Admin `/admin`, payment verify/status/resume, signed webhooks, worker/reconciliation, existing order retrieval/recovery and historical financial/refund processing stay available. Payment/order background recovery remains server-authoritative even while the customer screen is closed.
- No additional composite index manifest change. The reviewed `firestore.rules` must accompany a later approved release; backend checks alone do not publish client rules.

## Safe deletion limits

| Record | Required conditions / reason for restriction |
| --- | --- |
| Category | Disable first. No product, campaign, saved content/banner or other scanned dependency. |
| Product | Untouched initial Draft (revision 1) with no order, inventory history, saved shopping or other scanned dependency. Published/edited/archived records retain Archive because external publication/analytics history cannot be exhaustively proven absent. |
| Coupon | Disabled, exactly zero recorded uses, no customer redemption subdocuments, orders or other scanned dependencies. Used codes stay deactivated. |
| Campaign | Untouched initial draft (revision 1), no banner/content/order or other scanned dependency. Published/edited lifecycle history retains Archive. |

Dependency scans include existing orders, inventory audit, campaigns, settings/content/banners, collection/report/invoice/analytics paths and payment evidence, plus customer shopping for products and redemption subdocuments for coupons. Each supporting collection/group is bounded to 5,000 documents. Oversized or uncertain verification fails closed; the transaction writes no deletion until all checks pass. No claim is made that external analytics can be erased or completely inspected.

Private `deletedRecords/{kind}_{id}` tombstones and `deletionOperations/{operationId}` receipts preserve minimal retirement/audit evidence and prevent identity reuse. Permanent slug reservations and media assets are retained. No order, account, inventory audit, coupon use, loyalty ledger, payment or financial record is cascade-deleted.

Category ordering correction supports up to 400 categories in one transaction and checks an exact ID/update-time snapshot. It is never run automatically against Production. The proposed rank sequence can be reviewed in the table before Save displayed order. Gaps in already valid unique positive configured orders remain intact; next order uses their maximum + 1.

## Investigation and acceptance limits

The supplied inventory screenshot proves a hosted 503 and invalid SVG symptom, not the server exception. The old inventory query depended on productId/createdAt ordering and omitted records without indexed createdAt. The local implementation now uses a single-field productId query and sorts the complete bounded result, avoiding that composite-index requirement. Shop source ordering similarly moved to the existing complete bounded server scan; sorting no longer depends on separate price/featured composite query shapes. Maximum catalog discovery scope remains 5,000 products; history remains 10,000 events. Over-limit results fail visibly, without presenting a partial result as complete.

No Production logs, current deployed indexes/commit or real production inventory records were accessed. Exact hosted 503 cause and acceptance against the owner's existing production stock history remain **Pending confirmation** after a separately approved release/read-only check. Local verification uses existing model-shaped synthetic emulator records, including legacy history, without production writes.

Flat delivery stays active and server-authoritative; distance delivery remains disabled by default. The saved flat settings, pre-coupon strict free threshold, coupon/points allocation and historical charges are unchanged. See [FLAT_SHIPPING.md](FLAT_SHIPPING.md).

## Focused local validation

- 55 distinct focused model/handler/unit checks passed after updating the three assertions intentionally changed by the new fulfilment/sorting contracts; 28 additional presentation/loading/order checks passed. No skipped tests.
- 34 distinct emulator TAP checks passed across owner improvements, flat shipping, Razorpay lifecycle/cutover, delivery loyalty, coupons, settings, contact, discovery, category rules, COD orders and loyalty lifecycle. Relevant failed fixture/assertion runs were corrected and only affected suites rerun.
- Focused Chromium flow passed: missing/desktop/mobile login artwork, Classic header, search/sorting/empty results, banner keyboard/drag/click, dashboard filter navigation, category suggestion, server-blocked deletion dialog, stock history/source filters, social add/save/remove, COD settings, and maintenance ON/OFF with Admin retained.
- Maintenance overflow checked at 320, 390, 768 and 1440px. Only two useful maintenance screenshots captured (320 and 1440), visually reviewed under `.cache/owner-improvements/`; synthetic support details/images are not Production evidence.
- TypeScript (`npm run lint`), production build and packaged Catalog runtime passed. The packaged payment/webhook path was exercised by the payment suite. Existing large-chunk build advisory remains; no dependencies installed.
- `git diff --check` passed. No real Google call, payment, production account mutation, Firebase rule/index publication, commit, push or deployment.

References for repeating affected acceptance locally:

```powershell
node --import tsx --test src/admin/improvements.test.ts
npm.cmd run lint
npm.cmd run build
npm.cmd run test:catalog-runtime
# Existing guarded harness selectors:
# PARINAYA_CLIENT_SERVICE_FILES=owner-improvements-emulator,flat-shipping-emulator,payments-emulator,payment-cutover-emulator,delivery-loyalty-emulator,coupons-emulator,settings-emulator,contact-emulator,discovery-emulator,category-rules,orders-emulator,loyalty-emulator
# PARINAYA_CLIENT_FILES=owner-improvements
npm.cmd run test:client-changes
```

These are references, not authorization to execute fixtures against Production.

## Remaining owner/release decisions

1. Review local code and the deletion restrictions. Relaxing publication/history restrictions would require additional trusted dependency/history evidence.
2. Include the reviewed Firestore rules in a later explicitly approved release; verify deployed rule/index equality and current hosted inventory/shop behaviour independently.
3. If legacy category ranks need persisting, use Save displayed order after reviewing the existing sequence. No production migration has occurred.
4. Maintenance defaults OFF until explicitly saved. The supplied Stitch design is already integrated and isolated in `src/maintenance/` for later visual replacement.
5. Current Production acceptance and the exact hosted 503 exception remain Pending confirmation. Payment credentials, billing, production data and historical balances were not changed.

## Changed files

- `README.md`
- `docs/OWNER_IMPROVEMENTS.md`
- `docs/README.md`
- `docs/client/admin-catalog-inventory.md`
- `docs/client/admin-content-settings.md`
- `docs/client/admin-orders-customers.md`
- `docs/client/customer-guide.md`
- `docs/technical/api-reference.md`
- `docs/technical/firestore-security.md`
- `firestore.rules`
- `package.json`
- `scripts/catalog-handler.test.ts`
- `scripts/loyalty-emulator.test.ts`
- `scripts/orders-emulator.test.ts`
- `scripts/owner-improvements-browser.test.py`
- `scripts/owner-improvements-emulator.test.ts`
- `scripts/owner-improvements-fixture-control.ts`
- `scripts/settings-emulator.test.ts`
- `server/browse.ts`
- `server/business.ts`
- `server/campaigns.ts`
- `server/catalog.ts`
- `server/categories.ts`
- `server/discovery.ts`
- `server/handler.ts`
- `server/maintenance.ts`
- `server/orders.ts`
- `server/safeDeletion.ts`
- `server/storeSettings.ts`
- `src/App.tsx`
- `src/admin/AdminCategories.tsx`
- `src/admin/AdminDashboard.tsx`
- `src/admin/AdminLayout.tsx`
- `src/admin/AdminPanel.tsx`
- `src/admin/AdminProducts.tsx`
- `src/admin/PermanentDelete.tsx`
- `src/admin/ProductManager.tsx`
- `src/admin/admin.css`
- `src/admin/campaigns/CampaignManager.tsx`
- `src/admin/categories/CategoryEditor.tsx`
- `src/admin/contact/ContactInformation.tsx`
- `src/admin/coupons/CouponsPage.tsx`
- `src/admin/dashboard/Attention.tsx`
- `src/admin/dashboard/model.test.ts`
- `src/admin/enquiries/EnquiriesPage.tsx`
- `src/admin/improvements.test.ts`
- `src/admin/inventory/InventoryOverview.tsx`
- `src/admin/inventory/StockHistory.tsx`
- `src/admin/orders/OrderDetails.tsx`
- `src/admin/orders/detailModel.test.ts`
- `src/admin/orders/detailModel.ts`
- `src/admin/settings/MaintenanceSettings.tsx`
- `src/admin/settings/StoreSettingsPage.tsx`
- `src/admin/settings/ThemeSettings.tsx`
- `src/appearance/LoginPortrait.tsx`
- `src/categories/model.ts`
- `src/categories/repository.ts`
- `src/components/storefront-colours.css`
- `src/contact/ContactPresentation.tsx`
- `src/contact/FloatingSocial.tsx`
- `src/contact/model.ts`
- `src/contact/socialLinks.ts`
- `src/content/BannerSlide.tsx`
- `src/loading/Indicators.tsx`
- `src/loyalty/SettingsCard.tsx`
- `src/maintenance/MaintenanceGate.tsx`
- `src/maintenance/maintenance.css`
- `src/orders/model.test.ts`
- `src/orders/model.ts`
- `src/products/client.ts`
- `src/products/clientChanges.test.tsx`
- `src/products/discovery.test.ts`
- `src/views/ShopView.tsx`
