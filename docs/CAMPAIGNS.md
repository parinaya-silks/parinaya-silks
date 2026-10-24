# Marketing / Sale Campaigns

Campaign management uses `/admin/marketing`, `/admin/marketing/new` and `/admin/marketing/edit/{id}`. Coupons and homepage Banners retain their separate routes and controls. The compact admin shell, local Lora font, 192px sidebar, approximately 58px desktop header and maroon/ivory theme are retained.

## Source of truth and limits

New trusted records are `campaigns/{32-character-id}`, `campaignSlugs/{permanent-slug}` and `campaignMedia/{media-id}`. Writes go through the established `/api/catalog` function. No product, inventory, category, coupon or order record is rewritten by campaign management. No migration or production seed is needed.

Campaign fields: name (100), optional description (2,000), immutable slug (80), purpose-bound desktop/mobile banner references and focal points, optional CTA label (50), active membership mode, product IDs, category IDs, nullable start/end instants, display order (0–9999), stored intent, schemaVersion 1, revision, trusted creation/update actor and server timestamps. Upload metadata and last-operation receipts remain private.

The administrator directory is bounded to 200 campaigns, sorted/filterable across its complete result, with five displayed per UI page. Exceeding the read bound fails explicitly. Product-picker catalogue reads retain the existing 201-page / 10,000-product bound; failure prevents presenting partial picker data. Manual membership supports at most 100 stable product IDs, preserving selected order and hidden/missing references. Category membership supports up to 10 categories and 1,000 matching product documents in total; exceeding the limit fails instead of truncating. Query bounds include hidden/draft documents before eligibility filtering.

## Membership and pricing

Only the active membership mode applies. Switching modes requires confirmation and retains inactive selections for switching back; the modes are never accidentally combined. Picker category filters are search controls, not dynamic category rules. Selection persists across pages, with current-page Select All, Selected Only and explicit Add Selected Products. Manual rows can be removed/reordered by stable ID. Category mode dynamically includes future products and deduplicates them, newest creation first, then descending product ID.

Public eligibility uses the existing catalogue projection: Published product, enabled category and valid established product schema. Hidden, archived and missing manual selections stay recorded but are omitted publicly. Published out-of-stock products remain visible, matching the shop. Counts distinguish selected/matching, publicly eligible, hidden/missing and out-of-stock items. A failed count is shown as unavailable, not zero. Private preview resolves current products server-side; editor counts reflect its complete loaded catalogue snapshot.

Campaigns use current product selling/original prices. They introduce no price overrides, percentage discounts, coupon creation, reservations or stacking rules. Bag, Wishlist, shipping, coupon calculation, checkout and historical orders keep their existing authorities.

## Lifecycle and schedules

Stored intent: `draft`, `published`, `paused`, `ended`, `archived`. Display status precedence is Archived, explicit Ended, Draft, elapsed end → Ended, Paused, future start → Scheduled, otherwise Live. Starts are inclusive; ends are exclusive. Date entry/display use Asia/Kolkata and stored numeric instants. Immediate start/no end use null values.

Draft may publish or archive. Published/paused intent may move to draft, published, paused, ended or archived as applicable. Explicit ended intent may only stay ended or archive; archived intent is terminal. Metadata can be edited while retaining terminal intent. A campaign whose dates naturally elapsed can be rescheduled only through an explicit reviewed edit; an explicitly ended campaign cannot resume.

Editor saves keep current intent unless changed explicitly. Publication or visibility changes require review. Publish/resume require verified desktop artwork with alt text, a current/future valid schedule and at least one currently eligible product. Pause, End Now and Archive preserve prices, product records, stock and order history; they hide the public collection immediately on subsequent server reads. End Now stores terminal intent rather than rewriting the original schedule. No permanent deletion is provided.

Slug reservation and campaign save are atomic. Slugs/IDs remain stable on rename. Transactions enforce expected revision, field-preserving merge and both administrator checks at the established entry point/transaction seam. Exact last-operation retries return the saved record without creating duplicates; changed payloads or stale revisions conflict. Stale-edit recovery reloads revision/lifecycle/immutable slug while retaining other entered fields for review. Creation navigates to the canonical edit URL after a confirmed save.

## Artwork and private preview

