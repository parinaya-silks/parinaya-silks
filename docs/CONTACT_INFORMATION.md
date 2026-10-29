# Contact Information

`/admin/contact-information` manages customer-facing business information in the existing `siteSettings/storeContent.contact` object. It does not change Firebase Authentication, administrator email, customer profiles, notifications, shipping, checkout or order records. The existing compact admin shell, local Lora font and theme remain unchanged.

## Mapping and compatibility

| Editor field | Storage under `contact` | Public consumers |
| --- | --- | --- |
| Support phone / country | `mobile` (E.164), `phoneCountry` (ISO country) | Contact page Call, footer Support and policy support links |
| Support email | `email` | Contact page, footer and policy email links |
| WhatsApp toggle/source | `whatsappEnabled`, `whatsappUseSupport` | Whether public WhatsApp links/buttons are available |
| Separate WhatsApp phone/country | `whatsappNumber`, `whatsappCountry` | Used only when support inheritance is off |
| Default message | `whatsappMessage` | URL-encoded prefilled text; product/order enquiry context may be appended |
| Address fields | `addressDetails.{line1,line2,city,state,postalCode,country}` | Combined visible address in Contact, footer, existing home hero and navigation drawer |
| Legacy address | `address` | Preserved verbatim when no structured replacement has been entered; combined address stored after structured saves |
| Address visibility / Maps | `showAddress`, `mapsUrl` | Address and directions omitted publicly when hidden |
| Social profiles | `instagram`, `facebook` | Contact page and footer, only when supplied and valid |
| Hours / visibility | `hours`, `showHours` | Contact page and footer, only while shown |

The previous four-field `{email,mobile,address,instagram}` shape remains readable. Valid legacy phone country is inferred without replacing the number. A saved legacy phone enables the previously available support-number WhatsApp behavior unless an explicit toggle exists. A saved legacy address remains visible unless explicitly hidden. New unset phone controls default to IN/+91; message, address details, maps, profiles and hours are not seeded with sample content. Missing data produces no hardcoded phone/email/profile/address fallback.

Structured addresses use ISO country selection. India requires a state and six-digit nonzero-leading PIN for a visible structured address; US postal codes use ZIP/ZIP+4. Other countries accept bounded international letters/numbers/spaces/hyphens rather than Indian PIN rules. Visible structured addresses need line 1, city and country. Existing unstructured addresses can be retained without guessing their components. Hidden values remain in the editor and database. Stored contact subfields and unrelated nested address metadata are preserved by per-field updates.

## Validation and links

The existing `libphonenumber-js/max` dependency validates and normalizes pasted phone formatting. Support numbers may be fixed lines as well as mobiles; customer registration's mobile-only validation is unchanged. Explicit international numbers retain their dialing prefix. Nonempty phone values must be valid even if optional display is off. Email follows the existing basic format check; mailto values are encoded to prevent header/query injection.

Instagram/Facebook links require HTTPS, no credentials/nonstandard ports and parsed exact supported platform hosts. Maps supports `google.com/maps`, `google.co.in/maps`, `maps.google.com`, `maps.google.co.in`, `maps.app.goo.gl` and legacy `goo.gl/maps/` forms with their supported `www` forms. Deceptive suffix hosts and script URLs are rejected. These checks never fetch the supplied URL and do not claim account ownership or external availability.

Maximum lengths: phone input 50; email 254; each URL 500; address lines 200; city/state 100; postal code 24; legacy address 1,000; WhatsApp message 1,000; hours 2,000. Plain-text messages, address and hours retain Unicode/internal paragraphs, normalize CRLF and trim surrounding whitespace. Entered HTML is never interpreted.

WhatsApp derives its effective number from the current support phone while inheritance is on; it never persists an independent copied effective number. Separate-number edits are retained while switching back to support inheritance. Enabled WhatsApp requires a valid effective number. Links are `https://wa.me/{international-digits}` with an encoded optional message. No message is sent automatically; the visitor chooses whether to send it. Call/Email/Maps/Profile/WhatsApp test actions are real links enabled only for valid current input, require a click and never save. Tests inspect links without launching external apps.

