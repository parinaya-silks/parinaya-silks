# Store Settings

`/admin/settings` now uses the approved responsive card arrangement, Lora, maroon/ivory/gold, existing 192px sidebar and approximately 58px header. No shared-shell scaling changed. The old separate shipping and login editors remain source-compatible but are no longer mounted by this route.

## Source and runtime mapping

| Controls | Existing source | Runtime consumer |
| --- | --- | --- |
| Standard shipping fee | `siteSettings/shipping.flatFeePaise` | Trusted delivery/order review |
| Free-shipping switch/threshold | `freeShippingEnabled`, `freeThresholdPaise` in the same document | `quoteShipping()` |
| Login desktop/mobile images | `siteSettings/loginAppearance.desktop`, `.mobile` | Existing `LoginPortrait` |
| Payment Availability | Trusted API runtime capability projection; no mutable payment settings | Existing COD order service |
| Store Availability | No maintenance configuration exists | Existing storefront and checkout behavior unchanged |

The authoritative money representation is integer paise. The editor uses the existing exact decimal parser, supports zero, and validates at most two decimal places and existing upper limits. Missing/invalid shipping configuration is explicit and never treated as free. Missing configuration starts with empty amount fields; saving requires an approved explicit fee, including an explicit zero if intended. Disabled free-shipping retains its saved threshold; if never configured and omitted while disabled, the stored inactive threshold is zero.

The qualifying amount remains the **product subtotal before coupon discounts**. Shipping is waived only when that subtotal is **strictly greater than** the enabled threshold. Equality still incurs the flat fee. This intentionally differs from the illustrative “at or above” screenshot. Existing orders and payment amounts are never rewritten, and browser-submitted shipping totals are not accepted. `shippingRevision` invalidation remains connected to current customer checkout reviews.

## Supported capabilities and design differences

Inspection found a real COD order service, but no owner-controlled COD switch, online-payment provider integration, online availability configuration, or maintenance subsystem. The Payment Availability card therefore presents read-only server-reported capabilities: COD supported for valid checkout; online payments not integrated. It makes no claim about live provider credentials or production provider readiness. There are no fake toggles, secret-key inputs, provider onboarding or test-payment actions. The Store Availability card explains that maintenance is not implemented and has no toggle/message editor. No new operational payment/maintenance subsystem was added, and no existing gates, authentication, callbacks or reconciliation behavior changed.

The preview uses the current **email/password** login frame, not the screenshot's OTP mockup. It is inert, private, uses current unsaved values and is labelled “Preview — unsaved changes.” Desktop/Mobile modes adapt the existing frame's presentation to the preview panel without CSS zoom or transforms. The real authentication page remains unchanged; preview injection is an optional `AuthFrame` portrait slot. No public preview flag or endpoint exists.

Actual image recommendations remain **1200×1500 (4:5)** desktop portrait and **1600×700 (16:7)** shallow mobile banner; the real customer breakpoint stays 1024px. These differ intentionally from the screenshot's inconsistent landscape/portrait labels. Each missing or failed device-specific asset uses the approved `/assets/customer-auth-portrait.jpg` fallback. Controls show saved images or explicitly identify that fallback. Alt text and focal coordinates stay device-specific. Mobile does not download the saved desktop asset on the real login page. Existing responsive loading and 30 second visible/focus refresh remain unchanged.

## Atomic persistence and security

`settings:get` reads shipping and login appearance without initialization or seeding, and exposes allowlisted settings, separate trusted timestamps and nonsecret runtime capability labels. It never reads or writes Website Content, contacts, About Us, banners, campaigns or returns.

`settings:save` accepts only `shipping`, `appearance`, both expected revisions and an operation ID. Unchanged groups are explicitly null. At least one changed group is required. Both sources' revisions are checked, even if one group is unchanged. The transaction validates payloads, revisions, schema compatibility and all requested image records before writing anything. It patches only changed settings sources with merge semantics and preserves unrelated document fields. Shipping writes also update the safe revision signal with merge semantics. There is no partial-save success state: failed validation/conflict aborts all changes. Success “Store settings updated.” follows server confirmation only.

Each changed source stores a `storeSettingsOperation` id/hash/actor marker alongside its existing revision and trusted timestamp/actor. Retrying the same confirmed operation is idempotent. Operation reuse with changed payload/actor or inconsistent markers is rejected. Existing `shipping:*` and `appearance:*` APIs stay available for compatibility; the new screen uses the combined transaction. Concurrent legacy or new saves advance source revisions and are surfaced as conflicts. Entries remain visible; review loads the latest saved version, and adopting it or keeping entries against its revisions requires explicit confirmation. Browser focus/visibility never replaces dirty fields.

Both `admin:true` and enabled `adminAccess/{uid}` are required for protected reads/writes/uploads; access is rechecked during transactions. Login uploads continue using existing signed `appearance:sign` / `appearance:verify`, registry `loginAppearanceMedia`, purpose `login-appearance`, correct device and trusted Cloudinary metadata. New selections must belong to the acting administrator; an already-saved correct-device reference can be retained by another administrator. Arbitrary URLs, founder/banner/product media, unverified records and wrong-device records are rejected. Cloudinary signing secrets remain server-side.

Selecting/uploading is separate from settings save. Pending/failed uploads block saving while other inputs remain intact. Upload progress, reupload and verification retry are available. Replacing/removing never deletes Cloudinary assets. Cancel restores both settings groups, aborts component requests and releases blob URLs. Save uses an abortable request and submission lock. Existing dialog infrastructure supplies Escape handling and focus containment/restoration. Mobile actions reserve space, include safe-area padding and remain visible in a short viewport.

## Verification and release

Unit checks cover exact paise conversion, explicit missing values, disabled threshold retention, zero and strict boundaries. `settings-emulator.test.ts` covers handler signed-out rejection, both admin checks, atomic all-or-nothing publication, marker-preserving merges, unaffected shared content/orders, ownership/purpose/device checks, removal without media deletion, retry/conflict/races and direct-client denials. Existing shipping and COD/order emulator suites remain relevant. Browser suites cover current settings, separate login media/public responsive loading and the checkout shipping flow; old selectors were updated to the combined screen.

No new serverless function, dependency, environment variable, Firestore rule/index publication, provider setup or migration is required. The owner must release application code, then perform hosted acceptance with an existing authorized admin: saved shipping effects on a new checkout review, real signed images, refresh/fallback and desktop/mobile layouts. Local fixtures do not establish hosted readiness. No production settings, records, media, users or payments were modified or created.
