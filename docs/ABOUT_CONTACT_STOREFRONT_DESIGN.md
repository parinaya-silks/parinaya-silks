# About Us and Contact Us storefront design

## Implementation and sources

`/about` and `/contact` keep the existing storefront shell, local Lora, logo, header, footer and five-tab mobile navigation. Neither route activates Account. New presentation styles are scoped under `.editorial-page`, `.about-storefront` and `.contact-storefront`. Admin editors retain their existing presentation and services; `AboutCopy` gains an opt-in founder-only mode whose default output is unchanged.

About uses a desktop editorial introduction beside a framed saree image, optional narrative cards, the enabled founder section and Shop/Contact actions. On mobile, the introduction precedes a bounded 4:3 image and stacked cards. The supplied design's saree photograph is packaged as `public/assets/about-saree-editorial.jpg` (512 x 382, approximately 53 KB). It is decorative editorial imagery, explicitly captioned Editorial inspiration, not a product, business premises or founder photograph. Its failure removes the figure and balances the text layout. No production asset upload or new image service is involved.

Contact uses a compact information column beside the form on desktop. Mobile puts the introduction and enquiry form first, followed by small quick-action cards, optional order-reference WhatsApp interaction and the remaining location/social details. Long addresses and emails wrap. Saved contact methods collapse when absent. Floating WhatsApp is suppressed on these two routes, avoiding duplicate controls covering forms or footer links; other routes retain the previous behavior.

## CMS and design mapping

The existing public `/api/catalog?content=store` projection remains authoritative. No CMS writes or schema changes are introduced.

| Source | Presentation |
| --- | --- |
| `siteSettings/storeContent.about.heading` | About page h1 |
| `about.intro` | Lead introduction, omitted when empty |
| `about.storyHeading`, `about.story` | Store narrative, preserving plain text, Unicode and paragraph breaks |
| Existing story lines `Our Collection` and `Your Shopping Experience` | Separate narrative cards only when those exact legacy headings occur; arbitrary saved stories remain one intact section |
| `about.showFounder` and founder fields | Existing public projection returns founder or null; public renderer never reads private retained fields |
| `about.photo` | Only publicly enabled, validated Cloudinary URL/dimensions/alt/focal point; broken optional photo collapses |
| `/shop`, `/contact` | Existing internal routes |
| `siteSettings/storeContent.contact` | Existing `PublicContact` projection: phone/email/WhatsApp quick actions, visible address, Maps, hours and social links |

There are no separate collection, atelier, certification or shopping-experience arrays in the current About schema. The page does not infer unsupported sections, split arbitrary sentences into cards or rewrite saved content. Short text and hidden founder states have no empty containers. Valid compatibility copy remains available only after a successful content load establishes that no saved About record exists.

Contact retains normalized E.164 phone links, validated/encoded email, supported HTTPS Maps/social links, and encoded WhatsApp text. The optional order reference is local input appended to the saved WhatsApp message only. It is neither submitted in enquiries nor treated as proof of order ownership. External apps open only on deliberate anchor activation. Only the actual saved address is shown, including a short Hyderabad-only address. No location, hours, map coordinates or response deadline are invented.

## Loading and enquiry states

The shared content provider now reports whether any successful public snapshot has loaded. Initial errors display Retry instead of fallback content disguised as a successful response. About and Contact present their own error copy; the enquiry form remains usable when content loading fails. A failed refresh preserves previously loaded public About/contact data, while the pre-existing banner failure policy remains unchanged. Refreshes occur on focus and at the existing maximum 15-second interval. A refresh or revisit reads saved CMS updates without an application deployment.

`ContactForm` retains the existing public `enquiries:submit` field contract, honeypot and operation identity. Client and server share validation: name 160, email 254, optional phone 50 and country (default IN/+91), message 2000. The server preserves its five-per-email/hour and 200-global/hour transaction limits, private enquiry/receipt records and both custom-claim/enabled-record checks for enquiry administration. No backend or rule changes are made.

A synchronous lock and disabled fieldset prevent duplicate taps. Entered values persist through failures and rate limiting. Uncertain acknowledgements retry the same normalized payload and operation ID; a changed submission receives a new identity under the existing contract. Only a successful `{received:true}` acknowledgement clears input and shows the persistent inline Your message has been received panel. Send Another Message restores the blank form and focuses Full Name. No email, WhatsApp or automated response is promised or sent. Requests abort on unmount and sequence guards ignore stale replies. Reduced motion disables the sending spinner animation.

## Necessary differences from Stitch

The existing shared maroon shell and footer replace the prototype navigation/footer. Local Lora replaces prototype font combinations. The real CMS's supported fields determine section coverage. Prototype owner identities, counters, certification/assay claims, showroom/workshop ownership, private video services, response SLAs, international insurance, weaving schedules, inquiry-category selector and simulator bars are omitted. The form retains the actual 2000-character limit rather than the mobile prototype's 400. The provided decorative photo is not labelled as actual Parinaya premises. Touch targets are at least 44px for standalone controls, with input text 16px on mobile.

## Validation and release boundary

Typecheck, all 149 unit tests, production build and whitespace checks passed. The existing large JavaScript chunk advisory remains. Three exported-handler emulator suites passed: About, Contact and Enquiries. The existing About Admin/public, Contact Admin/public and Enquiries browser suites passed. The new editorial browser suite passed on the final CSS at 320, 390, 768, 1440 and 1920px, covering hidden founder/contact data, safe links, legacy and short content, broken images, initial failures/Retry, retained refresh state, mobile keyboard-sized viewport and submission states. Tests use loopback Auth/Firestore emulators and synthetic contacts only; no external apps are launched. Existing About/Contact Admin browser regressions exercise real save/public projection, visibility, dirty/conflict/retry handling and trusted image verification. Existing Enquiries tests exercise real anonymous submission through private Admin read/detail/status/delete and uncertain response replay.

Release requires the owner's normal frontend application release, including the packaged decorative asset. There are no new environment variables, dependencies, server endpoints, rules, indexes or migrations. Existing enquiry-service deployment requirements remain unchanged (see `ENQUIRIES.md`). Local evidence does not verify hosted production data, index readiness or customer acceptance. No commit, push, deployment, rules/index publication, production upload or production record change is performed.


## Local screenshots and comparisons

Artifacts are ignored under `.cache/editorial-design/`:

- `about-{320,390,768,1440,1920}.png`
- `contact-{320,390,768,1440,1920}.png`
- `stitch-{about,contact}-{390,1440}.png`
- `comparison-{about,contact}-{390,1440}.html` and `.png`

The four original exports were rendered at matching 390px and 1440px CSS widths with their styles loaded and prototype simulator bars removed. All four comparisons were visually inspected. Mobile About was adjusted to place the photo directly after the introduction, then the store narrative; form header whitespace was tightened. Shorter pages reflect supported saved content, not omitted live business information. Shared shell and Lora differences are deliberate. A live deployed acceptance check remains for the owner after releasing the frontend.

Reproduction uses the repository emulator runner pattern with `scripts/editorial-fixture.ts` and `scripts/editorial-browser.test.py`. Both explicitly require loopback Auth 9099/Firestore 8080; fixture mutations target only synthetic emulator data. Existing API suites are run sequentially because each clears its isolated emulator data. Browser fixtures start on fresh emulator state to avoid unrelated API-fixture enquiry counts. Local servers and emulators were stopped after completion.
