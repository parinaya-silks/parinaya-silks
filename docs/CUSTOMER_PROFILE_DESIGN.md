# Customer Profile / My Account

Local implementation of the approved desktop and mobile account designs at
`/account`. Existing storefront header, logo, footer and five-tab navigation are
retained. The signed-in account no longer uses the login portrait composition;
signed-out sign-in/registration and administrator-managed login imagery remain.

## Sources and writes

| Data | Authoritative source / operation |
| --- | --- |
| Sign-in email and session | Firebase Authentication; email is read-only |
| Name / contact mobile | `customerProfiles/{uid}`; trusted `profile:update` |
| Initial profile recovery | Existing `ensureCustomerProfile` / pending profile flow |
| Saved addresses | `customerShopping/{uid}/addresses` and existing address APIs |
| Default address | Single `customerShopping/{uid}/preferences/delivery` pointer |
| Points and current redemption value | Existing `loyalty:account` response |
| Paginated ledger | Existing `loyalty:customerHistory` response |

Every protected API derives the UID from the verified token. No profile UI UID,
email, claim or browser storage flag grants access. Existing Firestore owner-only
reads and direct-write restrictions remain unchanged. No email/phone verification,
email/password change, new balance store or new profile collection was added.

Profile saves update only allowed name/mobile fields and the established derived
directory synchronization, preserving unrelated fields. `expectedProfile` is an
optional backwards-compatible guard comparing the name/mobile snapshot in the
server transaction. The new editor supplies it. Conflicts retain edits and offer
explicit reload; an identical save whose response was lost can be retried safely.
Normal profile edits retain the existing source-profile path; Firebase Auth
display-name synchronization remains in the established registration/recovery flow.
Historical orders and addresses are never rewritten by account edits.

## Three-address policy and legacy books

`ADDRESS_LIMIT` is now three, shared by Profile, Checkout and the trusted delivery
service. Creation checks the full personal collection inside the transaction that
also reads/writes the default pointer. Simultaneous creates cannot bypass the cap.
Operation receipts preserve retry identity, including the optional `makeDefault`
boolean. Profile address saves can atomically set the default; older clients may
omit this optional field and retain their previous behavior.

Listing and subscriptions do not truncate or reject legacy books above three.
All existing entries remain accessible for edit, deletion and default management;
creation is blocked until fewer than three remain. Existing document fields are
merged on edit. Deleting the default reuses the existing deterministic replacement
pointer; no competing per-address default flags were introduced. No migration or
automatic deletion is needed.

## UI and supporting states

- Customer-derived initials and greeting; neutral initials when no name exists.
- Personal details and read-only email; completion action for missing legacy phone.
- Name/mobile dialog with existing phone parsing, default +91 for unset numbers,
  field errors, sending lock, server-confirmed success, retry, conflict reload and
  discard confirmation only for actual dirty input.
- Shared address editor and confirmed deletion, presented as desktop dialogs/mobile
  sheets only in Profile. Existing Checkout presentation is preserved.
- Available points use the API value. Pending and reserved points remain separate.
  Current worth is shown only when configured and enabled. Disabled programs retain
  balance/history access; disabled empty programs omit promotional UI. Loading/error
  states never masquerade as zero balances. Redemption remains in Checkout.
- History shows actual types, changes, pending/reserved deltas, reasons, IST dates
  and existing order links, with cursor pagination and a working return to page one.
- My Orders, Help & Contact and Sign out reuse existing destinations/auth flow.
- Native dialogs provide focus containment/restoration and Escape. Dirty inputs
  are local to the form and survive background refresh/tab focus. Account changes
  unmount private forms and clear private state; stale responses are ignored.

Profile CSS is scoped to `.customer-profile`. No global sizing, Admin styling,
Home, Shop, Wishlist, Checkout or order-screen redesign is included.

## Necessary differences from Stitch

The existing storefront chrome, logo and local Lora are retained. Fictional
membership numbers, tiers, verification badges, certification, insurance,
packaging, concierge benefits and support promises are omitted. Real ledger amounts,
address counts and recipient/contact details replace the prototype records. India
delivery fields and existing phone-country handling remain; no Maps, geolocation
or address-autofill integration was added. More than three legacy addresses are
explicitly preserved, rather than forcing the prototype's three-card view.

## Validation and release

Focused validation includes typecheck, unit tests, production build, the updated
delivery and business emulator suites, profile functional acceptance, existing
shared delivery/Checkout and login-appearance browser regressions, and a final
layout smoke at 320, 390, 768 and 1440px. These cover transactional creation races,
exact retries, defaults/deletion, seven-address legacy fixtures, field protection,
profile conflicts and unrelated-field preservation, historical order-address
preservation, point errors/zero/disabled/history pagination, sign-out/account
isolation, dirty forms/focus and long content. All mutations use loopback emulators.
Typecheck, all 143 unit tests and the production build pass. Both emulator suites
and all four browser groups pass; completed checks were reused during the final
layout-only pass. The build retains its existing bundle-size advisory.

Screenshots are under `.cache/profile-design/`: `account-{width}.png`,
`edit-details-{width}.png` and `address-sheet-390.png`. The two
`comparison-account-{390,1440}.png` artifacts compare the respective exports with
the local account at equivalent CSS widths; simulator controls are removed only
from reference captures. Full-page images preserve viewport-fixed navigation.

No new dependencies, credentials, rules, indexes, uploads or production migration
are required. Release must include the updated frontend **and** server code so
the three-address cap is enforced in production. Hosted acceptance remains for
the owner after release. Local emulator results do not establish hosted behavior.
Nothing was committed, pushed, deployed, published or changed in production.
