# Mobile social navigation

The old mobile social CSS changed the fixed widget into a relative element with margins beneath the header. Expanding it added page height. The widget is now hidden through the header's existing 1100px navigation breakpoint. Valid public Instagram/Facebook links share the existing renderer inside the navigation drawer, after the main navigation. Empty or invalid links omit the section. The current settings schema uses an empty saved social URL as its off state; no new visibility field was introduced.

The drawer retains scrolling, focus trapping, Escape, close-button and backdrop dismissal. Focus restoration avoids page scrolling, and existing scrollbar space is preserved during the body scroll lock. Desktop floating placement and WhatsApp behavior remain unchanged. Banner markup, image proportions, crop, timing and controls were not edited.

## Local verification

- `npm.cmd test`: 166 passing tests.
- `npm.cmd run lint`: TypeScript passed.
- `npm.cmd run build`: production build passed, with the existing chunk-size advisory.
- Focused browser suites: `social-drawer`, `banner-timing`, `client-changes`, through the guarded Auth/Firestore emulator harness. Social drawer is also included in the default client-change browser run.

To repeat the focused browser run in PowerShell:

```powershell
$env:PARINAYA_CLIENT_BROWSER_ONLY='1'
$env:PARINAYA_CLIENT_FILES='social-drawer,banner-timing,client-changes'
npm.cmd run test:client-changes
```

Checks cover 320, 390, 430, 768, 1024 and 1440px; banner/header adjacency and unchanged sizing/crop/timing; slide selection and DOM stability during drawer use; safe labelled external links with 44px minimum targets; missing/invalid/empty settings; keyboard focus and dismissal; short-screen drawer scrolling; and desktop fixed placement. Existing banner timing regressions cover autoplay, manual intervals, pause and cleanup. No external social destinations were opened or production records changed.

Screenshots use synthetic local settings and a bundled image fixture, not production CMS artwork:

- [Before mobile, expanded row](../.cache/social-drawer/before-expanded-390.png)
- [After mobile homepage](../.cache/social-drawer/after-home-390.png)
- [After mobile drawer](../.cache/social-drawer/after-drawer-390.png)
- [Short-screen drawer](../.cache/social-drawer/after-drawer-short-320.png)
- [Desktop regression](../.cache/social-drawer/after-home-1440.png)

Other requested widths use the same screenshot filename stems. Captures are in ignored `.cache`; a pre-change capture is optional for repeat runs. No dependencies, settings migration, security-rule publication or server changes are needed. Application deployment and hosted acceptance remain outstanding; no commit, push or deployment was performed.
