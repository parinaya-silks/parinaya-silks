> **Current shipping status (11 November 2026):** `DISTANCE_DELIVERY_ENABLED=false` by default. New checkout uses the existing saved flat shipping configuration, before coupons/points, with free shipping strictly above its saved threshold. Google Routes, dispatch coordinates, slabs and distance quotes are inactive. Historical order charges are unchanged. Distance-specific material below describes a retained, inactive implementation until a future explicitly approved re-enable. See [current flat shipping reference](../FLAT_SHIPPING.md).

# Admin content and settings guide

For authorized content editors and store owners. Baseline: inspected local code, 11 November 2026, including uncommitted distance delivery. Production settings and approved wording are **Pending confirmation**.

## Publishing content

**Marketing / Sale Campaigns:** maintain campaign intent, timing, membership and supported presentation through the existing editor. Preview before publishing. Public visibility depends on campaign state/schedule and eligible products. A campaign discount and a checkout coupon are different mechanisms; do not assume one creates the other.

**Coupons:** maintain code, type/value, minimum/cap, activity/dates, usage limits, public discovery and supported customer order-number eligibility. Review eligibility and limits before saving. Public discovery does not bypass checkout validation. Existing usage and historical order snapshots are preserved. Product Details and checkout use collapsed discovery controls; Shop does not show the old coupon list.

**Banners:** verify media, target and active period. Campaign-linked banners must respect campaign availability. Store Settings controls per-banner timing within the supported range. Uploading/preparing media alone does not publish it.

**Website Content:** edit the registered text sections through Content Overview. This is not a freeform page builder. Separate Contact Information, About, Banners and Campaign editors retain their roles.

**Policies:** enter business-approved nonempty wording and confirm approval before saving. Policy UI is implemented, but legal/commercial approval must come from the owner. Do not publish historical sample/draft text as a final policy.

**Contact Information:** maintain public phone/email, effective WhatsApp number/message, address/map link, hours and up to 20 ordered social platforms. Add/edit/remove a name, HTTPS URL, icon identifier, visibility and display order. Existing Instagram/Facebook fields are projected into the initial list without a data migration; an explicitly saved empty list removes all public profiles. Public projection/validation omits invalid or unavailable values. Review visibility on the customer site after an authorized release/save. Support links open the appropriate external application; they are not outbound messaging services. The public contact address is separate from the private dispatch origin.

**About Us:** use the existing story/founder/image fields and verified media workflow. Confirm rights and factual business claims with the client.

**Customer Enquiries:** submissions are stored for Admin review. Review details and use supported status/delete controls carefully. Marking Replied is a record of staff action, not proof that the application sent an email. Respond through the approved communication channel.

## Store Settings

### Appearance

Storefront Appearance offers Classic Cream and Light Maroon. Preview selection does not publish; **Save Theme** applies it and Cancel discards the draft. The existing Lora typography, photographs, responsive layouts and Admin styling are retained.

Login Page Appearance prepares separate desktop/mobile images. Verify the uploads and use the main Save action to apply them. Homepage Banner Settings controls supported whole-second slide timing; it is independent from campaign publication.

### Loyalty

Set earning spend/points, point value, minimum redemption, maximum percentage and coupon compatibility. Enable only owner-approved rates. Missing configuration means disabled; no commercial rates are automatically seeded. Settings changes do not rewrite existing order terms. Review [loyalty details](../LOYALTY.md) and the current [commerce reference](../technical/commerce-transactions.md).

### Flat shipping (active)

The flat editor controls the saved per-order fee, free-shipping switch and threshold. Qualification is strictly above the original merchandise subtotal before coupons and points. Historical draft defaults are ?99 and ?10,000; saved approved values remain authoritative. Distance delivery is disabled and the dispatch/slab editor is inactive. No Google setup is required for flat checkout.

### Dispatch and distance pricing (retained, inactive)

The local delivery implementation adds **Dispatch Location** with name, complete address, latitude, longitude, optional Google Maps URL and active state. Enter the actual approved origin. The application does not infer shop coordinates from a Maps link or from public contact details. The optional map selects a pin; manual coordinates remain supported.

Distance-based Delivery Pricing accepts 1–20 ordered maximum distances and INR fees. Each range starts immediately above the previous maximum; the first starts at zero. Boundaries are inclusive at the upper end. A disabled range is unavailable, not an invitation to charge the next range. Beyond the highest maximum is unavailable.

Initial unsaved examples are 5/10/20/30 km and ₹40/₹60/₹90/₹120; they are not evidence of the current saved business policy. Free shipping initially proposes ₹10,000, inclusive, after coupon savings and before Loyalty Points. Coverage must still be available. Save only approved values.

Google Routes configuration is required before this checkout cutover can accept new orders. Do not deploy the local delivery change without completing the [Google/release gates](../operations/google-routes-setup.md). There is no pickup option or flat/mock fallback.

### Payment availability

**Enable COD for new orders** controls new COD acceptance. Accepted historical COD orders and operation recovery remain valid when COD is later disabled. Missing legacy COD configuration preserves availability; malformed saved configuration fails closed.

Online availability is reported from trusted Razorpay mode/credential/activation/account/worker checks. There is no independent Admin Online Payments OFF toggle. Do not interpret a configuration label as proof of a successful payment. Website Maintenance Mode defaults OFF and has a separate Save Availability action. ON closes normal customer pages and shopping/catalog/new-order APIs while preserving Admin and existing payment verification/recovery/webhooks. OFF restores server access immediately and updates connected pages through a minimal public signal; polling is the fallback. See [maintenance behaviour and limits](../OWNER_IMPROVEMENTS.md).

## Save, cancel and conflicting edits

Review unsaved changes. The settings editor saves relevant changes with revision checks and replay protection. Theme has its separate Save Theme workflow. Existing orders and unrelated content are preserved.

If another session changed settings, use the latest-saved review. Compare before keeping your entries against new revisions. Cancel/discard restores saved values; an upload preview or selected toggle is not a successful save. Avoid concurrent operators editing the same setting without coordination.

Sources: `src/admin/settings/`, `server/storeSettings.ts`, `src/admin/campaigns/`, `src/admin/banners/`, `src/admin/website/`, `server/websiteText.ts`, `server/content.ts`, `server/enquiries.ts`, `src/contact/model.ts`. Reused references: [Store Settings](../STORE_SETTINGS.md), [distance delivery](../DISTANCE_DELIVERY.md), [themes/offers](../STOREFRONT_THEMES_AND_OFFERS.md), [website text](../WEBSITE_CONTENT.md), [campaigns](../CAMPAIGNS.md), [banners](../BANNERS.md), [contact](../CONTACT_INFORMATION.md), [enquiries](../ENQUIRIES.md).