Campaign uploads reuse signed Cloudinary transport and trusted REST metadata verification. Tickets bind purpose `campaign-banner`, campaign ID, device and uploader. Product/login/homepage assets cannot masquerade as campaign uploads. Daily upload limits remain shared with existing infrastructure. JPEG, PNG and WebP up to 10 MiB are supported. Recommended desktop: 1600×500; optional mobile: 800×800. Upload selection/progress/retry/verification, alt text, focal points, replacement and removal are provided. Uploads only prepare draft references; successful campaign Save applies them. Removing a reference never deletes the media asset.

Preview is an authenticated POST action behind both `admin: true` and enabled `adminAccess/{uid}` checks. It accepts the entered configuration and verified artwork, resolves current eligible products and returns an administrator-only Private Preview. It does not publish, alter prices, reserve stock or provide purchase actions. There is no unauthenticated preview query flag or preview URL. Invalid public flags are rejected.

Dirty editor state survives focus changes and category subscription refreshes. Navigation/close asks before discarding actual edits. New dialogs trap/restore focus and lock scrolling. Mobile save actions reserve bottom space and account for safe areas. Unmount/sign-out aborts requests and clears private component state.

## Public routes and homepage integration

`/sale` lists live campaign collections and retains the existing genuine product-price offers below. `/sale/{slug}` uses the existing storefront shell, ShopView product cards, filters, wishlist/bag behavior and pagination. Category filters remain scoped to the campaign. Campaign hero artwork uses responsive picture sources, intentional focal positioning, safe fallback and preserved layout space. Optional CTA scrolls to the product grid.

Public API actions use the same server-side lifecycle and schedule check for list, direct lookup and every product page. Responses contain only public campaign presentation fields and existing public product projections. Non-live direct links return unavailable without private data. No browser clock, scheduler, cron or administrator visit is required to activate or end campaigns.

The existing function response remains `private, no-store, max-age=0`. Public campaign views revalidate on focus, every 15 seconds and at the known end boundary. Existing product-grid polling remains 30 seconds; failed reads clear product results rather than retaining stale successful cards. An already open page may take up to its next revalidation to notice an external lifecycle change; a new API request always checks current state.

Homepage banners accept `/sale/{slug}` through the existing CTA field; canonical `https://parinayasilks.vercel.app/sale/{slug}` destinations are also recognized for live-target validation. Enabled homepage campaign targets must be live when saved. Public homepage projection suppresses campaign-linked banners after the campaign pauses/ends, without modifying their saved artwork/settings. Other external destinations retain existing behavior. Prefer internal campaign paths for deployment-independent links. The homepage's existing content refresh interval remains unchanged. No homepage banner is created automatically.

## Verification and release dependencies

- Typecheck, unit tests and production build.
- Campaign API/emulator suite: authorization, purpose/device/record media binding, slug uniqueness and races, safe creation retries, revision conflicts, manual/category membership, ordering, dynamic inclusion, zero stock, list/direct schedule boundaries, public pagination, preview isolation, homepage destinations and unchanged product fingerprints.
- Relevant existing catalogue and business/CMS emulator suites.
- Browser suite: responsive list/editor, product picker, upload failure/verification retry, private preview, lost-response creation, stale-edit recovery, publication review, public collection, pause/resume, category mode and IST schedule. Screenshots/overflow checks cover 320, 390, 768, 1024, 1440 and 1920 pixels and short mobile save controls.
- Existing coupon/recovery browser expectations updated for the now-functional Marketing section and separate Coupons navigation.
- Packaged Vercel function runtime regression uses the locally installed pinned builder; this is packaging evidence, not hosted acceptance.

Queries require only existing automatic indexes: campaigns by document name; campaigns by `intent == published`; products by one `categoryId == id` at a time. Slugs and assets use direct document reads. **No new composite-index definitions, Firebase rule changes, dependencies or serverless functions are required.** Existing repository rules deny direct access to new campaign collections by default; all reads/writes flow through the trusted API. Deployed rule/index metadata was not inspected or changed during this local task.

Release requires owner application deployment and hosted acceptance of `/admin/marketing`, `/sale`, direct campaign links, signed uploads and banner destinations. No production campaigns, media or business records were created. No rules/indexes were published. Nothing was committed, pushed or deployed.

Necessary design adaptations: retained the approved compact shared shell and navigation instead of prototype phone frames/bottom bars; removed sample campaigns, fictional curator claims, deployment assertions and automatic-discount copy. Readiness reports configuration checks, never deployment. Featured-on-offers configuration was not in the supplied editor and is omitted; live campaigns are listed by display order. Publication has a review dialog; limits are explicit and failures never become partial success.
