# Admin orders and customers guide

For fulfilment, customer support and authorized store operators. Baseline: inspected local code, 11 November 2026. Production state and approved business procedures are **Pending confirmation**.

## Dashboard and work queue

Dashboard cards show current New (Placed), To Pack (Confirmed), To Dispatch (Processing), Out for Delivery (Shipped) and Delivered counts across all dates. Click a card to filter Orders. Each order has one saved status; Shipped is the stored status behind the Out for Delivery label. The selected-period new-order count remains separate. Visible Admin data refreshes about every 30 seconds and after supported changes.

Orders supports its existing search, status/payment/date filters and pagination. Open details to confirm items, saved address, totals, payment and request history before changing an order. A cancelled/rejected order can retain a historical order value; that is not collected revenue.

## Delivery updates

Use the order's **Update Delivery** panel. Select a valid next status, optionally add shipment information, review the proposed change and confirm. Status transitions remain restricted: Placed → Confirmed; Confirmed may move to Processing, Shipped or Delivered; Processing may move to Shipped or Delivered; Shipped → Delivered. Cancellation/rejection checks remain. Courier fields are optional for these transitions.

All these fields are optional, including when marking a valid order Shipped or Delivered:

- Courier Partner, with **Not assigned** as the default.
- Custom Courier Name.
- Tracking URL.
- Consignment / AWB Number.
- Estimated Delivery Date.

When supplied, values must still be valid: tracking links use safe external URLs, AWB uses permitted characters and a newly entered ETA must be a valid supported date. Omitted update fields preserve existing values; use explicit clear controls to remove saved details. Empty/missing fields display as not assigned/provided. Old guide paragraphs and some legacy helper copy requiring courier/AWB are not the current validation rule.

The customer sees the saved progress and available tracking/ETA. These are internal status updates plus optional external links, not automatic carrier booking or synchronization. No automated email/SMS/WhatsApp delivery should be inferred from a successful status update.

## Bulk order updates

Select eligible orders on the current page and choose a shared valid workflow action. Review before confirming. Selection is bounded to the current page (maximum ten); mixed/changed states can restrict available actions. The operation processes individual orders and reports updated, failed and skipped results. It is not an all-or-nothing multi-order transaction.

Refresh after a conflict. For uncertain requests, use recovery of the original operation; do not blindly resubmit with a new operation identity. Review every failure instead of assuming the entire selection succeeded.

## COD and online money

**COD:** the separate Record Collection action is removed for new operations. Saved payment method, payment status, collections and refund/audit history remain visible. Delivered does not automatically mean paid. Historical collected orders keep their supported refund handling.

**Razorpay:** inspect the saved mode, provider order/payment identifiers, verified state, reservation, amount and provider-check time. Use **Reconcile with Razorpay** when authorized. CAPTURED/consumed evidence is materially different from an earlier failed attempt; timestamps can retain that history. A callback, screenshot or order reference alone is not sufficient payment evidence.

**Refunds:** the online payment panel tracks provider-confirmed refund information but does not initiate refunds. Use the client's authorized Razorpay account and approved process outside this panel. An internal return decision does not move money. Provider refunds can require trusted merchandise/loyalty allocation and review.

For the supported COD external-manual-refund workflow, record actual external evidence and the required allocation. Loyalty discounts cannot be refunded as cash. See the [transaction reference](../technical/commerce-transactions.md) before handling partial allocations.

## Requests, restocking and loyalty

Review customer cancellation/return requests against the saved state and approved policy. Request approval, financial refund and physical stock restoration are distinct steps. Restock only stock actually received/eligible through the supported order action. Do not duplicate recovery-worker stock release with a manual inventory adjustment.

An eligible Delivered order awards its saved pending loyalty terms without requiring COD collection. Verified online payment eligibility still applies. Cancellation/returns/refunds can release reservations, restore redeemed points or reverse earnings. Spent earnings may leave debt rather than silently disappearing. There is no general Admin balance editor or automatic historical award backfill.

## Customer directory and exports

Use **Customers** for the supported search/filters, details, saved addresses, order summaries and points history. The directory is a derived projection; a count/export is not proof that every Firebase Authentication account has a complete business profile.

Where offered, choose selected, matching, all or single-customer export scope and fields. Verify completion before treating a downloaded CSV as complete. Store exports securely; they contain personal data. Do not use exports as a replacement for Firestore/Auth backups.

Internal notification controls help operators navigate recorded events; they do not send customer messages. Support uses the configured Contact/WhatsApp links and approved human procedures.

Sources: `src/admin/AdminDashboard.tsx`, `src/admin/orders/`, `src/admin/customers/`, `src/payments/AdminPayment.tsx`, `server/orders.ts`, `server/business.ts`, `server/customerDirectory.ts`, `src/orders/delivery.ts`. Detailed references retained: [orders](../ORDERS_LIST.md), [delivery history](../DELIVERY_UPDATE.md), [customer directory](../CUSTOMERS.md), [loyalty](../LOYALTY.md), [payments](../PAYMENTS.md).
