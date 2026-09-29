# TourGuideAI — Salvage Inventory (pre-restart recon)

**Subject:** `D:\All-Downloads\TourGuideAI` — v1.0.0-RC1, branch `feat-cursor-backend`, HEAD `5bf20fd` (2025-06-09 22:09:02 +0800, "Fix: fix github ci/cd build and test error"), working tree clean.
**Target:** reuse as the foundation of a **2.5D overseas-travel simulation game**.
**Method:** every claim below was verified by reading files, running commands, or inspecting `node_modules` directly. `node_modules/` contents were inspected but never treated as source. Doc claims (`README.md`, `ARCHITECTURE.md`, `API_OVERVIEW.md`) are treated as unverified assertions and are contradicted explicitly where the code disagrees.
**Nothing in this report fixes, refactors, or changes the codebase.** The only file written is this one.

Legend: **[VERIFIED]** = reproduced by command or read from file. **[UNVERIFIED]** = could not be reproduced in this environment; stated as a limitation.

---

## A. Build & toolchain reality

### A.0 Environment (raw)

```
PS D:\All-Downloads\TourGuideAI> node -v; npm -v
v26.8.2
12.0.2
```

`react` 18.3.1, `react-dom` 18.3.1, `react-scripts` 5.0.1, `webpack` 5.98.0, `openai` 4.87.3, `axios` 1.8.3, `@mui/material` 5.16.14, `@emotion/react` 11.14.0, `@emotion/styled` 11.14.0 — all read from their `node_modules/*/package.json`.

### A.1 Answer: neither `npm run build` nor `npm start` works today

Both fail at the **same single missing module**.

**[VERIFIED] `npx react-scripts build`** (background job, exit code 1, full output):

```
Creating an optimized production build...
Browserslist: browsers data (caniuse-lite) is 19 months old. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme
Failed to compile.

Module not found: Error: Can't resolve '@mui/icons-material/Menu' in 'D:\All-Downloads\TourGuideAI\src\components\common'
```

It **fails in well under a minute** — no need to background it. It is not slow; it is dead on arrival.

**[VERIFIED] `npx react-scripts start`** with `BROWSER=none CI=true PORT=3999`:

```
Starting the development server...

Failed to compile.

Module not found: Error: Can't resolve '@mui/icons-material/Menu' in 'D:\All-Downloads\TourGuideAI\src\components\common'
```

**Root cause (single point of failure):**

