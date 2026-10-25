# About Us

Local implementation: `/admin/about` edits the existing stable public `/about` route. Lora, maroon/ivory, the 192px sidebar and approximately 58px header remain unchanged. Desktop has editing cards and a private preview; mobile has keyboard-accessible Edit Story/Live Preview tabs and a fixed Save/Cancel bar with reserved space and safe-area padding. The preview shares `AboutCopy` with the public page. It is labelled “Preview — unsaved changes.” No preview endpoint or persistence is used.

## Source and mapping

`siteSettings/storeContent.about` is a minimal addition to the existing authoritative shared content document. Inspection found no existing About Us record or owner/founder photo setting: the old admin route was unavailable and the public page was hardcoded. `siteSettings/loginAppearance` contains customer authentication images and is intentionally independent.

| Editor | Stored field | Public rendering |
| --- | --- | --- |
| Page Heading | `heading` | Main h1, stable URL |
| Short Introduction | `intro` | Optional introduction |
| Story Heading | `storyHeading` | Optional h2 |
| Brand Story | `story` | Plain text with paragraph breaks |
| Show founder introduction | `showFounder` | Founder object or null |
| Name, Role, Introduction | `founderName`, `founderRole`, `founderBio` | Founder text only when shown |
| Photo, alt, crop | `photo` | Verified URL, dimensions, alt and focal coordinates |

Limits: heading100, introduction1500, story-heading150, story12000, founder-name160, role200, bio3000, alt200 characters. Heading and story are required. An enabled founder needs a name; the other founder fields and photograph are optional. Unicode and paragraphs remain plain text and are escaped by React. Visibility-off retains private settings but removes the whole founder from public projection and preview.

`about:get` never initializes a document. Before the first explicit save, the editor identifies the previous public copy as **Compatibility fallback — not saved**. No screenshot founder names, dates, certifications or business claims are seeded. The previous generic saree photograph remains only in the unsaved public compatibility page; a saved About page uses the optional verified founder portrait. The public title can change without changing `/about`.

`about:save` accepts only the full allowed About fields, `expectedRevision`, and `operationId`. It updates individual `about.*` fields and shared revision/timestamp/actor plus `aboutMeta`. Unknown About fields and unrelated contact/policy/banner/homepage/footer/operational data remain intact. Both token `admin:true` and enabled `adminAccess/{uid}` are required; access is rechecked in the transaction. Same actor/operation/hash retry is idempotent. Shared revision conflicts retain entered values and require review of the latest saved revision. Server-confirmed success is “About Us updated.”

Cancel uses the existing accessible dialog infrastructure with focus containment/restoration and Escape/Keep Editing. Actual admin navigation and unload follow the existing unsaved-change guard. Browser focus/visibility refresh never replaces editor input. Requests abort on unmount. Save is disabled during pending/failed uploads and concurrent submissions. No draft/publish/autosave behavior was added.

## Photo ownership and verification

The existing `loginAppearanceService` signed Cloudinary media flow now supports the isolated `about` media scope, used only for signing and verifying founder portraits. `about:sign` and `about:verify` accept `device:desktop` only, use `aboutFounderMedia/{mediaId}`, purpose `about-founder`, and immutable public IDs `parinaya-silks/about/desktop/{mediaId}`. They reuse existing daily limits, signed uploads, trusted Cloudinary REST metadata verification, JPEG/PNG/WebP checks, 10MiB limit and nonanimated image/dimension checks. Browser-supplied URLs are rejected.

Save requires a verified founder-purpose desktop media record owned by the acting administrator; another administrator can retain/edit the currently saved portrait reference but cannot select an unrelated administrator's unsaved upload. Product, login and banner media checks remain unchanged. No source reuses a login portrait as a founder identity. Photo controls support selection preview, progress, verification retry, replacement, removal, alt text and crop focus. Selection/upload alone does not update public settings. Cancelling clears temporary URLs/requests. No Cloudinary asset is deleted.

Public portrait crop is 4:5, with object-fit cover and focal coordinates. Recommended 600×750 or square artwork is guidance, not a new minimum upload constraint. Missing/failed portraits omit the image and preserve readable text. Unsaved blob previews are permitted only through the local private renderer prop. Public responses remove media IDs, hidden founder fields, private metadata and actors.

## Refresh and release

The existing public content flow (`content:public`) reads About from the same document snapshot and projects rendering fields. Existing no-store polling and focus refresh apply (up to 15 seconds for already-open public pages). Revisiting/refreshing fetches current settings. Failed loads retain the last successfully loaded text and show an explicit refresh error/Retry on `/about`; authentication and unrelated flows stay usable.

No dependency, serverless function, index, rule publication or migration is required. Existing deny-by-default rules protect the new media registry and shared source. Reuse the current Cloudinary credentials/preset. The owner must release application code normally, then check real authenticated uploads, saved content, storefront refresh and desktop/mobile devices. No production media, settings or users were accessed or changed during local verification.

## Checks

`src/about/model.test.tsx`: validation, fallback, plain Unicode/HTML escaping, hidden-founder projection and image input safety. `scripts/about-emulator.test.ts`: exported handler authentication, both admin requirements, actual save/read/public mapping, scoped preservation, first-save initialization, media failure/retry/ownership/purpose, idempotency, conflicts/races, visibility, removal and direct-client denials. `scripts/about-browser.test.py`: loopback API/Auth/Firestore with fixture Cloudinary; private unsaved renderer, upload failure/retry, actual public page, saved photo/alt/crop, visibility/removal, retries/conflicts/discard and widths 320–1920. Integrated into the existing admin harness; focused checks can be run without rerunning unrelated suites.
