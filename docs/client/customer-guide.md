> **Current shipping status (11 November 2026):** `DISTANCE_DELIVERY_ENABLED=false` by default. New checkout uses the existing saved flat shipping configuration, before coupons/points, with free shipping strictly above its saved threshold. Google Routes, dispatch coordinates, slabs and distance quotes are inactive. Historical order charges are unchanged. Distance-specific material below describes a retained, inactive implementation until a future explicitly approved re-enable. See [current flat shipping reference](../FLAT_SHIPPING.md).

# Customer guide

For customers and store support. Describes the inspected local application on 11 November 2026, including unreleased delivery changes. Actual availability, shipping terms and accepted payment methods depend on the store's deployed configuration. Approved commercial policies: **Pending confirmation**.

## Account and contact details

Register with name, email, mobile number, password and confirmation. The phone field normalizes country-code contact information. Registration signs the customer in; the application does not require or send a customer email-verification step. Password reset uses Firebase email actions and a neutral confirmation message.

Sign in with email/password. Remember me determines persistent versus session sign-in. If account creation succeeds but profile saving fails, use the recovery screen rather than registering again. Account details and saved addresses belong to the signed-in account. The email is the sign-in identity; the profile editor is not an email-change tool. Sign out before switching accounts on a shared device.

## Find and inspect a saree

Use Shop/category pages, search and the available price/colour/type filters and sorting. Product details show the saved description, price, images, blouse information, selected variant and current availability. Inspect gallery/zoom controls and use a product's reel/video action when the store has supplied a supported link. Images and displayed stock are not a reservation.

Wishlist saves references for later. Bag lets you review quantities/variants and remove items; unavailable items are excluded or must be resolved before checkout. Sign in when prompted to preserve account-owned shopping actions. Buy Now starts checkout for the chosen item separately from the Bag. Confirm variant and quantity before continuing.

## Addresses and delivery

Save up to three delivery addresses, select the destination and set a default where offered. Full recipient contact and postal address remain required. The optional map pin supplements that address; it never replaces house/street, locality, city, state and PIN.

The map picker is inactive in ordinary flat checkout. Enter a complete postal address manually; no coordinates or location permission are required. Existing saved coordinates remain preserved. Editing an address requires the usual checkout review.

Flat shipping is active. The server uses the saved per-order fee and free-shipping threshold. Google billing, keys, Routes availability, dispatch coordinates and distance slabs do not participate in checkout. There is no pickup option.

Free delivery uses merchandise subtotal before coupons and Loyalty Points and applies strictly above the saved threshold. Equality pays the flat fee. The historical draft default was ?99 with a ?10,000 threshold; actual saved Production amounts are Pending confirmation. Missing/invalid shipping settings require store review; there is no guessed fee.

## Coupons and Loyalty Points

Shop does not display the previous coupon-card list. Product Details offers a collapsed coupon selector; checkout Review provides **View Available Coupons**. Publicly listed offers can show Eligible or Not Eligible with a reason. Ineligible offers cannot be applied. Private codes are not advertised but may be entered manually at checkout.

Eligibility can depend on minimum merchandise value, dates, usage limits and the exact number of previous Delivered orders. Seeing a code does not guarantee a discount. Apply it, review the server-confirmed saving and remove it if unwanted. Only one coupon is used for the order.

Where the loyalty program is enabled, checkout shows available points, limits and savings. **Apply Points** requests redemption; **Remove Points** removes it. Settings, balance, minimum/cap and coupon compatibility can reduce or reject a requested amount. Nothing is reserved merely by previewing points or coupons.

Expected new points remain pending until an eligible order is Delivered. COD collection is a separate event and is not required for a qualifying delivery award. Online orders must have eligible verified payment evidence. Cancellations/refunds can restore redeemed points or reverse earnings; see Account history and the store's approved policy. Historical orders without loyalty terms are not automatically backfilled.

## Review and payment

1. Choose/confirm an address and resolve product/stock issues.
2. Continue to **Review your order**. Review items, coupon/points savings, delivery and payable total.
3. Continue to Payment. Only currently available payment methods are offered.
4. Submit once. If prices/settings/eligibility changed, review the refreshed result before confirming again.

**COD:** place the order only when COD is offered. Payment remains due according to the order and store instructions. Delivery itself does not record cash collection.

**Online:** Razorpay checkout offers methods supported by the configured account. Complete the provider flow, then allow server verification to finish. A browser success callback alone is not payment confirmation. TEST-labelled checkout is for approved testing, not proof of live collection.

If payment fails, is dismissed or its result is uncertain, use **Check payment status**, the existing retry/resume action or My Orders as offered. Do not start a new payment blindly after a timeout or debit. A failed attempt does not necessarily mean its stock/coupon/points hold was released immediately. Contact support if the state remains unresolved.

## After ordering

Use Account → My Orders and **View Order & Updates**. Order details show saved items, address, financial summary, payment state and recorded progress. Missing courier/tracking/ETA information is shown as not assigned/provided; it does not by itself invalidate a status update. A courier link is external, manually supplied tracking information.

Cancellation/return actions depend on current order state, request history and approved store settings. A submitted/approved request is not proof of a completed refund. Online refund status follows provider evidence; the store handles refund initiation outside the Admin payment panel. Exchange wording does not imply an automated replacement-order engine.

Support links use the store's published phone, email or WhatsApp details. WhatsApp opens a conversation; sending remains the customer's choice. Enquiry submission records an enquiry for staff; it does not prove email delivery.

Analytics is optional. Allow analytics/No thanks and footer preferences control the storefront's GA4 page views; declining does not prevent shopping.

Sources: `src/customer/service.ts`, `src/views/`, `src/products/PublicProduct.tsx`, `src/shopping/`, `src/offers/AvailableCoupons.tsx`, `src/delivery/`, `src/orders/CustomerOrderPage.tsx`, `src/analytics/`. Detailed existing references: [authentication](../CUSTOMER_AUTH.md), [purchase journey](../PURCHASE_JOURNEY.md), [loyalty](../LOYALTY.md), [distance delivery](../DISTANCE_DELIVERY.md). Read the [index](../README.md) before using historical milestone statements.
