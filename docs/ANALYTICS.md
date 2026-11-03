# GA4 storefront page views — local release handoff

Measurement ID: `G-R785L2F0K0`. Approved site: `https://www.parinayasarees.com`, also allowing `https://parinayasarees.com`. Currency: INR.

This implements the initial connection and page views only. It does not implement ecommerce events or establish that data has arrived in the actual GA4 property. No account/property settings, production environment, application deployment or production business records were changed during implementation.

## Required owner release steps

1. In the GA4 property, confirm the web stream belongs to this website and has the measurement ID above. Set the property's reporting currency to **Indian Rupee (INR)** if it is not already INR; the tag also sets `currency: 'INR'`.
2. **Before release, turn Enhanced Measurement OFF for this web stream** under Admin → Data streams → web stream. This release uses manual page views only. Turning it off also disables automatic browser-history page views, scroll, outbound clicks, site-search terms, video, file downloads and form interactions. In particular, do not enable automatic search/form tracking: search text, form names/destinations and submit text can disclose customer information. Do not install another Google tag, GTM container or Firebase Analytics integration for the same stream. Google Signals, user-provided data collection and advertising personalization must remain off; this work does not configure Ads integrations.
3. In Vercel → project → Settings → Environment Variables, set **Production** only:

   ```text
   VITE_GA_MEASUREMENT_ID=G-R785L2F0K0
   ```

   This is a public measurement ID, not a credential. No Firebase or server credential change is required. Keep Vercel's **Automatically expose System Environment Variables** enabled so the build receives `VERCEL_ENV=production`. `vite.config.ts` derives the internal `VITE_DEPLOYMENT_ENV` value from that system variable; do not manually create it. Missing or preview/local values disable analytics. Environment changes require a new build/deployment.
4. Review the local changes and follow the existing owner-controlled commit/push/Vercel release workflow. Nothing was committed, pushed or deployed by this implementation. Do not enable another tag through a dashboard installer.
5. Perform the live acceptance checks below after deployment. Property settings and actual incoming data remain unverified until these checks succeed.

Google's [manual page-view guide](https://developers.google.com/analytics/devguides/collection/ga4/views) describes `send_page_view: false` and the automatic-history setting. The [Enhanced Measurement reference](https://support.google.com/analytics/answer/9216061?hl=en) documents the automatic interactions disabled here.

## Consent, eligibility and privacy

- There was no active Google tag/GTM/Firebase Analytics implementation or existing saved analytics preference. The earlier SEO analytics placeholder is replaced by one shared adapter; Firebase initialization remains unchanged.
- The owner selected **explicit opt-in**. A small nonmodal control offers Allow analytics / No thanks. Unknown or declined consent loads no Google script and sends no analytics requests, including cookieless pings. The footer's Analytics preferences button allows a later change. Browser Do Not Track and Global Privacy Control keep collection off even with a saved grant.
- Only a production build marked `VERCEL_ENV=production`, HTTPS and an exact approved hostname is eligible. Localhost, Vercel preview builds/hosts, automated browsers (`navigator.webdriver`), test modes, unknown routes and Admin paths (including legacy hash navigation) are excluded. Admin navigation disables the existing tag immediately. A test deliberately simulates a normal visitor to exercise the production branch without contacting Google.
- Preference storage is `parinaya:analytics-consent:v1` in localStorage, containing only `granted` or `denied`. Storage failures fall back to the current tab's memory. Cross-tab changes are observed. Withdrawal disables collection and expires this integration's `_ga` / `_ga_R785L2F0K0` cookies; it does not touch authentication, Bag or checkout storage. A blocked Google script fails closed until reload and never blocks business actions.
- Outgoing page-view dimensions are a sanitized page location, title and previous eligible sanitized page location as referrer, plus the destination measurement ID. Every query string and fragment is removed, including search, return destinations and campaign parameters. Private order identifiers are collapsed to route names; account/checkout/order titles are fixed. Public catalog slugs are validated. Raw referrers, user IDs, names, emails, phone numbers, addresses, tokens, form contents and customer properties are never supplied by this adapter. The loader uses origin-only referrers. Google still receives normal network metadata when a consenting visitor loads its tag; this is not an anonymous measurement system.
- The unsanitized route is used transiently inside the deduplication controller to distinguish navigation, including query-only navigation. It is not transmitted, logged or persisted by analytics. No past activity is replayed when consent is granted.