## Source, security and concurrency

`contact:get` and `contact:save` reuse `/api/catalog`. Both require the existing literal admin claim AND enabled `adminAccess/{uid}`; writes recheck the enabled record in the transaction. Reads never initialize documents. The first explicit save may initialize the normal shared content document.

The server validates an allowlisted contact payload and updates only those fields plus the shared revision and trusted contact/general update metadata. Policies, banners, text sections and their metadata, assignments, operational returns/shipping and private/unrelated fields remain intact. `contactMeta` stores a server timestamp, actor, operation ID and normalized-content hash. Exact same-actor retries are idempotent; stale revisions and changed operations fail. The editor keeps inputs after errors, shows the latest saved contact version for explicit conflict review, and prevents duplicate submissions. Cancel and actual navigation confirm dirty discard; focus/visibility changes do not replace inputs. Unmount aborts private requests.

The admin response exposes only contact form fields, revision and a timestamp with its contact-specific/shared-document scope. Public responses omit private metadata, actor, revisions, phone-country controls, hidden structured address data and unused separate WhatsApp numbers. Hidden address/maps/hours and disabled WhatsApp values are empty rendering fields. Invalid legacy public values fail closed rather than producing unsafe/dead links. Existing Firestore rules deny direct client reads/writes of private shared settings.

## Rendering and previews

`ContactChannels` and `FooterContactBlock` are shared by the real storefront and protected unsaved preview. The existing Contact page header, FAQ, navigation, footer branding and public styling remain in place. Product and legacy order WhatsApp enquiries use the same effective settings. Header/home location presentation now follows visible saved address. About Us editorial content and historical order addresses/timeline records are not rewritten.

Preview is labelled **Preview — unsaved changes.** It has desktop/mobile modes and mobile Edit/Preview tabs, respects toggles, renders text safely and never persists. Preview links are inert; explicit form test actions remain available. There is no public preview flag or endpoint, autosave, scheduling, draft/publish flow or fabricated Connected/Verified status. Footer brand/supporting copy remains owned by Website Content.

The floating WhatsApp button is above the existing mobile navigation and honors the safe area. To preserve essential actions it is omitted on About, Contact, product, bag, checkout, account and order screens; existing contextual links remain available where configured. On desktop it uses the storefront corner. Disabled or unconfigured WhatsApp produces no button or substituted number. This safe placement and the existing shell/source behavior take precedence over prototype claims about notifications, boutique location, receipt integration or live-sync status.

The established no-store content API refreshes on revisit/focus and within 15 seconds on an open storefront. Successful saves show **Contact information updated.** after server confirmation. A failed refresh clears public contact values to avoid keeping newly hidden/disabled details visible. No extra CDN, scheduler, API key or serverless function is required.

## Verification and release

Focused checks: `src/contact/model.test.tsx`, `scripts/contact-emulator.test.ts`, and `scripts/contact-browser.test.py` with loopback-only fixture tooling; integrated into the existing admin test harness. Coverage includes phone/URL/link validation, inherited versus separate WhatsApp, message encoding, visibility retention/public omission, all public consumers, safe rendering, private preview, exact retry, concurrency, dirty-state preservation and shared-document isolation. Website Content/Banners regressions and packaged API-runtime checks remain relevant. Mutation tests use only emulator fixtures; external apps are not launched.

No new dependency, rule/index publication, production migration or external API setup is required. Owner application deployment and hosted acceptance remain necessary: verify real saved values, public refresh, visibility, actual device layout and explicitly clicked external links using existing authorized sessions. Local/emulator/build evidence is not hosted acceptance.

Nothing is committed, pushed, deployed, published or changed in production by this implementation.
