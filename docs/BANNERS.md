# Homepage banners

`/admin/banners` manages the existing `siteSettings/storeContent.banners` array (maximum six). The existing `homeBannerMedia` registry, signed Cloudinary upload and trusted metadata verifier remain authoritative. No second banner source, migration, dependency, function, composite index or rule publication is introduced.

## Saving and identity

Banner IDs are stable 32-character references, never array offsets. Array order is shared across desktop and mobile. Dragging or Move Up/Down changes only a local pending order. Save Order requires confirmation; Cancel Order restores the saved sequence. Search/status filters do not change the underlying order; drag is disabled while filtered.

`banners:get`, `banners:save` and `banners:preview` reuse `/api/catalog`. All require the administrator claim AND enabled `adminAccess/{uid}` record. Writes recheck the record inside the Firestore transaction. `banners:save` merges banner fields and revision metadata only; contact details, policies, featured sections, returns configuration and unknown unrelated fields are preserved. A shared revision rejects concurrent website/banner writes. The operation ID/hash/actor make identical uncertain-response retries safe; stale retries cannot create another banner. Conflicts keep the editor intact: copy/review edits, then explicitly discard and reload the current saved list before reapplying them.

Website/contact saves preserve unchanged saved banners, including their schedule. They do not require an already-saved campaign destination to remain live just to save unrelated website content. There is no destructive media operation: Remove deletes the banner reference only; replaced/removed Cloudinary media remains stored.

## Compatibility, images and schedule

Legacy `{id,title,link,enabled,images}` entries remain valid: continuous schedule, title overlay, Explore label for a saved link. New optional fields are `name` (private internal reference), `supportingText`, `showButton`, `buttonLabel`, `placement`, `startsAt`, `endsAt`. Optional overlay text can be blank. Show Button off suppresses the public link/button and hides its editor controls while retaining the saved selection.

The existing 768px breakpoint, desktop 8:3 and mobile square crop are retained. Recommended artwork is 1920 × 720 desktop and 900 × 900 mobile; the Stitch export inconsistently labels 1600 × 600 as 16:9 and suggests a different mobile crop. Preserving the actual storefront proportions takes precedence. Focal values are persisted integer percentages. Mobile uses its own picture source, falling back to desktop when absent; a failed image retains layout space and usable text/button. Verified JPEG/PNG/WebP limit is 10 MiB, using existing purpose/device/uploader-bound tickets; client URLs are never verification evidence. Selecting/uploading media does not publish changes.

Schedule entry/display is Asia/Kolkata; storage uses UTC epoch milliseconds. Disabled takes precedence; otherwise end is exclusive, start inclusive, yielding Ended/Scheduled/Live. Trusted server time determines public eligibility. Public data includes only eligible rendering fields, never internal names, operation metadata, media IDs or disabled/future settings.

The existing public content API remains `private, no-store`. Open pages revalidate within 15 seconds, at a known schedule boundary, and on window focus; refresh/revisit fetches the saved result immediately. Requests are sequenced so older responses cannot overwrite newer ones. A failed refresh clears banner data rather than retaining potentially expired promotions. No administrator visit or scheduler activates/ends a banner.

## Destinations and homepage

Searchable Campaign/Category/Product choices derive links from stable records and actual routes: `/sale/{slug}`, `/collections/{slug}`, `/product/{slug}`, `/shop`. Valid existing HTTPS destinations remain compatible; new structured choices use internal routes. Campaign links must be published and the entire enabled banner window must fall inside the campaign window. Future campaigns require a corresponding future banner start; a finite campaign end requires a banner end no later than it. The editor never publishes/pauses a campaign. Category targets must be enabled; product targets must be Published within an enabled category. Broken/ambiguous internal targets fail validation. Existing banner entries expose an admin suppression reason when targets become unavailable.

Public reads recheck destinations. Paused/ended campaigns and hidden/missing products/categories suppress the banner; shoppers are not redirected to a broken collection. A banner without a button is not linked to its retained target. Legacy external HTTPS targets are syntax-validated; external availability cannot be guaranteed by the store.

Eligible banners appear in saved order in the homepage carousel. Zero leaves the existing neutral homepage fallback; one has no redundant navigation; multiple have five-second autoplay, previous/next, direct slide selection and Pause/Play. Autoplay pauses on hover, focus, hidden tabs and reduced-motion preference. Preview is administrator-only and non-navigating: inline edits and private responsive preview are clearly labelled unpublished. Saved Homepage Preview includes currently Live, destination-eligible saved entries.

## Validation and release

New focused checks: `src/content/model.test.ts`, `scripts/banners-emulator.test.ts`, `scripts/banners-browser.test.py` with loopback-only `scripts/banners-fixture-control.ts`. They are integrated into the existing `test:admin` harness. Emulator fixtures/media are not production data.

Local validation covers shared-field preservation, concurrent revisions, idempotent retry, order, legacy input, trusted media/purpose, destination eligibility, exact schedule boundaries, public projection, direct-rule denial, upload recovery, private preview, search/empty/error/retry, saved IST values, responsive editor/list and zero/one/multiple homepage banners. Campaign and business regressions remain applicable. Runtime packaging is separate from the frontend build.

Release requires the owner's normal application commit/push/deployment and hosted acceptance using existing authorized sessions: real signed uploads, saved homepage refresh, responsive artwork, destination visibility and schedules. No production state was inspected or changed during implementation; local/emulator results do not establish hosted acceptance. No new Firebase rules/index deployment is required by these query shapes.