This is a basic consent implementation: see Google's [consent-mode concepts](https://developers.google.com/tag-platform/security/concepts/consent-mode). Advertising storage, advertising user data and personalization remain denied. `allow_google_signals` and `allow_ad_personalization_signals` are false.

## Navigation strategy and measured scope

`Seo` commits a manual `page_view` after updating the page title. Product pages wait for the public product title or a loading failure. The shared controller configures the tag once with `send_page_view: false`; repeated effects, rerenders and React Strict Mode do not create another visit. Back/forward and subsequent eligible route/query navigations each create one view. Private route titles and locations stay generic. The actual document title/canonical behavior is otherwise retained.

With Enhanced Measurement off, this application explicitly sends **page_view only**. GA4 can additionally generate its basic lifecycle events such as `first_visit`, `session_start` and `user_engagement` after opt-in. No custom click, form or sales event is implemented. Google library behavior and the property's settings must be checked live; intercepted local tests cannot validate Google's processing.

Ecommerce events still require separate implementation: `view_item_list`, `select_item`, `view_item`, `add_to_wishlist`, `add_to_cart`, `remove_from_cart`, `view_cart`, `begin_checkout`, `add_shipping_info`, `add_payment_info`, `purchase` and `refund`. Purchase/refund measurement needs a trusted, deduplicated business event; an order page, callback or successful navigation must never stand in for payment confirmation.

## Local checks and live acceptance

Local commands:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run test:analytics
```

`test:analytics` builds isolated production and preview bundles, then runs Playwright with every network request intercepted. The Google script and collection endpoint are mocked; no fixture data goes to GA4 or live Firebase. It checks opt-in, single initial/subsequent/back/product views, query stripping, form privacy, real development React Strict Mode, consent withdrawal with blocked storage, exclusions, blocked-script navigation and responsive consent at 320/390/1440px. Artifacts are ignored under `.cache/ga4`. Existing checkout, Wishlist/Bag and social-drawer browser suites were also run against loopback emulators with synthetic fixtures; Apply/Remove Points and shopping behavior passed.

After release, use a normal browser with privacy extensions temporarily disabled **on the testing device only**:

1. On each approved host, clear only the analytics preference/cookies or use a fresh browser profile. Before opt-in, verify no `gtag/js` or GA collection requests. Decline and confirm navigation, sign-in, Bag and checkout remain usable. Do not place a real order for this check.
2. Allow analytics. In [Google Tag Assistant](https://tagassistant.google.com/), connect the production URL and confirm one configuration and one initial `page_view`. Navigate Shop → a product → Bag → Back and confirm one view per navigation, correct titles and sanitized locations/referrers. Admin must have no collection. Check query-only navigation and refresh separately. No token/header/customer data should be copied into a report.
3. Inspect Network collection payloads: no query/hash, customer names, contact details, form values or order IDs in locations, titles or referrers. Check all events, including automatically generated lifecycle events. Confirm Enhanced Measurement is off. Use fixture-free browsing; do not enter real personal information just to test analytics.
4. Tag Assistant / the Google Analytics Debugger can enable debug mode for your own device. Open GA4 **DebugView** and confirm that device's expected events; do not turn on global `debug_mode` in production. Follow the [DebugView guide](https://support.google.com/analytics/answer/7201382?hl=en).
5. Open GA4 **Realtime** and confirm incoming activity from the opted-in test device. Ordinary reports may take longer. Record the deployment tested and property evidence; until then, actual property delivery is **not confirmed**.
6. Withdraw consent through the footer; inspect that further navigation sends no events and GA cookies are expired. Check an Admin route, blocked scripts, a Vercel preview and localhost separately. Do not manufacture production customers, orders or payments.

Main changes: `src/analytics/*`, shared `Seo`, the product SEO path handoff, App consent mount, both existing footers, `vite.config.ts` and the focused unit/browser test commands. No new dependency, backend endpoint, security rule or Firebase Analytics SDK was added.