| Evidence | Value |
|---|---|
| Import site | [Navbar.jsx:19](src/components/common/Navbar.jsx#L19) — `import MenuIcon from '@mui/icons-material/Menu';` |
| Declared in | [package.json:8](package.json#L8) — `"@mui/icons-material": "^5.14.5"` |
| Installed? | **NO.** `Test-Path node_modules\@mui\icons-material` → `False`. `node_modules\@mui\` contains only `core-downloads-tracker`, `material`, `private-theming`, `styled-engine`, `system`, `types`, `utils`. |
| `npm ls` line | `+-- UNMET DEPENDENCY @mui/icons-material@^5.14.5` |

`@mui/icons-material` is imported at **123 sites across 24 files**, but it is the **only** non-beta-program consumer of that package: [Navbar.jsx:19](src/components/common/Navbar.jsx#L19) is the sole import in the app shell. The other 122 sites are all under `src/features/beta-program/`. This is why the build dies on the app shell and not somewhere deep in the beta code.

### A.2 Which config wins: `react-scripts`, and `webpack.config.js` is dead config

**`react-scripts` governs. `webpack.config.js` is never read.** Evidence:

1. [package.json:40-43](package.json#L40-L43): `start`/`build`/`test`/`eject` are all `react-scripts *`. There is **no** `webpack` script anywhere in `package.json`.
2. No `react-app-rewired`, no `craco`, no `config-overrides.js`, no `paths.js` override — the three mechanisms by which CRA would consume a custom webpack config. Grep of the repo root confirms none exist.
3. CRA ignores a root `webpack.config.js` unless `npm run eject` has been run ([package.json:43](package.json#L43) defines `eject` but there is no `config/` or `scripts/` from a CRA eject — only the project's own `scripts/`).
4. Nothing invokes the `webpack` binary. `webpack-bundle-analyzer` ([package.json:137](package.json#L137)) is required only by [webpack.config.js:2](webpack.config.js#L2).
5. `webpack.config.js` would in fact **fail** if it were used: it defines no `entry`, no `output`, and no `HtmlWebpackPlugin`, so it could not produce a runnable app. [webpack.config.js:11](webpack.config.js#L11) adds `path.resolve(__dirname, 'src')` to `resolve.modules`, which would silently resolve `import 'components/X'` style specifiers that CRA does not support — a latent trap for anyone who assumes `src`-rooted imports work.

**Knock-on finding:** `npm run analyze` / `analyze:win` ([package.json:47-48](package.json#L47-L48)) set `ANALYZE=true` and then run `npm run build`, i.e. `react-scripts build`, which never reads [webpack.config.js:85-94](webpack.config.js#L85-L94). `npm run analyze` **silently does nothing** — no `bundle-report.html`, no `bundle-stats.json`.

### A.3 Node version compatibility

**Node 26.8.2 vs `react-scripts` 5.0.1 — the classic OpenSSL blocker does NOT apply here. [VERIFIED at the dependency level]**

The textbook failure is `error:0308010C:digital envelope routines::unsupported` (`ERR_OSSL_EVP_UNSUPPORTED`) because webpack's default `output.hashFunction` is `md4`, which Node ≥17 removed from the default OpenSSL 3 provider. In this tree:

- [node_modules/webpack/lib/config/defaults.js:1228](node_modules/webpack/lib/config/defaults.js#L1228) → `D(output, "hashFunction", futureDefaults ? "xxhash64" : "md4");` — so the default **is** `md4`.
- [node_modules/webpack/lib/util/createHash.js:170-179](node_modules/webpack/lib/util/createHash.js#L170-L179) → `case "md4": createMd4 = require("./hash/md4")`. The `native-md4` case (which calls `crypto.createHash("md4")`) is a **separate, non-default** branch.
- [node_modules/webpack/lib/util/hash/md4.js:8-20](node_modules/webpack/lib/util/hash/md4.js#L8-L20) → `const create = require("./wasm-hash"); const md4 = new WebAssembly.Module(Buffer.from("AGFzbQEAAAAB...", "base64"));` — webpack 5.98.0 ships md4 as an **embedded WebAssembly module**, not a Node `crypto` call. Node's OpenSSL provider is never consulted.

So Node 26 is *not* the blocker. **Caveat [UNVERIFIED]:** the run stopped at module resolution, before webpack's seal/hash phase, so I did not observe a successful hash stage end-to-end. The WASM-md4 evidence above is decisive about the *mechanism*, but a full `react-scripts build` on Node 26 remains unproven until A.1 is fixed.

### A.4 MUI v5 + `@emotion/styled` — not a blocker

`@mui/material` 5.16.14 + `@emotion/react` 11.14.0 + `@emotion/styled` 11.14.0 are installed and mutually compatible (MUI v5 peers `@emotion/react ^11.5.0` / `@emotion/styled ^11.3.0`). [src/index.js:5-31](src/index.js#L5-L31) wires `ThemeProvider`/`createTheme`/`CssBaseline` correctly, and [ARCHITECTURE.md:166](ARCHITECTURE.md#L166) claims a centralized `ThemeProvider` — that claim checks out, and `src/tests/components/theme/ThemeProvider.test.js` **passes**.

The only MUI problem is the missing icons package (A.1).

One real MUI API deprecation is live: [Navbar.jsx:74](src/components/common/Navbar.jsx#L74) uses `<ListItem button ...>`, removed in MUI v6 but still functional (with a console deprecation warning) in v5.16.

### A.5 `react-beautiful-dnd` — abandoned, but not currently a blocker

| Evidence | Value |
|---|---|
| Declared | [package.json:29](package.json#L29) — `"react-beautiful-dnd": "^13.1.1"` |
| Installed? | **NO.** `Test-Path node_modules\react-beautiful-dnd` → `False`; `npm ls` → `UNMET DEPENDENCY react-beautiful-dnd@^13.1.1` |
| Import sites | **Exactly 1**: [JourneyMappingTool.jsx:42](src/features/beta-program/components/analytics/JourneyMappingTool.jsx#L42) |
| Reachable from `src/index.js`? | **No.** `App.js` never imports `JourneyMappingTool`. |

So rbd does not break the current build. It is still a hazard: (i) it must be resolved by any `npm install`/`npm ci`; (ii) it is unmaintained and its React-18 story is `UNSAFE_`-era / `defaultProps`-on-function-components, so it degrades under `React.StrictMode` (which [src/index.js:24](src/index.js#L24) enables); (iii) it is used for exactly one beta-analytics screen. For a game's drag-reorder needs, use `@dnd-kit` and delete the beta program.

### A.6 Hard blockers — complete list

Ordered by what the build hits first. Because the build aborts at the first resolve error, items 2+ were established by static import analysis plus `npm ls`, not by watching the compiler walk down the list.

| # | Blocker | File / line evidence | Impact |
|---|---|---|---|
| 1 | `@mui/icons-material` not installed | [Navbar.jsx:19](src/components/common/Navbar.jsx#L19) vs [package.json:8](package.json#L8); `npm ls` → UNMET | **Kills `npm start` and `npm run build`.** The one true first blocker. |
| 2 | 24 `UNMET DEPENDENCY` entries in the root install | `npm ls --depth=0` (raw output in A.7) | A fresh checkout cannot build. `node_modules` is a **partial/corrupt install**, not a clean `npm ci`. |
| 3 | `jsonwebtoken` missing | [server/utils/jwtAuth.js:8](server/utils/jwtAuth.js#L8) ← `middleware/authMiddleware.js` ← `server/server.js` | **Backend cannot boot.** [VERIFIED] `node server/server.js` → `Error: Cannot find module 'jsonwebtoken'` with exactly that require stack. |
| 4 | `bcrypt` missing | [server/models/betaUsers.js:9](server/models/betaUsers.js#L9) | Backend boot fails next, via [server.js:27](server/server.js#L27). |
| 5 | `@sendgrid/mail` missing | [server/services/emailService.js:7](server/services/emailService.js#L7) | Backend boot fails next, via [server.js:35](server/server.js#L35). |
| 6 | `patch-package` missing, yet `postinstall` runs it | [package.json:84](package.json#L84) — `"postinstall": "patch-package"`; `patch-package` is UNMET | `npm ci` fails at postinstall. Only one patch exists: [patches/nth-check+2.1.1.patch](patches/nth-check+2.1.1.patch) (10 lines, transitive dep). |
| 7 | `jest` config conflict | [jest.config.js](jest.config.js) **and** `jest` key at [package.json:105-109](package.json#L105-L109) | **[VERIFIED]** `npx jest --listTests` prints: `● Multiple configurations found: * jest.config.js * 'jest' key in package.json — Implicit config resolution does not allow multiple configuration files.` Works only because Jest falls through; fragile. |
| 8 | `jest-transform-stub` referenced but not declared/installed | [tests/config/jest/frontend.config.js:27](tests/config/jest/frontend.config.js#L27) | `Test-Path node_modules/jest-transform-stub` → `False`; not in `package.json`. Any test importing a raster/SVG asset fails with "Cannot find module 'jest-transform-stub'". No active test does today, so the suite runs. |
| 9 | Playwright config path does not exist | [tests/config/playwright.config.js:5](tests/config/playwright.config.js#L5) requires `tests/config/playwright/cross-browser.config.js`; `Test-Path tests\config\playwright` → **False** | `npm run test:cross-browser` ([package.json:55](package.json#L55)) → MODULE_NOT_FOUND. Same for `test:smoke`, `test:integration*` — all also blocked by `@playwright/test` being UNMET. |
| 10 | `uuid` used but never declared | [RouteGenerationService.js:1](src/features/travel-planning/services/RouteGenerationService.js#L1) and [RouteManagementService.js:2](src/features/travel-planning/services/RouteManagementService.js#L2) | **Phantom dependency.** `uuid@8.3.2` happens to be present in `node_modules` (hoisted transitively) but is absent from `package.json` dependencies. A clean install has no guarantee. |
| 11 | `build/` is a stale stub, not a build | `build/` contains only `manifest.json`, `offline.html`, `service-worker.js` (dated 2025-03-21/22); **no `index.html`, no `static/`**. `build` is gitignored ([.gitignore:7](.gitignore#L7) → `/build`). | `npm run deploy:cdn:dry-run` exits 1 at [scripts/deploy-to-cdn.js:98-102](scripts/deploy-to-cdn.js#L98-L102) ("Static directory not found"). |
| 12 | Docker frontend build references non-existent files | [deployment/production/Dockerfile.frontend:22](deployment/production/Dockerfile.frontend#L22) COPYs `deployment/production/nginx-frontend.conf` → **does not exist**; [:12](deployment/production/Dockerfile.frontend#L12) COPYs `.env.production` → does not exist; [:9](deployment/production/Dockerfile.frontend#L9) `npm ci --only=production` omits the devDeps CRA needs to build | `docker build` cannot succeed. |
| 13 | `npm run dev` / `dev:win` are broken in two ways | [package.json:45-46](package.json#L45-L46) | (a) `dev` uses bash-only `PORT=3000 npm run start` on a Windows-defaulted project (the existence of `dev:win` at :46 concedes this); (b) both set the **frontend** PORT to 3000, colliding with the backend default `PORT=3000` at [server.js:245](server/server.js#L245), while the client base URL is `http://localhost:3000/api` ([apiClient.js:14](src/core/services/apiClient.js#L14)) — i.e. the frontend would call its own dev server. |
| 14 | Deploy path is aspirational, not real | [scripts/deploy-to-cdn.js](scripts/deploy-to-cdn.js) requires `aws-sdk` (UNMET, imported at [server/utils/cdnManager.js:10](server/utils/cdnManager.js#L10)) and `glob@^10.4.5` (installed is 7.2.3 — `npm ls` reports `glob@7.2.3 invalid: "^10.4.5" from the root project`). Real AWS S3/CloudFront code exists ([server/config/cdn.js](server/config/cdn.js), [server/utils/cdnManager.js](server/utils/cdnManager.js), [server/services/cdnService/](server/services/cdnService/)) but no bucket/distribution ID, no credentials, and no successful build to upload. | Blocked by 1, 2, 11, 14. |
| 15 | Missing public assets referenced by `public/index.html` | [public/index.html:5](public/index.html#L5) `%PUBLIC_URL%/favicon.ico` and [:10](public/index.html#L10) `logo192.png` — `public/` contains **only** `index.html`, `manifest.json`, `offline.html`, `service-worker.js` | Two 404s at every page load. |
| 16 | Empty PWA manifest | [public/manifest.json](public/manifest.json) is 1 byte (empty), yet linked at [index.html:11](public/index.html#L11) and fetched by the service worker | Manifest parse error in console; PWA installability is decorative, not real. |

### A.7 Raw command results (as requested)

**(1) `node -v; npm -v`** — see A.0.

**(2) `npx jest --listTests 2>&1 | Measure-Object -Line`**

```
Lines Words Characters Property
----- ----- ---------- --------
   45
```

Note: `45` includes 2 `npm notice` lines and Jest's 7-line "Multiple configurations found" diagnostic. Re-run with an explicit config for a clean count:

```
npx jest --listTests --config=jest.config.js                     → 38 lines (2 npm notices + 36 files)
npx jest --listTests --config=tests/config/jest/frontend.config.js → 38 lines (2 npm notices + 36 files)
matching '.test.|.spec.' file paths only                          → 36
```

**36 test files match.** The `--listTests` output includes the diagnostic because of the `jest.config.js` vs `package.json#jest` conflict (blocker 7).

**(2b) Actual matched test files (36, `--config=tests/config/jest/frontend.config.js`)**

```
src/core/services/RouteService.test.js
src/core/services/storage/CacheService.test.js
src/core/services/storage/LocalStorageService.test.js
src/core/services/storage/SyncService.test.js
src/components/Timeline/TimelineComponent.test.js
src/tests/api/googleMapsApi.test.js
src/tests/api/mapFunctions.test.js
src/tests/api/openaiApi.test.js
src/tests/api/routeFunctions.test.js
src/tests/components/analytics/BetaProgramDashboard.test.js
src/tests/components/analytics/DeviceDistribution.test.js
src/tests/components/analytics/FeatureUsageChart.test.js
src/tests/components/analytics/HeatmapVisualization.test.js
src/tests/components/analytics/UserActivityChart.test.js
src/tests/components/api/ApiStatus.test.js
src/tests/components/onboarding/CodeRedemption.test.js
src/tests/components/onboarding/OnboardingFlow.test.js
src/tests/components/onboarding/PreferencesSetup.test.js
src/tests/components/onboarding/setup.test.js
src/tests/components/onboarding/UserProfileSetup.test.js
src/tests/components/onboarding/WelcomeScreen.test.js
src/tests/components/router/RouterStructure.test.js
src/tests/components/survey/SurveyList.test.js
src/tests/components/theme/ThemeProvider.test.js
src/tests/components/travel-planning/ItineraryBuilder.test.js
src/tests/components/travel-planning/RouteGenerator.test.js
src/tests/components/travel-planning/RoutePreview.test.js
src/tests/components/ui/Timeline.test.js
src/tests/integration/apiStatus.test.js
src/tests/integration/routeGeneration.test.js
src/tests/integration/travel-planning-workflow.test.js
src/tests/pages/ChatPage.test.js
src/tests/pages/MapPage.test.js
src/tests/pages/ProfilePage.test.js
src/tests/stability/analytics-components-stability.test.js
src/tests/stability/frontend-stability.test.js
```

**(3) `.skip` files (13, raw output of the requested command)**

```
D:\All-Downloads\TourGuideAI\src\services\storage\CacheService.test.js.skip
D:\All-Downloads\TourGuideAI\src\services\storage\LocalStorageService.test.js.skip
D:\All-Downloads\TourGuideAI\src\services\storage\SyncService.test.js.skip
D:\All-Downloads\TourGuideAI\src\tests\beta-program\task-prompt\InAppTaskPrompt.test.jsx.skip
D:\All-Downloads\TourGuideAI\src\tests\beta-program\task-prompt\TaskPromptManager.test.jsx.skip
D:\All-Downloads\TourGuideAI\src\tests\beta-program\ux-audit\SessionRecording.test.jsx.skip
D:\All-Downloads\TourGuideAI\src\tests\beta-program\ux-audit\UXAuditDashboard.test.jsx.skip
D:\All-Downloads\TourGuideAI\src\tests\beta-program\ux-audit\UXHeatmap.test.jsx.skip
D:\All-Downloads\TourGuideAI\src\tests\beta-program\ux-audit\UXMetricsEvaluation.test.jsx.skip
D:\All-Downloads\TourGuideAI\src\tests\components\analytics\AnalyticsDashboard.test.js.skip
D:\All-Downloads\TourGuideAI\src\tests\components\survey\SurveyBuilder.test.js.skip
D:\All-Downloads\TourGuideAI\src\tests\stability\task-prompt-stability.test.js.skip
D:\All-Downloads\TourGuideAI\src\tests\stability\ux-audit-stability.test.js.skip
```

All 13 are **beta-program / analytics / survey / UX-audit** tests. Total: **2,444 LOC of disabled tests**, i.e. 35.5% of the 6,874 LOC in `src/tests/`. Note that the three `src/services/storage/*.test.js.skip` files are dead **twins** of live tests that already exist at `src/core/services/storage/*.test.js` — the refactor copied the tests to `core/` and left the originals renamed rather than deleted.

**(4) `.skip` vs active counts** (files matching `*.test.js|*.test.jsx|*.test.js.skip|*.test.jsx.skip|*.spec.js|*.spec.ts`):

```
src   total test-ish files: 49   .skip: 13   active: 36
tests total test-ish files: 18   .skip:  0   active: 18
```

**Zero `.skip` files under `tests/`.** All 13 are under `src/`. Of the 18 active files under `tests/`, all are Playwright/k6/BrowserStack and none can run (blockers 2, 9).

**(5) `npm ls --depth=0` (first 60 lines, verbatim)**

```
tour-guide-ai@1.0.0-RC1 D:\All-Downloads\TourGuideAI
+-- @babel/core@7.26.10
+-- @babel/plugin-syntax-dynamic-import@7.8.3
+-- @babel/preset-env@7.26.9
+-- @babel/preset-react@7.26.3
+-- @emotion/react@11.14.0
+-- @emotion/styled@11.14.0
+-- UNMET DEPENDENCY @mui/icons-material@^5.14.5
+-- @mui/material@5.16.14
+-- UNMET DEPENDENCY @playwright/test@^1.51.1
+-- @react-google-maps/api@2.20.6
+-- UNMET DEPENDENCY @sendgrid/mail@^8.1.5
+-- @testing-library/jest-dom@6.6.3
+-- @testing-library/react@16.2.0
+-- @testing-library/user-event@14.6.1
+-- UNMET DEPENDENCY aws-sdk@^2.1692.0
+-- axios@1.8.3 invalid: "^1.9.0" from the root project
+-- babel-loader@10.0.0
+-- UNMET DEPENDENCY bcrypt@^5.1.1
+-- chalk@4.1.2 invalid: "^5.4.1" from the root project
+-- UNMET DEPENDENCY chart.js@^4.4.8
+-- concurrently@8.2.2
+-- cors@2.8.5
+-- UNMET DEPENDENCY cross-env@^7.0.3
+-- crypto-js@4.2.0
+-- css-loader@7.1.2
+-- dotenv@16.4.7
+-- express-rate-limit@7.5.0
+-- express@4.21.2
+-- file-loader@6.2.0
+-- glob@7.2.3 invalid: "^10.4.5" from the root project
+-- UNMET DEPENDENCY heatmap.js@^2.0.5
+-- helmet@7.2.0
+-- html2canvas@1.4.1
+-- identity-obj-proxy@3.0.0
+-- UNMET DEPENDENCY jsonwebtoken@^9.0.2
+-- lz-string@1.5.0
+-- memory-cache@0.2.0
+-- UNMET DEPENDENCY mongodb-memory-server@^10.1.4
+-- UNMET DEPENDENCY mongoose@^8.14.3
+-- morgan@1.10.0
+-- openai@4.87.3
+-- UNMET DEPENDENCY ora@^8.2.0
+-- UNMET DEPENDENCY patch-package@^8.0.0
+-- UNMET DEPENDENCY postinstall-postinstall@^2.1.0
+-- UNMET DEPENDENCY react-beautiful-dnd@^13.1.1
+-- UNMET DEPENDENCY react-chartjs-2@^5.3.0
+-- react-dom@18.3.1
+-- react-router-dom@6.30.0
+-- react-scripts@5.0.1
+-- UNMET DEPENDENCY react-test-renderer@^18.2.0
+-- react@18.3.1
+-- recharts@2.15.1
+-- response-time@2.3.3
+-- style-loader@4.0.0
+-- UNMET DEPENDENCY supertest@^7.1.0
+-- UNMET DEPENDENCY ts-node@^10.9.2
+-- web-vitals@2.1.4
+-- webpack-bundle-analyzer@4.10.2
+-- winston@3.17.0
```

**24 UNMET dependencies** (`@mui/icons-material`, `@playwright/test`, `@sendgrid/mail`, `aws-sdk`, `bcrypt`, `chart.js`, `cross-env`, `heatmap.js`, `jsonwebtoken`, `mongodb-memory-server`, `mongoose`, `ora`, `patch-package`, `postinstall-postinstall`, `react-beautiful-dnd`, `react-chartjs-2`, `react-test-renderer`, `supertest`, `ts-node` — plus `jest-transform-stub` which is not even declared) and **3 INVALID versions** (`axios` 1.8.3 vs `^1.9.0`, `chalk` 4.1.2 vs `^5.4.1`, `glob` 7.2.3 vs `^10.4.5`). `chalk` and `glob` are transitively hoisted at older versions; `axios` is a genuinely stale install.

**(6) `npx react-scripts build` — no backgrounding needed**

See A.1. It exits 1 in seconds with the `@mui/icons-material/Menu` resolve error. **It is not slow, and the reason it cannot be timed is that it never reaches the compile/minify phase at all.**

### A.8 Two dependencies that are installed but never used

| Package | Installed | Import sites in `src/`, `server/`, `tests/`, `scripts/` |
|---|---|---|
| `openai` (the official SDK) | 4.87.3 | **0** — every OpenAI call uses raw `axios`/`fetch` against `https://api.openai.com/v1/chat/completions` |
| `crypto-js` | 4.2.0 | **0** — `server/utils/keyManager.js` uses Node's built-in `crypto` |

Also note `testing-library` `ReactDOM.render` shims and `src/__mocks__/react-dom-client.js` (1 byte, empty) — a stub that does nothing.

---

## B. Reusable assets table

LOC counted with `Get-Content | Measure-Object -Line` unless stated. "Reachability" = whether the file is in the import graph rooted at [src/index.js](src/index.js) or [server/server.js](server/server.js).

### B.1 Keep — the genuine salvage

| Path | Lines/LOC | What it does | Reuse verdict | Why |
|---|---|---|---|---|
| [server/routes/googlemaps.js](server/routes/googlemaps.js) | 341 | 6 real Google Maps Platform proxy routes: `/geocode`, `/nearby`, `/directions`, `/place`, `/photo`, `/autocomplete`. Real axios calls via `createGoogleMapsClient` ([apiHelpers.js:37-50](server/utils/apiHelpers.js#L37-L50)), key injected server-side from the vault, `cacheMiddleware` on 5 of 6, uniform error envelope via `handleApiError`. | **KEEP-AS-IS** | This is the single most valuable asset in the repo: a working, key-safe, rate-limited, cached geodata proxy. It is exactly what an online POI/geocoding side-channel for a game needs. Fix two things (B.3 #4, #5). |
| [src/pages/ChatPage.js](src/pages/ChatPage.js) | 256 | The real product entry: textarea → `recognizeTextIntent` → `generateRoute` → `navigate('/map', { state })`. | **EXTRACT** | The 3-call orchestration at [:100-152](src/pages/ChatPage.js#L100-L152) is a clean, salvageable "player input → structured intent → generated content → render" pipeline — the exact shape of a quest generator. But [:8-81](src/pages/ChatPage.js#L8-L81) is 74 lines of `mockPopups`/`mockRankboard` and [:204-256](src/pages/ChatPage.js#L204-L256) renders them as fake "Live Activity"/"Top Routes". Extract the handler, delete the mock social layer. |
| [src/core/services/storage/LocalStorageService.js](src/core/services/storage/LocalStorageService.js) | 224 | Namespaced, exception-safe `localStorage` wrapper: routes, timelines, favorites, settings, waypoints, last-sync. | **KEEP-AS-IS** | Correct, dependency-free, and the right primitive for a game's save/offline state. Keys are already domain-shaped (`tourguide_routes`, `tourguide_waypoints`, [:8-15](src/core/services/storage/LocalStorageService.js#L8-L15)). Note this class exposes `getData`/`saveData` — see B.3 #1. |
| [src/core/services/storage/CacheService.js](src/core/services/storage/CacheService.js) | 364 | TTL cache with LZ-string compression, byte-size accounting, LRU-ish eviction, prefix invalidation, batch prefetch, stats. | **KEEP-AS-IS** | Genuinely well-built generic infrastructure. For a game: cache generated quest text/asset manifests. `getCacheStats()` [:237-252](src/core/services/storage/CacheService.js#L237-L252) is directly useful for a debug overlay. |
| [src/core/services/storage/SyncService.js](src/core/services/storage/SyncService.js) | 267 | Queue-based offline→online sync with per-entity syncers (routes/timelines/favorites/waypoints), a retry queue, and periodic sync. | **KEEP-AS-IS** | The offline-first plumbing a travel game actually needs. It is the **only** consumer of `LocalStorageService`'s API that matches its real method names (all 17 call sites use `getLastSync`/`saveRoute`/`getAllRoutes`/… — verified by grep). |
| [server/middleware/rateLimit.js](server/middleware/rateLimit.js) | 101 | `globalLimiter` / `openaiLimiter` / `mapsLimiter` via `express-rate-limit` 7.5.0. | **KEEP-AS-IS** | Installed, working, and directly needed to stop a game client from burning LLM budget. |
| [server/utils/vaultService.js](server/utils/vaultService.js) | 402 | Encrypted secret store with rotation metadata; `local`/`aws`/`hashicorp`/`in-memory` backends. | **EXTRACT** | Real, substantial secret-management code with an env-var fallback path ([tokenProvider.js:115-120](server/utils/tokenProvider.js#L115-L120)) so it works with zero infrastructure. Extract the `local` backend; the AWS/HashiCorp branches are speculative. |
| [server/utils/logger.js](server/utils/logger.js) | 163 | Winston logger + `logApiRequest`. | **KEEP-AS-IS** | Boring and correct. |
| [src/components/Timeline/](src/components/Timeline/) | 124 + 112 + 105 (+ 3 CSS = 559) | `TimelineComponent` / `DayCard` / `ActivityBlock` with CSS. Currently rendered only by the unrouted `TimelineDemoPage`, not by `MapPage`. | **EXTRACT** | A day-by-day, time-ordered activity feed is directly reusable as a quest journal / schedule panel. Has a passing test ([TimelineComponent.test.js](src/components/Timeline/TimelineComponent.test.js)). |
| [src/contexts/LoadingContext.js](src/contexts/LoadingContext.js) · [NotificationContext.js](src/contexts/NotificationContext.js) · [AuthContext.js](src/contexts/AuthContext.js) | 100 + 85 + 106 | Small, clean providers. `LoadingProvider` is imported by [App.js:3](src/App.js#L3); `NotificationContext` is consumed by [TravelPlanningWorkflow.js:23](src/features/travel-planning/components/TravelPlanningWorkflow.js#L23). | **KEEP-AS-IS** | Dependency-free, already wired, and `LoadingContext.test`-adjacent tests pass. |
| [server/utils/apiHelpers.js](server/utils/apiHelpers.js) | 132 | `createOpenAIClient` / `createGoogleMapsClient` / `handleApiError` / `validateParams`. | **KEEP-AS-IS** | The 60s/30s timeouts and the structured error envelope `{id, source, status, type, message, code, timestamp}` ([:66-74](server/utils/apiHelpers.js#L66-L74)) are a good base for a game API. `validateParams` is a hand-rolled schema checker — replace with zod later, but it works. |
| [server/routes/openai.js](server/routes/openai.js) | 301 | 4 real Chat Completions routes with JSON mode, caching, validation, error envelope. | **EXTRACT** | The route scaffolding, JSON-mode plumbing and error handling are worth keeping. The four prompt payloads embedded at [:39-59](server/routes/openai.js#L39-L59), [:110-140](server/routes/openai.js#L110-L140), [:184-201](server/routes/openai.js#L184-L201), [:252-279](server/routes/openai.js#L252-L279) are travel-specific and must be rewritten. |
| [src/config/api.js](src/config/api.js) | 36 | Central API config. | **EXTRACT** | Small; the only place that should hold a base URL. Verify it is actually the source of truth (it currently is not). |
| [src/utils/imageUtils.js](src/utils/imageUtils.js) | 112 | Image helpers. | **EXTRACT** | Unrelated to travel; likely reusable for asset thumbnails. Not currently imported by any page. |
| [.github/workflows/](.github/workflows/) | 8 workflows + 3 docs ≈ 1,900 | CI: `ci-cd.yml` (797), `security-scan.yml`, `stability-tests.yml`, `e2e-tests.yml`, `dependency-updates.yml`, `branch-protection.yml`, plus `README.md` (451) and two INFRASTRUCTURE_* analyses. | **REWRITE** | The *shape* is good (build → test → security scan → deploy). Every step invokes a test script that is broken today (blockers 2, 9). Keep the structure, replace the bodies. |
| [.cursor/rules/](.cursor/rules/) + [.cursor/](.cursor/) | 15 + 231 + 202 + 445 + 675 + 312 = 1,880 | See D-adjacent note in §G. | **KEEP-AS-IS** | Project-management scaffolding that costs nothing and documents the OKR ritual the owner was using. |

### B.2 Rewrite — the right idea, the wrong implementation

| Path | Lines/LOC | What it does | Reuse verdict | Why |
|---|---|---|---|---|
| [src/App.js](src/App.js) | 148 | Root router: `LoadingProvider` + `PermissionsProvider` + `Navbar` + 10 lazy routes + a `/health` backend probe. | **REWRITE** | The lazy-route shape ([:14-23](src/App.js#L14-L23)) and the backend-availability fallback ([:64-90](src/App.js#L64-L90)) are good patterns. But **9 of 10 routes are `NavGuard`-protected behind `ROLES.BETA_TESTER`** ([:108-143](src/App.js#L108-L143)) — i.e. in the current app **you cannot reach `/chat`, `/map`, or `/profile` at all without a beta invite code**. For a game this must be inverted: public routes, optional accounts. |
| [src/index.js](src/index.js) | 46 | Entry: MUI theme, `BrowserRouter`, `App`, service-worker registration, `reportWebVitals`. | **REWRITE** | Structurally correct. Replace the ad-hoc 2-color theme ([:11-20](src/index.js#L11-L20)) and keep the SW registration at [:35-45](src/index.js#L35-L45). |
| [src/pages/MapPage.js](src/pages/MapPage.js) | 610 | The map/route page. | **REWRITE** | **Nothing here is real.** See §D. It is the single largest piece of genuine-looking-but-fake UI in the repo. The *layout* (map pane + query/intent panel + day-by-day timeline + nearby POIs, [:509-606](src/pages/MapPage.js#L509-L606)) is a reasonable 2.5D HUD skeleton to re-implement against a real renderer. |
| [src/core/api/openaiApi.js](src/core/api/openaiApi.js) | 434 | 4 LLM operations, direct + proxy branches. | **REWRITE** | See §C. Keep `recognizeTextIntent`/`generateRoute` as *concepts*; the transport, prompts, and both code paths are broken. |
| [src/core/api/googleMapsApi.js](src/core/api/googleMapsApi.js) | 761 | 8 Maps operations, direct + proxy branches. | **REWRITE** | See §D. Two of the proxy paths hit non-existent endpoints and one sends the wrong parameter names. |
| [src/features/travel-planning/services/RouteManagementService.js](src/features/travel-planning/services/RouteManagementService.js) | 408 | CRUD + favorites + search for routes, API-first with localStorage fallback. | **REWRITE** | The offline-fallback *pattern* (try API → fall back to local → last resort local) is right and worth preserving. The implementation is fatally broken — see B.3 #1. 26 call sites all use the wrong method names. |
| [src/features/travel-planning/services/RouteGenerationService.js](src/features/travel-planning/services/RouteGenerationService.js) | 178 | 5 fetch calls to `/api/routes/*`. | **REWRITE** | **Every endpoint it calls does not exist.** See §C.2. Also imports undeclared `uuid` ([:1](src/features/travel-planning/services/RouteGenerationService.js#L1)). |
| [src/features/travel-planning/components/RouteGenerator.js](src/features/travel-planning/components/RouteGenerator.js) | 198 | Query → analyze → generate → "Surprise Me", with an intent panel. | **EXTRACT** | Genuinely good UX shape for a game: free-text input, an explicit "analyze" affordance that shows the parsed intent back to the player ([:141-195](src/features/travel-planning/components/RouteGenerator.js#L141-L195)), and a surprise-me button. **It is not routed anywhere** — see B.3 #3. |
| [src/features/travel-planning/components/ItineraryBuilder.js](src/features/travel-planning/components/ItineraryBuilder.js) | 575 | Full CRUD editor for days/activities/costs with inline edit modes. | **EXTRACT** | The most complete UI in the repo and directly reusable as an in-game itinerary/quest editor. Currently unusable end-to-end because every write goes through the broken `RouteManagementService`. Also note drag-reorder is a **stub**: [ItineraryBuilder.js:434-441](src/features/travel-planning/components/ItineraryBuilder.js#L434-L441) renders a `↕` button with no `onClick` handler, under a "Drag to reorder activities" instruction ([:302-306](src/features/travel-planning/components/ItineraryBuilder.js#L302-L306)). |
| [src/features/travel-planning/components/RoutePreview.js](src/features/travel-planning/components/RoutePreview.js) | 237 | Read-only route presentation with save/edit actions. | **EXTRACT** | Clean presentational component. Its test passes. |
| [src/features/travel-planning/components/TravelPlanningWorkflow.js](src/features/travel-planning/components/TravelPlanningWorkflow.js) | 155 | generate → preview → edit state machine. | **EXTRACT** | The 3-step state machine ([:17-19](src/features/travel-planning/components/TravelPlanningWorkflow.js#L17-L19)) is the correct skeleton for a quest flow. Its "Sign In" button is `window.location.href = '/signin'` ([:139](src/features/travel-planning/components/TravelPlanningWorkflow.js#L139)) — a route that does not exist. |
| [src/components/common/Navbar.jsx](src/components/common/Navbar.jsx) | 171 | Responsive MUI AppBar + Drawer. | **REWRITE** | The component is fine; it just needs the `@mui/icons-material` import ([:19](src/components/common/Navbar.jsx#L19)) replaced. Note [:53-64](src/components/common/Navbar.jsx#L53-L64) wraps `AuthButtons` in a `try/catch` — a code smell that betrays known instability in the beta auth chain. |
| [server/server.js](server/server.js) | 266 | Express app: helmet CSP, morgan, CORS, rate limit, 6 route mounts, `/health`, prod static serving. | **REWRITE** | Good bones (helmet + CSP at [:72-93](server/server.js#L72-L93), `/health` at [:138-150](server/server.js#L138-L150)). Must drop the beta/auth/email/admin mounts ([:122-131](server/server.js#L122-L131)) and the `NODE_ENV !== 'production'` invite-code generators ([:171-216](server/server.js#L171-L216)) before anything ships. |
| [public/service-worker.js](public/service-worker.js) + [offline.html](public/offline.html) | 314 + 127 | Cache strategies per resource type, offline fallback. | **REWRITE** | Real SW code, but it caches an app whose map is a live Google Maps JS load — see §D. The caching *strategies* are reusable; the precache list must be rewritten for game assets. |
| [.babelrc](.babelrc) · [webpack.config.js](webpack.config.js) | 6 · 99 | Root Babel presets; a dead webpack config. | **DELETE** | `.babelrc` duplicates CRA's own Babel config and could conflict. `webpack.config.js` is never read (§A.2). |

### B.3 Delete — and the four fatal bugs that justify deletion

| Path | Lines/LOC | Reuse verdict | Why |
|---|---|---|---|
| **Entire repo — the map/geodata rendering path** | ~1,400 | **DELETE** | See §D. `MapPage` + both `googleMapsApi.js` files paint fabricated data. |
| **Entire repo — the two "duplicate" API modules** | 1,884 | **DELETE** | See B.3 #2. |
| [server/services/routeGenerationService.js](server/services/routeGenerationService.js) · [routeManagementService.js](server/services/routeManagementService.js) · [server/models/RouteModel.js](server/models/RouteModel.js) · [server/clients/openaiClient.js](server/clients/openaiClient.js) · [server/clients/googleMapsClient.js](server/clients/googleMapsClient.js) | 147 · 276 · 98 · 72 · 79 | **DELETE** | Orphaned **and** fake. See B.3 #4. |
| [server/utils/keyManager.js](server/utils/keyManager.js) | 180 | **DELETE** | A third, redundant, non-persistent key store. See §C.5. |
| `src/features/beta-program/**` (minus auth) · `src/tests/**` · [src/setupTests.js](src/setupTests.js) | 35,600+ | **DELETE** | See §E. |
| [server/coverage/](server/coverage/) | 24 files / 12,014 LOC | **DELETE** | **Committed generated coverage HTML/XML**, including `lcov-report/*.html` renderings of the project's own source. Pure noise; it inflates the repo by ~12k LOC and includes a `server\coverage\lcov-report\base.css`, `prettify.js`, `sorter.js` etc. Nothing reads it. |
| `src/features/map-visualization/` · `src/features/user-profile/` | 33 · 28 (README only) | **DELETE** | Empty placeholder dirs, but [src/features/index.js:11-16](src/features/index.js#L11-L16) exports from `./map-visualization/components`, `./map-visualization/services`, `./user-profile/components`, `./user-profile/services` — **four exports of files that do not exist**. The file is saved only by being imported by nothing. Same class of landmine: [src/features/travel-planning/index.js](src/features/travel-planning/index.js) is a 1-byte empty file. |
| [src/components/Navbar.js](src/components/Navbar.js) + [Navbar.css](src/components/Navbar.css) · [src/components/LoadingProvider.js](src/components/LoadingProvider.js) | 79 + 121 · 52 | **DELETE** | Superseded duplicates. `App.js:6` imports `./components/common/Navbar`; grep finds **zero** importers of `src/components/Navbar.js`. `App.js:3` imports `LoadingProvider` from `./contexts/LoadingContext`; `src/components/LoadingProvider.js` has zero importers. |
| [src/pages/TimelineDemoPage.js](src/pages/TimelineDemoPage.js) | 231 | **DELETE** | Not in `App.js`'s route table; grep finds it referenced only by itself. Its only value was demoing `src/components/Timeline/`. |
| [tests/user-journey/](tests/user-journey/) · [tests/load/](tests/load/) · [tests/security/](tests/security/) · [tests/smoke/](tests/smoke/) · [tests/cross-browser/](tests/cross-browser/) · [tests/stability/](tests/stability/) | ≈ 4,300 | **DELETE** | 5 Playwright/k6 specs (2,000+ LOC) for personas named "elena-family-traveler", "james-business-traveler", etc., plus k6 load tests and a ZAP wrapper. **None can execute** (blockers 2, 9). They encode a product that no longer exists. |
| [scripts/](scripts/) (most) | 3,252 total | **DELETE** | `run-stability-tests.js`, `run-user-journeys.js`, `run-security-audit.js`, `generate-test-report.js`, `reorganize-tests.js`, `run-all-tests.{ps1,sh}`, `run-load-tests.sh`, `run-travel-planning-tests.sh` — all orchestrate the dead suites. Keep `generate-keys.js` (111) if the vault path survives. |
| [deployment/](deployment/) | 897 | **DELETE** | Aspirational. See A.6 #12, #14. Requires Docker, `.env.production`, an `nginx-frontend.conf` that doesn't exist, an AWS account, and a Prometheus/CloudWatch stack. |

#### The four fatal bugs (each independently disqualifying)

**B.3 #1 — `RouteManagementService` calls methods that do not exist. 26 call sites.**

[LocalStorageService](src/core/services/storage/LocalStorageService.js) exposes `saveData` / `getData` / `removeData` ([:24](src/core/services/storage/LocalStorageService.js#L24), [:40](src/core/services/storage/LocalStorageService.js#L40), [:55](src/core/services/storage/LocalStorageService.js#L55)). [RouteManagementService.js](src/features/travel-planning/services/RouteManagementService.js) calls `localStorageService.getItem(...)` and `.setItem(...)` at **26 sites** (lines 29, 41, 87, 89, 96, 105, 152, 154, 166, 185, 214, 216, 225, 227, 242, 255, 279, 285, 302, 309, 331, 334, 342, 345, 360, 363). Neither method exists. Every one of those paths throws `TypeError: localStorageService.getItem is not a function`, and most of them are inside `catch` blocks — i.e. the "last resort: check local storage" fallback throws too. **All 10 methods of this service are non-functional**, which is why `ItineraryBuilder` cannot load a route and `TravelPlanningWorkflow` cannot save one. Note the live twin tests (`src/core/services/storage/*.test.js`) pass because they test `LocalStorageService` directly, never through `RouteManagementService`.

**B.3 #2 — the "duplicate" API files are full forks, not re-exports, and one pair has a divergent JSON contract.**

The docs claim otherwise. [API_OVERVIEW.md](API_OVERVIEW.md) says: *"`└── api/ ├── googleMapsApi.js  # Legacy (redirects to core) └── openaiApi.js  # Legacy (redirects to core)`"* and *"Legacy API Modules: Compatibility layer that re-exports from core modules."* **This is false.**

- `src/api/googleMapsApi.js` is **639 lines of independent implementation**. It exports 11 of core's 12 named exports and is missing `setUseServerProxy` — so it **cannot use the server proxy at all**. There is no `export * from '../core/api/googleMapsApi'` anywhere in it. Compare: core has `setUseServerProxy` ([:52](src/core/api/googleMapsApi.js#L52)) and `apiBaseUrl`/`useServerProxy` config ([:21-22](src/core/api/googleMapsApi.js#L21-L22)); the legacy fork has neither.
- `src/api/openaiApi.js` **does** have `export * from '../core/api/openaiApi'` at [:9](src/api/openaiApi.js#L9) — but then re-declares `setApiKey`, `setModel`, `setDebugMode`, `getStatus`, `recognizeTextIntent`, `generateRoute`, `generateRandomRoute`, `splitRouteByDay` locally ([:32](src/api/openaiApi.js#L32) onward). Under ES-module semantics an explicit local export **shadows** a star re-export, so **every call resolves to the local 348-line fork, not to core.** The `export *` line is decorative. The file also lacks `setUseServerProxy`.
- Normalized line diff: 190 lines present in `src/api/openaiApi.js` but not in core; 276 lines present in core but not in `src/api/`. These are **different programs.**
- **The contracts diverge.** For the same function name `splitRouteByDay`, core asks the model for `route_id / departure_site / arrival_site / departure_time / arrival_time / user_time_zone / transportation_type / duration / duration_unit / distance / distance_unit / recommended_reason` ([openaiApi.js:377-388](src/core/api/openaiApi.js#L377-L388)), while the legacy fork asks for `time / activity / location / duration / transportation / cost / notes` ([openaiApi.js:299-306](src/api/openaiApi.js#L299-L306)). The consumer [MapPage.js:559](src/pages/MapPage.js#L559) does `route.departure_time.split(' ')[1]` and would throw on the legacy shape.
- Which one is live? [ChatPage.js:4](src/pages/ChatPage.js#L4) imports `'../core/api/openaiApi'`, so the **app** uses core. But **5 of the 7 API-module tests import the legacy forks** — [openaiApi.test.js:1](src/tests/api/openaiApi.test.js#L1), [routeFunctions.test.js:8](src/tests/api/routeFunctions.test.js#L8), [googleMapsApi.test.js:1](src/tests/api/googleMapsApi.test.js#L1), [mapFunctions.test.js:106](src/tests/api/mapFunctions.test.js#L106), and [integration/routeGeneration.test.js:1-2](src/tests/integration/routeGeneration.test.js#L1-L2) — while only **2** exercise the core modules the app actually runs: [integration/apiStatus.test.js:1-2](src/tests/integration/apiStatus.test.js#L1-L2) and [components/api/ApiStatus.test.js:12](src/tests/components/api/ApiStatus.test.js#L12). **The tests mostly test the dead fork while the app runs the live one.** That is a large part of the answer to "too many bugs": the safety net was attached to the wrong module.
- Verdict: delete `src/api/` entirely (943 LOC) and repoint the four tests — or accept that they will fail.

**B.3 #3 — the travel-planning feature is not reachable from the app.**

`src/features/travel-planning/` (10 files, 1,794 LOC — `RouteGenerator`, `RoutePreview`, `ItineraryBuilder`, `TravelPlanningWorkflow`, both services) has **no route in [App.js](src/App.js)**. It is exported by [src/features/travel-planning/components/index.js](src/features/travel-planning/components/index.js) and [services/index.js](src/features/travel-planning/services/index.js), which bubble up to [src/features/index.js](src/features/index.js) — **which nothing imports.** So the app's actual travel-planning path is *not* this feature; it is the much cruder `ChatPage → src/core/api/openaiApi → MapPage` chain. Anyone reading `ARCHITECTURE.md` would conclude the opposite. The 1,794 LOC is real code with 4 test files that mostly pass, but it is **dead code in the shipping app**.

**B.3 #4 — the server-side "route services" are mock-backed and mounted nowhere.**

- [server/clients/openaiClient.js:17-35](server/clients/openaiClient.js#L17-L35) — `generateIntentAnalysis()` returns a hard-coded `{arrival: 'Paris, France', travel_duration: '3 days', ...}`. The literal comment is `// Mock implementation for testing`. `this.apiKey = process.env.OPENAI_API_KEY` ([:8](server/clients/openaiClient.js#L8)) is **never used**. There is no HTTP call in the file.
- [server/clients/openaiClient.js:42-69](server/clients/openaiClient.js#L42-L69) — `generateRouteCompletion()` returns a hard-coded "Family Paris Adventure" itinerary, also commented as a mock.
- [server/clients/googleMapsClient.js:14-76](server/clients/googleMapsClient.js#L14-L76) — all four methods return hard-coded Paris data, each commented `// Mock implementation for testing`. `this.apiKey` ([:6](server/clients/googleMapsClient.js#L6)) is never used.
- [server/services/routeGenerationService.js](server/services/routeGenerationService.js) and [server/services/routeManagementService.js](server/services/routeManagementService.js) are imported **only by tests** — `server/tests/routeGeneration.test.js:2` and `server/tests/routeManagement.test.js:2`. Grep for `routeGenerationService|routeManagementService` across `server/` returns matches in tests and in the two service files themselves, and nowhere else. [server/server.js:31-36](server/server.js#L31-L36) mounts `openai`, `googlemaps`, `auth`, `inviteCodes`, `emails`, `admin` — and **no `/api/routes` router exists at all**.
- [server/services/validationService.js](server/services/validationService.js) (33 lines) — `validateItinerary` is called only from the orphaned `routeGenerationService` ([:56](server/services/routeGenerationService.js#L56)). Dead.
- [server/models/RouteModel.js](server/models/RouteModel.js) (98 lines, mongoose) is imported only by `server/tests/db-schema.test.js`, `server/tests/routeManagement.test.js` and the orphaned `routeManagementService`. `mongoose` is UNMET and MongoDB is not a dependency of anything shipping.
- **Consequence:** the client-side `RouteGenerationService` calls `/api/routes/analyze-intent`, `/api/routes/generate`, `/api/routes/surprise`, `/api/routes/generate-constrained`, `/api/routes/optimize` ([:19](src/features/travel-planning/services/RouteGenerationService.js#L19), [:50](src/features/travel-planning/services/RouteGenerationService.js#L50), [:83](src/features/travel-planning/services/RouteGenerationService.js#L83), [:118](src/features/travel-planning/services/RouteGenerationService.js#L118), [:156](src/features/travel-planning/services/RouteGenerationService.js#L156)). There is no such router. A catch-all at [server.js:153](server/server.js#L153) returns `404 {error: 'API endpoint not found'}`, which `RouteGenerationService` turns into `throw new Error('Failed to analyze query: ...')` → surfaced to the player as "Error analyzing query".

---

## C. LLM integration capability

### C.1 Transport: what actually talks to OpenAI

**Exact endpoint path, three times over:**
- `https://api.openai.com/v1/chat/completions` — [src/core/api/openaiApi.js:16](src/core/api/openaiApi.js#L16) (`apiEndpoint`) and again hard-coded at [:150](src/core/api/openaiApi.js#L150).
- `https://api.openai.com/v1/chat/completions` — [src/api/openaiApi.js:22](src/api/openaiApi.js#L22) / [:113](src/api/openaiApi.js#L113), via `fetch`.
- `baseURL: 'https://api.openai.com/v1'` — [server/utils/apiHelpers.js:23](server/utils/apiHelpers.js#L23), then `openaiClient.post('/chat/completions', …)` at [server/routes/openai.js:34](server/routes/openai.js#L34), [:105](server/routes/openai.js#L105), [:179](server/routes/openai.js#L179), [:247](server/routes/openai.js#L247).

The official `openai` npm package (4.87.3, installed) is imported **zero** times. Everything is hand-rolled axios/fetch.

**Model strings, verbatim:**
- `model: 'gpt-4o'` — [src/core/api/openaiApi.js:15](src/core/api/openaiApi.js#L15)
- `model: 'gpt-4o'` — [src/api/openaiApi.js:21](src/api/openaiApi.js#L21)
- `model: process.env.OPENAI_MODEL || 'gpt-4o'` — [server/routes/openai.js:35](server/routes/openai.js#L35), [:106](server/routes/openai.js#L106), [:180](server/routes/openai.js#L180), [:248](server/routes/openai.js#L248)
- `OPENAI_MODEL=gpt-4o` — [server/.env.example](server/.env.example); `REACT_APP_OPENAI_MODEL=gpt-4o` — [.env.example](.env.example)

**Doc contradiction:** [API_OVERVIEW.md](API_OVERVIEW.md) claims *"API Version: GPT-4 / GPT-3.5-turbo"* and lists *"Completions API - For general text generation"*. Neither is true: no `gpt-3.5-turbo` string exists anywhere, and no `/v1/completions` call exists. Only `gpt-4o` + Chat Completions.

**Four app-level operations → four server routes** (all `POST`, all under `/api/openai`):

| Operation | Server route | Route line | Client proxy path |
|---|---|---|---|
| Intent extraction | `/api/openai/recognize-intent` | [openai.js:25](server/routes/openai.js#L25) | `/openai/recognize-intent` ([core:179](src/core/api/openaiApi.js#L179), [:233](src/core/api/openaiApi.js#L233)) |
| Route generation | `/api/openai/generate-route` | [openai.js:92](server/routes/openai.js#L92) | `/openai/generate-route` ([core:240](src/core/api/openaiApi.js#L240)) |
| Random route | `/api/openai/generate-random-route` | [openai.js:175](server/routes/openai.js#L175) | `/openai/generate-random-route` ([core:309](src/core/api/openaiApi.js#L309)) |
| Split by day | `/api/openai/split-route-by-day` | [openai.js:236](server/routes/openai.js#L236) | `/openai/split-route-by-day` ([core:358](src/core/api/openaiApi.js#L358)) |

### C.2 The proxy path is broken by construction — every call is missing `/api`

[server.js:134](server/server.js#L134) mounts the router at **`/api/openai`**. The client posts to **`/openai/…`**:

```js
// src/core/api/openaiApi.js:118-124
let endpoint = '/openai/chat';
if (options.endpoint) { endpoint = `/openai/${options.endpoint}`; }
response = await apiClient.post(endpoint, { messages, options: {...} });
```

and `apiClient` is built at [:86-95](src/core/api/openaiApi.js#L86-L95) as `axios.create({ baseURL: config.apiBaseUrl, … })` — but `config` ([:13-18](src/core/api/openaiApi.js#L13-L18)) is:

```js
let config = {
  apiKey: '', model: 'gpt-4o',
  apiEndpoint: 'https://api.openai.com/v1/chat/completions',
  debug: false
};
```

**There is no `apiBaseUrl` key.** So `baseURL` is `undefined` and every proxied request resolves relative to the page origin — `http://localhost:3000/openai/recognize-intent` in dev. Nothing is mounted there. [setUseServerProxy](src/core/api/openaiApi.js#L47) does not set `apiBaseUrl` either. Contrast [src/core/api/googleMapsApi.js:21](src/core/api/googleMapsApi.js#L21), which *does* define `apiBaseUrl: process.env.REACT_APP_API_URL || 'http://localhost:3000/api'` — so the Google path would resolve correctly while the OpenAI path cannot.

**And the proxy is off by default anyway:** `config.useServerProxy` is `undefined` unless `setUseServerProxy(true)` is called; grep finds no such call anywhere in `src/`. `.env.example`'s `REACT_APP_USE_SERVER_PROXY=true` is read only by [src/core/services/apiClient.js:15](src/core/services/apiClient.js#L15) — a **different module** that the OpenAI path never touches.

### C.3 Therefore the default path ships the OpenAI key to the browser

With `useServerProxy` falsy, `callOpenAI` takes the direct branch: [src/core/api/openaiApi.js:89-92](src/core/api/openaiApi.js#L89-L92) attaches `Authorization: Bearer ${config.apiKey}`, and `config.apiKey` is set from `process.env.REACT_APP_OPENAI_API_KEY` at [:64-66](src/core/api/openaiApi.js#L64-L66). CRA **inlines `REACT_APP_*` into the JS bundle at build time**, so the key ships to every client. The legacy fork does the same with `fetch` at [src/api/openaiApi.js:113-120](src/api/openaiApi.js#L113-L120), and [MapPage.js:223](src/pages/MapPage.js#L223) does it for the Google key.

This directly contradicts [ARCHITECTURE.md:202](ARCHITECTURE.md#L202) (*"Server-side API Proxying: API keys are never exposed to the client"*) and the README security claims. **For a game this is an absolute blocker** — an extractable API key on a client that will be distributed to players is a guaranteed budget-drain vector.

### C.4 Prompt structure and the JSON output contract

**Structure.** Every operation is a stateless two-message call: one `system` message containing a bullet list of desired JSON keys, one `user` message. There is **no multi-turn history**, no `assistant` turn, no few-shot example, no tool/function calling.

The intent prompt ([core:192-207](src/core/api/openaiApi.js#L192-L207)): `"You are a travel planning assistant that extracts travel intent from user queries. Extract the following information from the user's query and return as a JSON object: - arrival: destination location - departure: …"` and closes with `"If any field is not mentioned, use an empty string."`

The route prompt ([core:258-273](src/core/api/openaiApi.js#L258-L273)) enumerates 13 keys: `route_name, destination, duration, start_date, end_date, overview, highlights, daily_itinerary, estimated_costs, recommended_transportation, accommodation_suggestions, best_time_to_visit, travel_tips`.

**Contract enforcement.** `response_format: { type: "json_object" }` is set at [core:147](src/core/api/openaiApi.js#L147), [api:107](src/api/openaiApi.js#L107), and [openai.js:61](server/routes/openai.js#L61), [:144](server/routes/openai.js#L144), [:205](server/routes/openai.js#L205), [:283](server/routes/openai.js#L283). That guarantees *syntactically valid JSON*, nothing more.

**Parse handling — client:** bare `JSON.parse` with a swallow:
```js
// src/core/api/openaiApi.js:154-159
try { return JSON.parse(content); }
catch (parseError) { return { raw_content: content, error: 'JSON_PARSE_ERROR' }; }
```
The failure shape **violates the declared contract**. Downstream, [ChatPage.js:108-120](src/pages/ChatPage.js#L108-L120) passes that object straight to `navigate('/map', {state:{routeData}})`, and [MapPage.js:274](src/pages/MapPage.js#L274) reads `openaiRoute.route_name || \`${openaiRoute.destination} Trip\`` → `"undefined Trip"`. Not thrown, not logged to the user.

**Parse handling — server:** `JSON.parse(content)` with no local guard at [openai.js:68](server/routes/openai.js#L68), [:151](server/routes/openai.js#L151), [:212](server/routes/openai.js#L212), [:290](server/routes/openai.js#L290); the outer `catch` converts it to a 500 with `handleApiError`. So the same malformed model reply is *silently corrupted* on the direct path and *hard-500* on the proxy path.

**There is no schema validation anywhere.** No `ajv`, no `zod`, no `joi`, no JSON Schema, no `jsonschema` — none appear in `package.json` or as imports. The "validation" services present are: [server/utils/apiHelpers.js:93-131](server/utils/apiHelpers.js#L93-L131) `validateParams` (checks only `typeof` of top-level request fields) and [server/services/validationService.js](server/services/validationService.js) (dead, see B.3 #4).

**Prompt duplication.** The identical intent prompt is a string literal in **three** places ([core:192-207](src/core/api/openaiApi.js#L192-L207), [api:160-175](src/api/openaiApi.js#L160-L175), [openai.js:39-59](server/routes/openai.js#L39-L59)) and the route prompt in **three** ([core:258-273](src/core/api/openaiApi.js#L258-L273), [api:204-219](src/api/openaiApi.js#L204-L219), [openai.js:110-125](server/routes/openai.js#L110-L125)). Any prompt change is a 3-to-6-file edit with no registry, no versioning, no test.

### C.5 Streaming: **none**

There is no `stream: true`, no `stream_options`, no SSE handling, no `text/event-stream`, no `ReadableStream`, no `res.write`/`res.flush` in any OpenAI path. Every call is one blocking request/response with `max_tokens: 2500` and a 60-second ceiling. The `openai` SDK — which would give streaming for free — is unused. Highest-impact gap for a narrative engine.

### C.6 Retry / timeout / caching

| Layer | Timeout | Retries | Backoff |
|---|---|---|---|
| Client direct ([core:93](src/core/api/openaiApi.js#L93)) | 60000 ms | **0** | — |
| Client legacy ([api:113](src/api/openaiApi.js#L113)) | **none at all** (`fetch` with no `AbortController`, no signal) | **0** | — |
| Server ([apiHelpers.js:28](server/utils/apiHelpers.js#L28)) | 60000 ms | **0** | — |
| [src/core/services/apiClient.js:150-165](src/core/services/apiClient.js#L150-L165) | 30000 ms | 3, exponential `1000 * 2^(n-1)` | ✔ |

**The only retry logic in the repo is in a module the OpenAI path never uses.** `src/core/services/apiClient.js` has 6 importing files, **all of them beta-program**: [CodeRedemptionForm.jsx:20](src/features/beta-program/components/onboarding/CodeRedemptionForm.jsx#L20), [OnboardingFlow.jsx:17](src/features/beta-program/components/onboarding/OnboardingFlow.jsx#L17), [UserProfileSetup.jsx:21](src/features/beta-program/components/onboarding/UserProfileSetup.jsx#L21), [EmailService.js:7](src/features/beta-program/services/EmailService.js#L7), [PermissionsService.js:7](src/features/beta-program/services/PermissionsService.js#L7), [SurveyService.js:6](src/features/beta-program/services/SurveyService.js#L6) — plus the 10-line deprecated shim [src/services/apiClient.js](src/services/apiClient.js) and a `jest.mock` in [src/setupTests.js:40](src/setupTests.js#L40). **Zero importers on the LLM path.** So in practice: **zero retries, and on the legacy fork not even a timeout.**

**Caching.** Server-side only, via [server/middleware/caching.js](server/middleware/caching.js): `cacheMiddleware(3600000, 'openai:intent')` etc., key = `md5(req.originalUrl + JSON.stringify(req.body))` ([:16-20](server/middleware/caching.js#L16-L20)), stored in `memory-cache` — **in-process, non-shared across workers, lost on restart, no size cap** despite `MAX_CACHE_SIZE=50` in [server/.env.example](server/.env.example). Note it caches **POST** ([:31-33](server/middleware/caching.js#L31-L33)), which is unusual but intentional here.

Two consequences worth flagging:
1. **Determinism:** identical prompts return byte-identical cached responses for one hour. For a travel app that was a feature; for a game where two players ask the same question, it means they receive literally the same quest. This must be rethought, not inherited.
2. **Content-Type defect:** on a cache HIT the middleware does `res.send(cachedBody)` where `cachedBody` is a **string** ([:46-50](server/middleware/caching.js#L46-L50)). Express sets `Content-Type: text/html; charset=utf-8` for string bodies when no header was set, so a cache HIT is served as `text/html` rather than `application/json`. Axios v1's default `forcedJSONParsing` will still `JSON.parse` it, so the current client survives; a browser, `curl`, or any content-type-respecting consumer sees HTML. **[UNVERIFIED end-to-end]** — the server cannot boot in this tree (blocker 3), so I verified the mechanism by reading the middleware, not by observing a response.

### C.7 Key management — three parallel, mutually inconsistent systems

| System | File | Storage | Used by |
|---|---|---|---|
| 1. `KeyManager` | [server/utils/keyManager.js](server/utils/keyManager.js) | AES-256-GCM + scrypt for the ciphertext, but the key **store** is `this.keys = new Map()` ([:18](server/utils/keyManager.js#L18)) — **in-memory, never persisted**. Every restart destroys all keys. | **Nothing.** Grep: no importer outside `keyManager`'s own directory. (There is a `server/utils/keyManager.test.js`.) |
| 2. `VaultService` + `TokenProvider` | [server/utils/vaultService.js](server/utils/vaultService.js) (402) · [tokenProvider.js](server/utils/tokenProvider.js) (254) | Encrypted vault file plus a 5-minute in-memory token cache ([:18-19](server/utils/tokenProvider.js#L18-L19)); falls back to env vars when the vault has no secret ([:115-120](server/utils/tokenProvider.js#L115-L120)). | **The real path**: [apiKeyValidation.js:17](server/middleware/apiKeyValidation.js#L17) and [:41](server/middleware/apiKeyValidation.js#L41), consuming `req.openaiApiKey` / `req.googleMapsApiKey` at [openai.js:32](server/routes/openai.js#L32), [googlemaps.js:32](server/routes/googlemaps.js#L32). |
| 3. Raw `process.env` | [openaiClient.js:8](server/clients/openaiClient.js#L8) · [googleMapsClient.js:6](server/clients/googleMapsClient.js#L6) · [core openaiApi.js:64](src/core/api/openaiApi.js#L64) | plaintext env | the (mock) orphaned clients, and the browser direct path. |

Three concrete defects:
- **KeyManager is a decoy.** It looks like the secure system, is never used, and cannot persist. Anyone who "fixes" the app by wiring it up will lose every key on restart.
- **`TokenProvider.storeToken` is broken.** [tokenProvider.js:154](server/utils/tokenProvider.js#L154) declares `const secretType = vaultService.secretTypes.API_KEY;` and then reassigns it at [:157](server/utils/tokenProvider.js#L157) and [:159](server/utils/tokenProvider.js#L159) → `TypeError: Assignment to constant variable` whenever `serviceName` is `auth_jwt` or `data_encryption`. Also [:176](server/utils/tokenProvider.js#L176) calls `serviceName.replace(...)` inside the catch, which throws if `serviceName` is not a string.
- **Double validation per request.** `validateOpenAIApiKey` is mounted at [server.js:134](server/server.js#L134) *and* applied again inside the router at [openai.js:18](server/routes/openai.js#L18) (`router.use(validateOpenAIApiKey)`). Same for Maps ([server.js:135](server/server.js#L135) + [googlemaps.js:18](server/routes/googlemaps.js#L18)). Two vault lookups per call.

### C.8 Assessment: could this be repurposed as a game narrative/quest backend?

**Partly. ~50-60% of the skeleton is reusable; 0% of the prompts and 0% of the contracts.**

**What transfers directly:**
- The **route/error/caching/rate-limit scaffolding** of [server/routes/openai.js](server/routes/openai.js): `validateParams` → `createOpenAIClient(req.openaiApiKey)` → `response_format: json_object` → structured `handleApiError`, plus `openaiLimiter` and the KV-less cache. That's a correct server-side LLM proxy shape, and it correctly keeps the key off the client **when used**.
- The **vault → tokenProvider → middleware** key chain, including the env-var fallback that lets you run with zero infrastructure today.
- The **`LoadingProvider` + `NotificationContext` + `result → render` flow** of `ChatPage`, which is the right shape for "player acts, world responds".
- The **`RouteGenerator`/`RoutePreview`/`ItineraryBuilder`/`TravelPlanningWorkflow` state machine** as the quest-flow skeleton.

**What is missing, in priority order:**

| Gap | Why it blocks a narrative engine | Current state |
|---|---|---|
| **Streaming** | NPC dialogue and narration must appear token-by-token; a 60s blocking call with `max_tokens: 2500` is unplayable. | Absent entirely (§C.5) |
| **Schema validation + repair loop** | A game cannot render `{raw_content, error: 'JSON_PARSE_ERROR'}` into a scene. You need a schema and one repair retry. | Absent entirely; no validation library in the tree |
| **Determinism (seed)** | No `seed` param on any call, and temperatures 0.3/0.7/0.9 ([core:215](src/core/api/openaiApi.js#L215), [:292](src/core/api/openaiApi.js#L292), [:340](src/core/api/openaiApi.js#L340)). You cannot replay a session, A/B a quest, or debug a bad generation. | Absent; and the 1-hour POST cache actively fights variation |
| **Conversation/state persistence** | Every call is a fresh 2-message exchange. No history is stored client- or server-side. NPCs cannot remember anything. | Absent |
| **Tool / function calling** | Needed for "give the player an item", "advance the clock", "move the NPC" — structured side effects. | Absent; only `response_format: json_object` |
| **Prompt registry / versioning** | Prompts are literals duplicated 3-6× (§C.4). You cannot iterate on a narrative voice. | Absent |
| **Cost accounting per session** | `usage` **is** captured — [openai.js:71-75](server/routes/openai.js#L71-L75) builds `debugInfo: {model, usage, processing_time}` — but it is returned **to the client** and never persisted. Per-player/per-session budgets are impossible. | Half-present, discarded |
| **Content moderation / safety** | A travel app never needed it; an LLM-driven game with NPC dialogue does. | Absent |
| **Concurrency / queueing** | No request deduplication, no per-session serialisation, no queue. Concurrent player turns on the same world state will race. | Absent |
| **Prompt-injection defence** | The user string is interpolated raw into the prompt ([core:277](src/core/api/openaiApi.js#L277), [openai.js:129](server/routes/openai.js#L129)) with no delimiting or escaping. In a game, players *will* try to jailbreak the narrator. | Absent |
| **Retry on transient 429/5xx** | Zero retries anywhere on the LLM path (§C.6). A single rate-limit blip becomes a hung NPC turn. | Absent |

**Net:** treat [server/routes/openai.js](server/routes/openai.js) + [server/utils/apiHelpers.js](server/utils/apiHelpers.js) + [server/utils/tokenProvider.js](server/utils/tokenProvider.js) + [server/middleware/rateLimit.js](server/middleware/rateLimit.js) + [server/middleware/caching.js](server/middleware/caching.js) as a **reusable proxy chassis** (~1,100 LOC), and plan a ground-up rewrite of the prompt layer, the client API module, and the JSON contracts.

---

## D. Map / geodata capability

### D.1 What the frontend actually does — and it is almost nothing real

**Library:** `@react-google-maps/api` 2.20.6, installed. **Exactly one consumer:** [MapPage.js:3](src/pages/MapPage.js#L3) imports `{ GoogleMap, useLoadScript, Marker, InfoWindow }`. Loaded at [:222-225](src/pages/MapPage.js#L222-L225):

```js
const { isLoaded, loadError } = useLoadScript({
  googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "",
  libraries: ["places"],
});
```

The key is again inlined into the bundle (§C.3).

**Components actually rendered:** only `<GoogleMap>` ([:414](src/pages/MapPage.js#L414)), `<Marker>` ([:425](src/pages/MapPage.js#L425), [:440](src/pages/MapPage.js#L440), [:461](src/pages/MapPage.js#L461)) and `<InfoWindow>` ([:474](src/pages/MapPage.js#L474)). There is **no** `<DirectionsRenderer>`, `<Polyline>`, `<Autocomplete>`, `<StreetViewPanorama>`, `<HeatmapLayer>`, or `<DrawingManager>` anywhere in the repo.

**What is on the map is fabricated:**

| Claimed capability | Actual implementation | Evidence |
|---|---|---|
| Route display | Every marker is placed at `38.8977 + (Math.random() - 0.5) * 0.02, -77.0365 + (Math.random() - 0.5) * 0.02` — random jitter around the National Mall, re-randomised on every render. | [MapPage.js:428-429](src/pages/MapPage.js#L428-L429), [:435-436](src/pages/MapPage.js#L435-L436), [:443-444](src/pages/MapPage.js#L443-L444), [:450-451](src/pages/MapPage.js#L450-L451) |
| Route geometry | `displayRouteOnMap()` is `console.log('Displaying route on map')` with the comment *"In a real implementation, this would use the Google Maps Directions API"*. It is wired as the map's `onLoad` handler ([:419](src/pages/MapPage.js#L419)) — i.e. nothing happens. | [MapPage.js:351-354](src/pages/MapPage.js#L351-L354) |
| Nearby POIs | `getNearbyInterestPoints()` returns the hard-coded `mockNearbyPoints` array (3 Washington DC museums, [:157-197](src/pages/MapPage.js#L157-L197)). Comment: *"In a real implementation, this would use the Google Maps Places API"*. | [MapPage.js:357-361](src/pages/MapPage.js#L357-L361) |
| Transportation validation | `console.log('Validating transportation')`. Comment names the Directions API. Never called. | [MapPage.js:371-374](src/pages/MapPage.js#L371-L374) |
| Interest-point validation | `console.log('Validating interest points')`. Comment names the Distance Matrix API. Never called. | [MapPage.js:377-380](src/pages/MapPage.js#L377-L380) |
| Geocoding | `getCoordinatesFromLocation(locationName)` ignores its argument and returns random jitter. **Never called.** | [MapPage.js:500-506](src/pages/MapPage.js#L500-L506) |
| Split by day | `splitRouteByDay()` returns `routeData.travel_split_by_day` — the mock constant. Comment: *"In a real implementation, this would call the OpenAI API"*. | [MapPage.js:364-368](src/pages/MapPage.js#L364-L368) |
| Route data | `mockRouteData` — a hard-coded 3-day Washington DC itinerary, [:28-154](src/pages/MapPage.js#L28-L154). | [MapPage.js:218](src/pages/MapPage.js#L218) |
| Marker icon | Loads `http://maps.google.com/mapfiles/ms/icons/green-dot.png` over **plain HTTP** (mixed-content blocked on any HTTPS page). | [MapPage.js:465](src/pages/MapPage.js#L465) |

When real route data *is* passed from `ChatPage`, the transform at [:262-319](src/pages/MapPage.js#L262-L319) **invents the missing fields**: transportation is `['walk','taxi','bus','subway','bike'][random]` ([:322-325](src/pages/MapPage.js#L322-L325)), duration is `random*30+10` ([:327-329](src/pages/MapPage.js#L327-L329)), distance is `random*2+0.5` ([:331-333](src/pages/MapPage.js#L331-L333)), and `recommended_reason` is one of five randomly chosen template strings ([:339-348](src/pages/MapPage.js#L339-L348)). So even the "real" path is randomised fiction dressed as data.

**Bottom line: `MapPage` has a real basemap and 100% fake geography on top of it.**

### D.2 What the server actually does — real, and worth keeping

[server/routes/googlemaps.js](server/routes/googlemaps.js) (341 lines) mounts 6 **genuine** Google Maps Platform proxies under `/api/maps`, each a real axios call to `https://maps.googleapis.com/maps/api` ([apiHelpers.js:44](server/utils/apiHelpers.js#L44)) with the key injected server-side via `params.key` ([:46](server/utils/apiHelpers.js#L46)):

| Route | Upstream API | Line |
|---|---|---|
| `GET /api/maps/geocode` | Geocoding `/geocode/json` | [:25](server/routes/googlemaps.js#L25) |
| `GET /api/maps/nearby` | Places `/place/nearbysearch/json` | [:70](server/routes/googlemaps.js#L70) |
| `GET /api/maps/directions` | Directions `/directions/json` | [:134](server/routes/googlemaps.js#L134) |
| `GET /api/maps/place` | Places `/place/details/json` (rich `fields` list) | [:209](server/routes/googlemaps.js#L209) |
| `GET /api/maps/photo` | Places `/place/photo` (binary passthrough, correct `Content-Type`) | [:251](server/routes/googlemaps.js#L251) |
| `GET /api/maps/autocomplete` | Places `/place/autocomplete/json` | [:292](server/routes/googlemaps.js#L292) |

All six normalise the response into a flat shape, check `response.data.status !== 'OK'`, and route errors through `handleApiError`. Five are cached for an hour. **This is production-shaped code and the single best asset in the repo.**

### D.3 The client-side Maps library — two real defects plus a routing mismatch

[src/core/api/googleMapsApi.js](src/core/api/googleMapsApi.js) (761 lines) implements 8 operations with direct/proxy branches. Its only importers are [src/core/api/index.js:10](src/core/api/index.js#L10) and [src/tests/integration/apiStatus.test.js:2](src/tests/integration/apiStatus.test.js#L2) — **no UI consumes it.** (The `src/tests/api/googleMapsApi.test.js` and `mapFunctions.test.js` suites import the *legacy fork* `src/api/googleMapsApi.js`, not this file — see §B.3 #2.)

| Function | Line | Real mapping mechanism | Proxy path status |
|---|---|---|---|
| `loadGoogleMapsApi` | [:84](src/core/api/googleMapsApi.js#L84) | Injects `<script src="https://maps.googleapis.com/maps/api/js?key=…&libraries=places">` | n/a |
| `initializeMap` | [:138](src/core/api/googleMapsApi.js#L138) | `new google.maps.Map` | n/a |
| `geocodeAddress` | [:159](src/core/api/googleMapsApi.js#L159) | `google.maps.Geocoder` | `GET /maps/geocode` ✔ exists |
| `displayRouteOnMap` | [:206](src/core/api/googleMapsApi.js#L206) | `DirectionsService` + `DirectionsRenderer`, waypoint optimisation | `GET /maps/directions` ✔ exists |
| `getNearbyInterestPoints` | [:330](src/core/api/googleMapsApi.js#L330) | `google.maps.places.PlacesService.nearbySearch` | `GET /maps/nearby` — **sends `location`, server requires `lat`+`lng`** ✘ |
| `validateTransportation` | [:420](src/core/api/googleMapsApi.js#L420) | `DirectionsService` + `alternatives: true` | `POST /maps/validate-transportation` — **does not exist** ✘ |
| `validateInterestPoints` | [:505](src/core/api/googleMapsApi.js#L505) | `DistanceMatrixService`, filters by `maxDistance` km | `POST /maps/validate-interest-points` — **does not exist** ✘ |
| `calculateRouteStatistics` | [:608](src/core/api/googleMapsApi.js#L608) | Places `getDetails` per place, then **fabricated economics**: `price_level * 20`, accommodation `days * 100`, food `days * 50` ([:689](src/core/api/googleMapsApi.js#L689), [:707-710](src/core/api/googleMapsApi.js#L707-L710)) | n/a (no proxy branch) |

**Defect 1 — wrong parameter names.** [googleMapsApi.js:343-349](src/core/api/googleMapsApi.js#L343-L349) sends `{ location: locationParam, radius, type }`. [googlemaps.js:73-79](server/routes/googlemaps.js#L73-L79) validates `lat: {required: true, type: 'number'}` and `lng: {required: true, type: 'number'}`. `validateParams` throws `Missing required parameter: lat` ([apiHelpers.js:102-104](server/utils/apiHelpers.js#L102-L104)), which the route's catch turns into a 500. **Every proxied nearby-search fails.**

**Defect 2 — two proxy endpoints that were never built.** `/maps/validate-transportation` ([:427](src/core/api/googleMapsApi.js#L427)) and `/maps/validate-interest-points` ([:512](src/core/api/googleMapsApi.js#L512)) have no counterpart in [googlemaps.js](server/routes/googlemaps.js) → `404 {error:'API endpoint not found'}` from [server.js:153-155](server/server.js#L153-L155).

**Defect 3 — a silent logic bug in `validateInterestPoints`.** The `.filter()` at [:561](src/core/api/googleMapsApi.js#L561) drops points, then `.map()` at [:573](src/core/api/googleMapsApi.js#L573) re-indexes the *survivors* against the *original* `distances` array by `index`. Once any point is filtered out, every subsequent point gets another point's distance and duration attached. Even the direct path is wrong.

### D.4 Would any of it survive in an offline-capable 2.5D game?

**Short answer: essentially none of the client side; the server proxy survives as an optional online service.**

**Why the client side cannot survive:**
1. **`@react-google-maps/api` is a 2D slippy-map wrapper.** It renders raster tiles into a DOM container. There is no camera, no depth, no sprite/billboard system, no 3D transform — nothing to hang a 2.5D (isometric or 2.5D-billboard) presentation on. It is not a rendering substrate; it is a map widget.
2. **No offline path exists, by design and by licence.** [MapPage.js:222](src/pages/MapPage.js#L222) injects the Google Maps JS API from `maps.googleapis.com` at runtime. The Google Maps Platform Terms of Service prohibit caching or storing map tiles/content and prohibit using the Maps JS API with a non-Google map. So "offline-capable 2.5D game" and "Google Maps basemap" are mutually exclusive, and the current service worker ([public/service-worker.js](public/service-worker.js), 314 lines) cannot legitimately bridge that gap.
3. **`MapPage.js` is 610 lines of which the only reusable part is layout prose.** Roughly 480 lines are mock data and stubs ([MapPage.js:7-208](src/pages/MapPage.js#L7-L208) mock constants and config, [:261-397](src/pages/MapPage.js#L261-L397) transform/random helpers and stubs).
4. **`src/core/api/googleMapsApi.js` (761 lines) is unreferenced dead weight with three defects** (§D.3i-iii) whose live consumers do not exist.

**What to do instead:**

| Need | Replace with |
|---|---|
| 2.5D renderer | `three.js` / `@react-three/fiber` (or `pixi.js` for pure 2.5D) over a scene graph. Nothing in this repo contributes. |
| Basemap / world geometry | Locally bundled vector tiles or hand-authored scene geometry. Nothing in this repo contributes. |
| Geocoding ("where is this real place?") | Keep [server/routes/googlemaps.js](server/routes/googlemaps.js) `/api/maps/geocode` as an **online enrichment call**, cached, with a bundled offline gazetteer fallback. |
| POI discovery | Keep `/api/maps/nearby` and `/api/maps/place`, fixed per Defect 1. Seed the offline POI table at build time by running these once per destination. |
| Routing ("walk from A to B") | Keep `/api/maps/directions` for real-world legs, but the game's own movement/pathing should be a local A* over scene geometry, not a Google route. |
| Place photos | Keep `/api/maps/photo` (it handles the binary passthrough correctly). |
| Autocomplete | Keep `/api/maps/autocomplete`; it is the cheapest way to give players real-world destination entry. |

**Verdict on §D:** reuse `server/routes/googlemaps.js` **KEEP-AS-IS (2 fixes)**; delete `src/pages/MapPage.js`, both `googleMapsApi.js` files, and `@react-google-maps/api`. Budget for a from-scratch renderer.

---

## E. Dead weight

### E.1 `src/` composition

Measured with `Get-Content | Measure-Object -Line` over all non-`node_modules` files under each path.

| Subsystem | Files | LOC | % of `src/` |
|---|---|---|---|
| `src/features/beta-program/**` (beta program, analytics, survey, task prompts, UX audit, feedback, feature requests, community, onboarding, admin, RBAC) | 112 | **37,741** | **67.0%** |
| `src/tests/**` (frontend test tooling) + `src/setupTests.js` | 45 + 1 | **6,874** + 267 | **12.7%** |
| **Dead-weight subtotal** | **158** | **44,882** | **79.7%** |
| Travel product (see breakdown below) | 76 | 11,409 | 20.3% |
| **`src/` total** | **234** | **56,291** | 100% |

Let me show the arithmetic explicitly so it can be audited:

```
beta-program                    37,741
src/tests                        6,874
src/setupTests.js                  267
                                -------
dead weight subtotal            44,882   = 79.3% of 56,291
```

**Product-side breakdown (11,409 LOC):**

| Path | Files | LOC |
|---|---|---|
| `src/core/` (api + services + storage) | 15 | 3,139 |
| `src/features/travel-planning/` | 10 | 1,794 |
| `src/components/` | 14 | 1,608 |
| `src/pages/` | 6 | 1,419 |
| `src/styles/` | 6 | 1,007 |
| `src/api/` (deprecated forks — recommend DELETE, §B.3 #2) | 2 | 943 |
| `src/services/` (deprecated shims) | 8 | 541 |
| `src/features/{map-visualization,user-profile}/` (README-only placeholders) | 2 | 61 |
| `src/contexts/` | 4 | 412 |
| `src/config/` | 1 | 36 |
| `src/utils/` | 1 | 112 |
| root files (`App.js` 148, `index.js` 46, `reportWebVitals.js` 12, `API_MIGRATION.md` 82, `__mocks__/react-dom-client.js` 1) | 5 | 289 |
| `src/features/index.js` (broken, unreferenced) + `features/README.md` + `travel-planning/index.js` | 3 | 49 |
| **Total** | **77** | **11,409** |

**So: genuinely-but-not-entirely-dead weight is ~79% of `src/` by LOC and 158 of 234 files (68%) by count.**

### E.2 `src/tests/` in detail — most of it tests the dead subsystem

| Dir | Files | LOC | Tests what |
|---|---|---|---|
| `src/tests/components/` | 22 | 2,661 | 6 onboarding files, 5 analytics charts, survey, router, theme, timeline, api, **3 travel-planning** |
| `src/tests/beta-program/` | 6 | 1,014 | **all 6 are `.skip`** (task-prompt, ux-audit) |
| `src/tests/stability/` | 4 | 1,008 | 2 active (frontend + analytics) + 2 `.skip` |
| `src/tests/api/` | 4 | 940 | tests the **legacy forks**, not the live modules (§B.3 #2) |
| `src/tests/integration/` | 3 | 511 | apiStatus, routeGeneration, travel-planning-workflow |
| `src/tests/mocks/` | 2 | 338 | taskPromptMocks, uxAuditMocks — mocks for `.skip` tests |
| `src/tests/pages/` | 3 | 338 | ChatPage, MapPage, ProfilePage |
| **Total** | **45** | **6,874** | |

Plus **2,444 LOC of `.skip` files** already counted inside `src/tests/` and `src/services/`.

### E.3 Directories deletable with **zero product loss**

"Zero product loss" = nothing reachable from [src/index.js](src/index.js) or [server/server.js](server/server.js) breaks.

| Path | Files | LOC | Zero-loss justification |
|---|---|---|---|
| `src/features/beta-program/components/analytics/` | 17 | ~8,200 | Not routed. Consumers of `recharts`/`chart.js`/`react-chartjs-2`/`heatmap.js` live only here. |
| `src/features/beta-program/components/survey/` · `admin/` · `community/` · `feature-request/` · `feedback/` · `task-prompts/` · `user-testing/` · `ux-audit/` · `user/` | 45 | ~18,000 | None is reachable from `App.js`. `FeedbackWidget` pulls `html2canvas`; `UXHeatmap` pulls `heatmap.js`. All UNMET. |
| `src/features/beta-program/services/` (minus `AuthService`, `PermissionsService`) | 14 | ~4,300 | Only `AuthService` and `PermissionsService` are imported by `App.js`. `TaskPromptService` alone is 1,308 LOC. `AnalyticsService` + `services/analytics/` are 1,293 LOC. |
| `src/features/beta-program/pages/` · `layouts/` · `routes/` · `hooks/` | 12 | ~1,900 | `BetaRoutes.jsx` (97) is not used — `App.js` declares its own routes. |
| `src/features/beta-program/components/` (root-level leftovers) | 7 | ~2,700 | `BetaPortal.jsx` (471), `RegistrationForm.jsx` (366), `OnboardingFlow.jsx` (273) — reachable only via `BetaPortalPage` → `/beta`, which is `NavGuard`-gated and can be dropped. |
| **`src/tests/**`** | **45** | **6,874** | After deleting the subsystem, ~80% of these test nothing that exists. Keep only the travel-planning 3 (`components/travel-planning/`), `pages/` 3, `components/ui/Timeline` 1, `components/theme` 1, and the `api/` 4 after repointing them at `src/core/api/*` — 12 files of 45. |
| **`src/setupTests.js`** | 1 | 267 | Rebuild as a ~30-line file (jest-dom + next/fetch mocks). |
| **`server/coverage/`** | **24** | **12,014** | Committed generated coverage HTML/XML. Nothing reads it. |
| `tests/` (Playwright/k6/ZAP/BrowserStack) | 49 | 8,305 | None can execute (§A.6 #9). |
| `src/services/storage/*.test.js.skip` + all 13 `.skip` files | 13 | 2,444 | Already disabled; 3 of them are dead twins of live `core/` tests. |
| `scripts/` (orchestration scripts) | ~17 | ~2,900 | They orchestrate the dead suites. |
| `src/features/map-visualization/` · `user-profile/` | 2 | 61 | README-only placeholders whose exports in [src/features/index.js:11-16](src/features/index.js#L11-L16) point at non-existent files. |
| `src/api/` · `src/services/` (shims) | 10 | 1,484 | Deprecated forks and one-line re-export shims. `src/api/` is the more dangerous of the two (§B.3 #2). |
| `src/components/Navbar.js` · `Navbar.css` · `LoadingProvider.js` | 3 | 252 | Superseded duplicates with **zero** importers (verified by grep). |
| `src/pages/TimelineDemoPage.js` | 1 | 231 | Not routed; referenced only by itself. |
| `server/services/routeGenerationService.js` · `routeManagementService.js` · `server/models/RouteModel.js` · `server/clients/*` | 5 | 672 | Orphaned (referenced only by tests) and mock-backed (§B.3 #4). |
| `server/utils/keyManager.js` (+ its test) | 2 | 353 | Unused, non-persistent third key store (§C.7). |
| `docs/project_lifecycle/` | 60 | 15,048 | Process documentation for a project that stopped. Archive, don't delete — it is the only record of intent. |

**Grand total deletable with zero product loss: ~77,000 LOC**, of which ~12,000 is generated coverage HTML and ~15,000 is process docs.

### E.4 The one thing that is *not* zero-loss

`src/features/beta-program` is not purely dead — **`App.js` imports four things from it**, and `Navbar.jsx` a fifth:

- [App.js:4](src/App.js#L4) `PermissionsProvider` → `beta-program/contexts/PermissionsContext.js` (93)
- [App.js:7](src/App.js#L7) `NavGuard` → `beta-program/components/auth/index.js` → `NavGuard.jsx` (131)
- [App.js:8](src/App.js#L8) `authService` → `beta-program/services/AuthService.js` (303)
- [App.js:9-10](src/App.js#L9-L10) `permissionsService`, `ROLES` → `beta-program/services/PermissionsService.js` (176)
- [Navbar.jsx:20](src/components/common/Navbar.jsx#L20) `AuthButtons` → `beta-program/components/auth/` (276)

The auth subset is roughly **2,100-2,600 LOC**: `components/auth/` (8 files, ~1,078), `contexts/PermissionsContext.js` (93), `services/AuthService.js` (303), `services/PermissionsService.js` (176), `pages/VerifyEmailPage.jsx` (258), `pages/ResetPasswordPage.jsx` (303), plus `routes/BetaRoutes.jsx` (97) and `layouts/BetaLayout.jsx` (268) if you want the guard behaviour.

**Recommended sequence:** extract/rewrite auth (or replace it with a simple local profile, since a single-player travel sim does not need RBAC), *then* delete the remaining ~35,000 LOC. Do not delete first — `App.js` will not compile.

Also note the RBAC design is doing active harm to the product: [App.js:108-143](src/App.js#L108-L143) puts `/chat`, `/map`, `/profile` and `/beta` behind `NavGuard role={[ROLES.BETA_TESTER, …]}`, so **the travel app's own pages are unreachable without a beta invite code**.

---

## F. Copy-ready restart commands

All commands run with `workdir D:\All-Downloads\TourGuideAI` (PowerShell). `npm` here is 12.0.2 on Node v26.8.2.

### F.0 First, repair the install — nothing else works before this

```powershell
# Blocker 1 + 2 + 6 + 10: realign node_modules with package.json.
# 24 UNMET deps, 3 INVALID versions, and a postinstall that needs patch-package.
npm install
```

If `npm install` fails at postinstall (blocker 6), or you want a deterministic install:

```powershell
npm install --ignore-scripts
```
**Note:** `npm install` may not converge cleanly — `package-lock.json` (880,755 bytes) was written by an older npm and the tree contains three INVALID versions (`axios`, `chalk`, `glob`, §A.7). If it does not converge, delete `node_modules` and re-run; the lock will be rewritten. **This will modify `package-lock.json`** — back it up first (`Copy-Item package-lock.json package-lock.json.bak`) if you want to diff the change.

Do **not** run `npm ci` as the first step: it will fail on `patch-package` (missing) and cannot fix the phantoms.

### F.1 (a) Get a dev server running

```powershell
# Frontend dev server (CRA, port 3000 by default)
$env:BROWSER="none"; npm start
```

**Status: FAILS TODAY.** Observed error (verbatim, reproduces in seconds):

```
Failed to compile.

Module not found: Error: Can't resolve '@mui/icons-material/Menu' in 'D:\All-Downloads\TourGuideAI\src\components\common'
```

It fails until `npm install` (§F.0) puts `@mui/icons-material` in place. After that, expect the **next** failure from the remaining UNMET list (§A.7) — I could not enumerate it past the first error, because the compiler aborts there. **[UNVERIFIED beyond blocker 1.]**

**Backend dev server:**

```powershell
$env:PORT="3001"; node server/server.js     # or: npm run server
```

**Status: FAILS TODAY.** Observed error (verbatim):

```
Error: Cannot find module 'jsonwebtoken'
Require stack:
- D:\All-Downloads\TourGuideAI\server\utils\jwtAuth.js
- D:\All-Downloads\TourGuideAI\server\middleware\authMiddleware.js
- D:\All-Downloads\TourGuideAI\server\server.js
```

**Do not use `npm run dev` or `npm run dev:win`** ([package.json:45-46](package.json#L45-L46)): both are broken (blocker 13), and both would still fail on blocker 1.

**Combined, once repaired:**

```powershell
# Two terminals, or:
npx concurrently "npm start" "node server/server.js"
```
with the backend on a port other than 3000, since [server.js:245](server/server.js#L245) defaults to 3000 and would collide with CRA's dev server. Also create `.env` first — `Test-Path .env` → **False**:

```powershell
Copy-Item .env.example .env
Copy-Item server\.env.example server\.env
# then fill in: REACT_APP_GOOGLE_MAPS_API_KEY, OPENAI_API_KEY, JWT_SECRET, ENCRYPTION_KEY, KEY_SALT,
#               VAULT_BACKEND=local, VAULT_ENCRYPTION_KEY, VAULT_SALT, IMPORT_ENV_SECRETS=true
```
Both `.env` files are gitignored, so this is a local-only step.

### F.2 (b) Run the active test suite

**The only test command that produces real signal today:**

```powershell
npx jest --config=tests/config/jest/frontend.config.js --watchAll=false
```

**Status: RUNS, and 42% of suites fail.** Observed (verbatim):

```
Test Suites: 15 failed, 21 passed, 36 total
Tests:       27 failed, 154 passed, 181 total
Snapshots:   0 total
Time:        10.189 s, estimated 12 s
```

Failing suites (15):
```
src/tests/api/routeFunctions.test.js
src/components/Timeline/TimelineComponent.test.js
src/tests/components/analytics/HeatmapVisualization.test.js
src/tests/integration/travel-planning-workflow.test.js
src/tests/components/travel-planning/RoutePreview.test.js
src/tests/components/onboarding/setup.test.js
src/tests/components/onboarding/PreferencesSetup.test.js
src/tests/components/onboarding/WelcomeScreen.test.js
src/tests/components/onboarding/OnboardingFlow.test.js
src/tests/components/onboarding/CodeRedemption.test.js
src/tests/components/survey/SurveyList.test.js
src/tests/components/analytics/BetaProgramDashboard.test.js
src/tests/components/onboarding/UserProfileSetup.test.js
src/tests/components/travel-planning/ItineraryBuilder.test.js
src/tests/components/router/RouterStructure.test.js
```

Passing suites that cover the salvageable product (21) include `src/core/services/storage/{LocalStorageService,SyncService,CacheService}.test.js`, `src/core/services/RouteService.test.js`, `src/tests/api/{mapFunctions,openaiApi,googleMapsApi}.test.js`, `src/tests/pages/{ChatPage,MapPage,ProfilePage}.test.js`, `src/tests/integration/{apiStatus,routeGeneration}.test.js`, `src/tests/components/travel-planning/RouteGenerator.test.js`, `src/tests/components/theme/ThemeProvider.test.js`, both `src/tests/stability/` suites, and `src/tests/components/ui/Timeline.test.js`.

Representative failure — [ItineraryBuilder.test.js:353](src/tests/components/travel-planning/ItineraryBuilder.test.js#L353):
```
> 353 |     const accommodationInput = screen.getByDisplayValue('$450');
      |                                       ^
      at Object.getElementError (node_modules/@testing-library/dom/dist/config.js:37:19)
```
i.e. the cost editor renders no `$450` input — consistent with `RouteManagementService` throwing before the route ever loads (§B.3 #1).

**Commands that DO NOT work:**

```powershell
npm test
```
→ `react-scripts test` ([package.json:42](package.json#L42)). Uses CRA's internal Jest config, which **ignores** both [jest.config.js](jest.config.js) and the three `tests/config/jest/*.config.js` files, and depends on blocker 1. **Status: FAILS (same MUI error as `npm start`).**

```powershell
npx jest --listTests                      # or bare `npx jest`
```
→ **[VERIFIED]** prints `● Multiple configurations found: * jest.config.js * 'jest' key in package.json — Implicit config resolution does not allow multiple configuration files.` It happens to still list 36 tests, but the config it picks is not deterministic. Always pass `--config` explicitly.

```powershell
npx jest --config=tests/config/jest/backend.config.js     # matches server/**/*.test.js
npx jest --config=tests/config/jest/integration.config.js
```
→ Both **FAIL**: they need `supertest`, `mongoose`, `mongodb-memory-server`, `jsonwebtoken`, `bcrypt` — all UNMET (§A.7). Also, `backend.config.js` is not exposed through any `package.json` script that isn't already blocked.

```powershell
npm run test:smoke | test:cross-browser | test:integration* | test:user-journeys | test:load | test:security | test:stability* | test:analytics
```
→ **All FAIL.** `@playwright/test` UNMET; `tests/config/playwright/` does not exist ([tests/config/playwright.config.js:5](tests/config/playwright.config.js#L5)); `k6` is an external binary; `npm run test:stability` invokes `scripts/run-stability-tests.js`, which drives the same broken suites; `test:travel-planning` ([package.json:60](package.json#L60)) invokes `bash scripts/run-travel-planning-tests.sh` — bash on Windows.

```powershell
npm run test:travel-planning:components
```
→ `npx jest src/tests/components/travel-planning --config=tests/config/jest/frontend.config.js`. **Runs.** 2 of 3 suites fail (`RouteGenerator` passes; `ItineraryBuilder` and `RoutePreview` fail). This is the closest thing to a product-level test gate that works.

### F.3 (c) Produce a production build

```powershell
npm run build
# equivalently: npx react-scripts build
# for the dead analyzer path: npm run analyze   (see A.2 — does nothing)
```

**Status: FAILS TODAY.** Observed error (verbatim, background job, exit code 1):

```
Creating an optimized production build...
Browserslist: browsers data (caniuse-lite) is 19 months old. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme
Failed to compile.

Module not found: Error: Can't resolve '@mui/icons-material/Menu' in 'D:\All-Downloads\TourGuideAI\src\components\common'
```

It completes in seconds — **it is not slow.** The `caniuse-lite` staleness warning is cosmetic and unrelated. After `npm install` (§F.0), rerun; the result is **[UNVERIFIED]** beyond this first blocker. Note the pre-existing `build/` directory is a stale stub, not a prior success (§A.6 #11) — do not mistake it for evidence that a build once worked in this tree.

```powershell
npm run deploy:cdn:dry-run
```
→ **FAILS**, independently: [scripts/deploy-to-cdn.js:98-102](scripts/deploy-to-cdn.js#L98-L102) exits 1 with `Static directory not found` (there is no `build/static/`), and it `require`s `aws-sdk` (UNMET) via [cdnManager.js:10](server/utils/cdnManager.js#L10).

### F.4 Which commands FAIL today — summary

| Command | Status | Observed error |
|---|---|---|
| `npm start` | **FAIL** | `Can't resolve '@mui/icons-material/Menu'` in `src\components\common` |
| `npm run build` | **FAIL** | same |
| `npm test` | **FAIL** | same (CRA test also needs the module graph) |
| `npm run server` / `node server/server.js` | **FAIL** | `Cannot find module 'jsonwebtoken'` (stack: `server/utils/jwtAuth.js` → `authMiddleware.js` → `server.js`) |
| `npm run dev` / `dev:win` | **FAIL** | inherits both; plus bash-syntax / port-collision issues |
| `npm install` / `npm ci` | **UNVERIFIED** | expected to hit 24 UNMET deps and the `patch-package` postinstall |
| `npx jest --listTests` | **WARNS** | `Multiple configurations found` (still lists 36 files) |
| `npx jest --config=tests/config/jest/frontend.config.js` | **PARTIAL** | 15/36 suites fail, 27/181 tests fail |
| `npm run test:travel-planning:components` | **PARTIAL** | 2 of 3 suites fail |
| `npm run test:backend` / `test:frontend` / `test:integration` | **FAIL** | missing `supertest`, `mongoose`, `mongodb-memory-server`, `@playwright/test` |
| `npm run test:smoke` / `test:cross-browser` / `test:user-journeys` / `test:load` / `test:security` | **FAIL** | `@playwright/test` UNMET; `tests/config/playwright/` absent; k6 external |
| `npm run analyze` | **NO-OP** | `ANALYZE=true` is never read (react-scripts ignores `webpack.config.js`) |
| `npm run deploy:cdn:dry-run` | **FAIL** | `Static directory not found`; `aws-sdk` UNMET |
| `docker build -f deployment/production/Dockerfile.frontend .` | **FAIL** | missing `nginx-frontend.conf` and `.env.production` |

---

## G. Supplementary findings requested in the brief

### G.1 `.cursor/` — what Cursor rules and context exist

Six files, 1,880 LOC, all of it project-management scaffolding. **None of it is code-relevant, and one entry is actively misleading.**

| File | Lines | Content |
|---|---|---|
| [.cursor/.project](.cursor/.project) | 445 | OKR tracker: Phases 1-4, all marked `[X] COMPLETED`. Lists the 3 pages, their `element_id`s and required function names (`user_route_generate`, `map_real_time_display`, `get nearby interest point`, `user_route_split_by_day`, `user_route_transportation_validation`, `user_route_interest_points_validation`, `route_statics`, `rank_route`). Claims *"Secure API key management system implemented with rotation and encryption"* and *"Server-side API proxy endpoints created for all external services"* — **contradicted by §C.2/C.3: the proxy is unreachable and the key ships to the browser.** |
| [.cursor/.todos](.cursor/.todos) | 675 | Phase 1 task checklist, every item `[X]`. Confirms the intent→render pipeline was the original spec. |
| [.cursor/.milestones](.cursor/.milestones) | 202 | Phase milestones 1-4, all `COMPLETED`. Phase 4 includes *"Create offline capabilities"* and *"Develop error handling framework / Build fallback mechanism / Implement retry strategy"* — **retry exists only in an unused module (§C.6); offline exists only as a service worker over a live Google Maps load (§D.4).** |
| [.cursor/.workflows](.cursor/.workflows) | 312 | A genuine phase-workflow runbook: OKR discipline (milestones → project → todos), documentation-inventory scans, naming conventions (`project.phase#-[focus]-plan.md`), explicit code-review sessions, cross-referencing between plan files. **This is the most reusable non-code artifact in the repo** — it is a workable process description. |
| [.cursor/rules/project-workflow-check.mdc](.cursor/rules/project-workflow-check.mdc) | 15 | `alwaysApply: false`, no globs. Tells the agent to read `.workflows` at phase boundaries, obey `docs/project_lifecycle/knowledge/project.lessons.md`, verify files exist before creating new ones, keep `.project`/`.milestones`/`.todos` in sync, and "if you are confused to choose which method, just try one, when fail switch to another way". |
| [.cursor/rules/thinking-protocols.mdc](.cursor/rules/thinking-protocols.mdc) | 231 | `alwaysApply: false`, no globs. A 231-line "thinking protocol" mandating an inner-monologue format (`<cursor_thinking_protocol>` with `initial_engagement`, `multiple_hypotheses_generation`, `recursive_thinking`, etc.), including the instruction to write in "natural phrases such as 'Hmm…', 'Wait, let me think about…'". **Zero engineering content — it dictates reasoning style, not code.** It also can never fire: `alwaysApply: false` with empty `globs` means it is never attached to any file. |

**Verified observation:** `docs/project_lifecycle/knowledge/` contains exactly one file, `project.lessons.md` (17,057 bytes) — referenced by [project-workflow-check.mdc:11](.cursor/rules/project-workflow-check.mdc#L11) as a "must-obey" source. **The rest of the `docs/project_lifecycle/` tree (60 files, 15,048 LOC) is plans/records/references for a process that produced the code in §E.**

> **Post-recon move (not part of the audit above).** After this audit was written, the
> project owner directed that all planning/research artefacts for the reboot be
> consolidated under `docs/handOff/`. This report, `recon-2.5d-game-research.md`,
> `gap-analysis-and-plan.md` and the fetched licence evidence were therefore moved
> there. `docs/project_lifecycle/knowledge/project.lessons.md` is a pre-existing
> repository file and was deliberately left in place, because `README.md`,
> `CONTRIBUTING.md`, `SECURITY.md` and `src/features/**/README.md` link to it at
> that path.

### G.2 `scripts/deploy-to-cdn.js` and `deployment/` — real or aspirational?

**Aspirational.** The code is real and non-trivial, but the path has never run and cannot run in this tree.

**What is genuinely implemented:**
- [scripts/deploy-to-cdn.js](scripts/deploy-to-cdn.js) (198 lines) — MD5 content-hash cache-busting filenames ([:49-54](scripts/deploy-to-cdn.js#L49-L54), [:145](scripts/deploy-to-cdn.js#L145)), content-type + cache-control mapping ([:120-137](scripts/deploy-to-cdn.js#L120-L137)), batched uploads of 5 ([:171-180](scripts/deploy-to-cdn.js#L171-L180)), CloudFront invalidation ([:186-191](scripts/deploy-to-cdn.js#L186-L191)), and a genuine dry-run mode that overrides config with an obviously-fake distribution (`TEST123456`, `https://test-cdn.tourguideai.com`, [:64-80](scripts/deploy-to-cdn.js#L64-L80)).
- [server/config/cdn.js](server/config/cdn.js) (74), [server/utils/cdnManager.js](server/utils/cdnManager.js) (199), [server/services/cdnService/](server/services/cdnService/) (4 files, 777 LOC) — a real S3/CloudFront service with an asset processor and cache manager.
- [deployment/production/](deployment/production/) — a real multi-stage Dockerfile pair, a 143-line `docker-compose.yml`, a 182-line zero-downtime `deploy.sh` with health-check gating and backups, a 150-line `nginx.conf`, `prometheus.yml`, and CloudWatch alarms.

**Why it is aspirational:**
1. No `build/static/` exists, so [deploy-to-cdn.js:98-102](scripts/deploy-to-cdn.js#L98-L102) exits 1 immediately.
2. `aws-sdk` is UNMET ([cdnManager.js:10](server/utils/cdnManager.js#L10)) and `glob@^10.4.5` is installed at 7.2.3 (`npm ls` → `invalid`). The script cannot even load.
3. No S3 bucket, no CloudFront distribution ID, no AWS credentials, no `REACT_APP_CDN_URL` anywhere — every CDN path in [server/config/cdn.js](server/config/cdn.js) is env-driven and unset.
4. `NODE_ENV=production` gates the CDN middleware and static serving ([server.js:48-52](server/server.js#L48-L52), [:158-168](server/server.js#L158-L168)), and `build/` is a three-file stub.
5. [Dockerfile.frontend:22](deployment/production/Dockerfile.frontend#L22) COPYs a `nginx-frontend.conf` that does not exist, and [:12](deployment/production/Dockerfile.frontend#L12) a `.env.production` that does not exist.
6. The GitHub Actions pipeline that would drive all of it ([.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml), 797 lines) begins with `npm ci` (blocker 2/6) and then runs `npm test` (blocker 1).

**Verdict:** DELETE the whole deployment surface for the restart. It encodes a five-environment, multi-cloud production topology for an app that cannot currently produce a `build/` directory. If the game needs a CDN later, the hash-naming scheme in [deploy-to-cdn.js:145](scripts/deploy-to-cdn.js#L145) is the one idea worth carrying forward.

### G.3 The two `src/api/*` "duplicates" — direct answer to the brief's question

Asked: *"note: these look like DUPLICATES of src/core/api/*; confirm whether they differ."*

**Confirmed: they differ substantially, and they are not re-exports.** Full detail in §B.3 #2. Summary:

| | `src/api/openaiApi.js` | `src/api/googleMapsApi.js` |
|---|---|---|
| Lines | 348 | 639 |
| Has `export * from '../core/…'`? | Yes, at [:9](src/api/openaiApi.js#L9) — **but every name is shadowed by a local re-declaration, so it is inert** | **No** |
| Independent implementation? | Yes, 8 functions | Yes, 11 functions |
| Has `setUseServerProxy`? | **No** | **No** |
| Has `apiBaseUrl` / `useServerProxy` config? | **No** | **No** |
| Transport | `fetch` ([:113](src/api/openaiApi.js#L113)) with **no timeout** | `fetch` |
| `splitRouteByDay` JSON contract | `time/activity/location/duration/transportation/cost/notes` | (n/a) |
| Normalized diff vs core | 190 lines only here, 276 lines only in core | — |
| Imported by the app? | **No** — [ChatPage.js:4](src/pages/ChatPage.js#L4) uses core | **No** — nothing imports it |
| Imported by tests? | **Yes** — [openaiApi.test.js:1](src/tests/api/openaiApi.test.js#L1), [routeFunctions.test.js:8](src/tests/api/routeFunctions.test.js#L8) | **Yes** — [googleMapsApi.test.js:1](src/tests/api/googleMapsApi.test.js#L1), [mapFunctions.test.js:106](src/tests/api/mapFunctions.test.js#L106) |

**The tests exercise the dead forks; the app runs the live core modules.** That single fact explains a large fraction of "too many bugs" and is the strongest argument for deleting `src/api/` outright.

### G.4 Other verified defects worth carrying into the rewrite

| Defect | Evidence | Impact |
|---|---|---|
| `ItineraryBuilder` reorder is a stub | [ItineraryBuilder.js:434-441](src/features/travel-planning/components/ItineraryBuilder.js#L434-L441) — a `↕` button with no `onClick`, under a "Drag to reorder activities" heading ([:302-306](src/features/travel-planning/components/ItineraryBuilder.js#L302-L306)) | Advertised feature is absent. `react-beautiful-dnd` was clearly intended here and never wired. |
| `ItineraryBuilder.handleAddActivity` mutates state in place | [ItineraryBuilder.js:111-115](src/features/travel-planning/components/ItineraryBuilder.js#L111-L115) — `const updatedItinerary = [...route.daily_itinerary]` then `updatedItinerary[dayIndex].activities.push(...)` mutates the **shared nested object** | React state mutation; edits can leak across renders. Same pattern at dozens of sites in this file. |
| `validateInterestPoints` cross-wires distances | [googleMapsApi.js:561-589](src/core/api/googleMapsApi.js#L561-L589) — `.filter()` then `.map((point, index) => distances[index])` after re-indexing | Every surviving point after the first removal gets the wrong distance/duration. |
| `getStatus()` reports configured on the proxy path even when it cannot work | [core openaiApi.js:412-419](src/core/api/openaiApi.js#L412-L419) — `isConfigured: !!config.apiKey \|\| config.useServerProxy`; [ApiStatus.js](src/components/ApiStatus.js) renders it | The status widget tells the player "configured" for a request path that 404s (§C.2). |
| `ChatPage` double-fetches intent | [ChatPage.js:108-111](src/pages/ChatPage.js#L108-L111) calls `recognizeTextIntent` then `generateRoute`, and `generateRoute` **internally calls `recognizeTextIntent` again** ([core:252](src/core/api/openaiApi.js#L252)) | 3 LLM calls where 2 suffice — and on the proxy path, 2 intent calls plus 1 route call. Doubles latency and cost on the primary user action. |
| `MapPage` re-randomises markers on every render | [MapPage.js:428-429](src/pages/MapPage.js#L428-L429) etc. — `Math.random()` inside JSX | Markers jump on each state change (e.g. every marker click). |
| Localhost-only CORS/connect-src in production helmet config | [server.js:78-79](server/server.js#L78-L79) — `connectSrc: ["'self'", "http://localhost:3000", "ws://localhost:3000"]` | Would break any real deployment; only works in local dev. |
| Mixed-content marker icon | [MapPage.js:465](src/pages/MapPage.js#L465) — `http://maps.google.com/...` | Blocked on HTTPS. |
| `Navbar` wraps `AuthButtons` in try/catch | [Navbar.jsx:53-64](src/components/common/Navbar.jsx#L53-L64) | Evidence the beta auth chain was known to throw on render. |
| Dev-only invite-code generators | [server.js:171-216](server/server.js#L171-L216) — `/dev/generate-invite`, `/dev/list-invites` | Gated on `NODE_ENV !== 'production'`; if that env var is ever unset in prod, anyone can mint invite codes. |
| `react-dom-client` mock is an empty file | [src/__mocks__/react-dom-client.js](src/__mocks__/react-dom-client.js) — 1 byte | A Jest mock that resolves to `undefined`. |

---

## H. Bottom line for the restart

**Reusable, ~4,500 LOC worth extracting:**
- [server/routes/googlemaps.js](server/routes/googlemaps.js) (341) — real geodata proxy, 2 fixes
- [server/routes/openai.js](server/routes/openai.js) (301) — LLM proxy chassis, prompts rewritten
- [server/utils/vaultService.js](server/utils/vaultService.js) + [tokenProvider.js](server/utils/tokenProvider.js) + [apiHelpers.js](server/utils/apiHelpers.js) + [logger.js](server/utils/logger.js) + [middleware/rateLimit.js](server/middleware/rateLimit.js) + [middleware/caching.js](server/middleware/caching.js) — ~1,300 LOC of working infrastructure
- [src/core/services/storage/](src/core/services/storage/) (862: LocalStorageService 224 + CacheService 364 + SyncService 267 + index 7) — offline/cache/sync
- [src/features/travel-planning/components/](src/features/travel-planning/components/) (1,171: ItineraryBuilder 574 + RoutePreview 237 + RouteGenerator 197 + TravelPlanningWorkflow 154 + index 9, excluding the two broken services) — as UI skeletons
- [src/components/Timeline/](src/components/Timeline/) (559) + [src/contexts/](src/contexts/) (412)
- [.cursor/.workflows](.cursor/.workflows) (312) — process, not code

**Must be rewritten from scratch:** every prompt and JSON contract; the client LLM module; the 2.5D renderer and all map presentation; auth/identity; the 4 broken client→server endpoint contracts.

**Delete on day one:** `src/features/beta-program/` minus auth, `src/tests/` minus 12 files, `src/api/`, `src/services/`, `tests/` (all of it), `server/coverage/`, `server/clients/`, the three orphaned server services + `RouteModel`, `server/utils/keyManager.js`, `deployment/`, most of `scripts/`, and the dead-file set in §E.3. **~77,000 LOC, of which ~12,000 is generated coverage HTML.**

**The three findings that should change the plan:**
1. **The safety net is attached to the wrong module.** All four API tests target `src/api/*` (the dead forks) while the app runs `src/core/api/*`. Any "the tests pass, so it works" reasoning about this codebase is invalid (§B.3 #2, §G.3).
2. **There is no server-side route-generation backend.** The services that look like one are mock-backed, mounted nowhere, and referenced only by tests (§B.3 #4). The real LLM path is browser → `https://api.openai.com/v1/chat/completions` with the key in the bundle (§C.3).
3. **The travel product is unreachable and the map is fiction.** `/chat`, `/map`, `/profile` sit behind a beta-invite `NavGuard` ([App.js:108-143](src/App.js#L108-L143)), the 1,794-LOC travel-planning feature is not routed at all (§B.3 #3), and `MapPage`'s geography is `Math.random()` around the National Mall (§D.1). There is less working product here than the file counts suggest — which is good news: there is also less to unwind.

---

*Report generated by reading files and running commands against `D:\All-Downloads\TourGuideAI` at HEAD `5bf20fd`. No source file was modified; this document is the only file written. Items marked **[UNVERIFIED]** are stated as limitations, not conclusions.*
