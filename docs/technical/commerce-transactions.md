> **Current shipping status (11 November 2026):** `DISTANCE_DELIVERY_ENABLED=false` by default. New checkout uses the existing saved flat shipping configuration, before coupons/points, with free shipping strictly above its saved threshold. Google Routes, dispatch coordinates, slabs and distance quotes are inactive. Historical order charges are unchanged. Distance-specific material below describes a retained, inactive implementation until a future explicitly approved re-enable. See [current flat shipping reference](../FLAT_SHIPPING.md).

# Commerce transactions: payments, coupons and loyalty

For maintainers and payment reviewers. Baseline: local source, 11 November 2026. Hosted acceptance, current gateway mode/configuration and actual balances are **Pending confirmation**. Existing owner-reported successful TEST acceptance is not a new transaction performed during this documentation run.

## Order acceptance and totals

The order service remains the single acceptance path for COD and Razorpay reservation. It reads the selected source, products/current stock, address, coupon usage/eligibility, loyalty terms/balance and trusted delivery quote. The final transaction validates confirmation before writing inventory movement, financial/address snapshots, coupon usage, points reservation, receipts and order evidence.

Money uses exact integer-paise arithmetic, with BigInt where needed. With distance delivery disabled:

1. Merchandise subtotal uses current product selling prices and quantities.
2. Flat delivery uses the saved fee, waived only when the original merchandise subtotal is strictly above the enabled saved threshold.
3. Coupon saving reduces merchandise after shipping eligibility is determined.
4. Point saving reduces remaining merchandise under its cap; it does not alter flat shipping.
5. The server confirms total payable. Browser amounts are not trusted.

New flat orders record `pre-coupon-strict-shipping-v1`. Historical orders retain saved calculation policy/amounts. The retained `road-distance-post-coupon-before-points-v2` implementation is inactive until explicitly re-enabled.

## COD lifecycle

New COD acceptance requires a valid review, saved flat shipping and COD enabled; no distance quote is needed. Missing legacy COD settings preserve availability; malformed saved settings fail closed. Accepted receipts are checked before new-order eligibility, so disabling COD does not invalidate a previously accepted order's recovery.

COD collection is a separate external financial record. Delivered does not collect COD, and collection alone does not qualify a delivery award. Supported cancellation/rejection/return operations manage stock and loyalty under their recorded lifecycle, not by recalculating current prices/settings.

## Online lifecycle

`server/payments/config.ts` requires a matching mode/key prefix and valid server secrets. LIVE initiation additionally needs `RAZORPAY_LIVE_ACTIVATED=true`. Production TEST initiation requires an allowlisted UID; the local TEST switch cannot bypass Production. Production initiation also needs a worker secret and a mode/key-matching heartbeat less than five minutes old. Preview operations reject.

The accepted order reserves stock, coupon usage and points while provider order creation proceeds. A per-customer unresolved-payment lock prevents a competing new checkout. Unknown provider creation cannot be assumed absent: recovery queries provider evidence before safe release. The same operation/order identity prevents duplicate acceptance when a response is lost.

Callback signature verification is followed by provider reconciliation. Validate provider identity, amount/currency and captured state before settled success. AUTHORIZED, CAPTURED, FAILED, expired/released and MANUAL_REVIEW states have different consequences. A later successful attempt can coexist with historical failed-attempt evidence; do not overwrite that history for display convenience.

Failure/dismissal alone does not immediately prove that stock/coupon/points can be released. Trusted expiry/reconciliation and settlement own recovery. Captured reservations are consumed once. Refund evidence and ambiguous outcomes may require review rather than automatic restock or new payment.

## Webhooks and worker

Webhook validation uses raw bytes and a separate webhook secret. The seven supported events are listed in the [API reference](api-reference.md). Events are accepted idempotently by event identity/body hash, recorded with mode/key and processed through provider reconciliation. A 202 response means accepted evidence, not finished fulfilment.

`server/payments/queue.ts` applies active `mode` and `keyId` equality filters and due time **before** the 20-record limit for each queue. Different-mode or old-key records cannot consume the matching queue's capacity. The two composite indexes are documented in [data/security](firestore-security.md).

The authenticated worker processes due records and records `paymentOperations/worker`. An idle result such as zero processed/pending/checked can be normal; freshness, mode/key and operational errors must also be inspected. A 200 response is not payment acceptance evidence.

Only strictly eligible clean CAPTURED TEST attempts with consumed reservations can retire periodic scheduling. Attempts, orders, mappings, webhook events and provider evidence remain. Refund/review/active/released conditions prevent that shortcut. Do not generalize this cleanup to LIVE captures or unresolved histories. Existing explicit-ID cleanup scripts are privileged operational tools, not routine build steps.

## Coupon eligibility and concurrency

Public discovery selects discoverable coupons and presents eligible/ineligible states and reasons. Hidden/private codes are not automatically advertised. Authenticated eligibility uses trusted checkout source, merchandise, limits and delivered-order history; no client-supplied order count is authoritative.

Specific-order coupons use exactly the qualifying number of previous Delivered orders. Final placement checks eligibility again. Review never consumes usage. Transactional usage checks, revision/fingerprint confirmation and replay receipts prevent racing customers or retries from consuming the same limited entitlement incorrectly.

Product Details uses a collapsed selector; checkout Review provides available public coupons; Shop omits the old list. Ineligible apply actions are disabled and the server also rejects ineligible use. Discovery is not the final discount authorization.

## Loyalty lifecycle

`siteSettings/loyalty` owns current program terms. Each eligible order snapshots its terms and allocation; later setting changes do not rewrite it. `loyaltyAccounts/{uid}` and its ledger are private server-managed records. Available points are bounded by balance, minimum redemption, maximum percentage and coupon compatibility. The customer cannot submit authoritative balances/rates.

Apply/Remove Points only changes requested redemption and refreshes review. Acceptance reserves points and pending earnings atomically. Stable ledger identities and transactional updates prevent concurrent spending and duplicate earning/restoration.

For eligible Delivered orders, pending earnings become available and reserved redemption is settled. COD recorded collection is not required. Online orders still require eligible captured evidence; refunds/return state or invalid saved terms can block an award. No snapshot means no automatic historical entitlement. There is no general balance editor, expiry/referral/transfer program or automatic backfill.

Whole-order supported pre-completion cancellation/rejection releases pending/reserved terms. Refund allocation can restore redeemed points and reverse earned points proportionally. Already-spent reversed earnings can create debt; available balance does not become spendable negative credit. Global program disablement does not erase existing obligations.

The detailed formulas, incremental line/shipping allocation, point-only refunds and unpaid-return handling are retained in [LOYALTY.md](../LOYALTY.md). Its strict pre-coupon flat shipping rule is active again. Provider-confirmed online refunds can freeze redemption pending trusted allocation/review; do not invent automatic equivalent COD refund records.

## Refund and historical safety

Admin online refund initiation is not enabled. The provider is the source for online refund state; actual initiation uses the client's separately authorized Razorpay workflow. Request resolution is not proof of money movement. COD manual-refund recording requires external evidence and supported allocation.

Never bulk-delete histories, mark an unknown payment captured manually, recreate a retired TEST schedule to fabricate freshness, or change credentials to force an old-mode order through a new-mode check. See [maintenance](../operations/maintenance-troubleshooting.md) and [release](../operations/deployment-release.md).

Sources: `server/orders.ts`, `server/payments/{config,service,provider,settlement,queue}.ts`, `server/couponDiscovery.ts`, `server/business.ts`, `server/loyalty.ts`, `server/loyaltyEligibility.ts`, `src/orders/model.ts`, `src/loyalty/model.ts`. Reused records: [PAYMENTS](../PAYMENTS.md), [cutover](../PAYMENT_LIVE_CUTOVER.md), [coupon/loyalty audit](../COUPON_LOYALTY_AUDIT.md).
