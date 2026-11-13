# Google Analytics (GA4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track visits and key interactions (apps opened, outbound links, 3D-room vs flat mode) with GA4 on the deployed site only.

**Architecture:** A small `src/analytics.js` factory loads Google's `gtag.js` only in production builds and exposes a never-throwing `track(name, params)`. `createDesktop` takes `track` as an option and exposes it on the shell context; the app registry reports `app_open` at its single launch seam, and `openExternal` is wrapped to report `external_link`.

**Tech Stack:** Vite 8 (vanilla JS modules), vitest + jsdom, GA4 `gtag.js`.

**Spec:** `docs/superpowers/specs/2026-11-12-google-analytics-design.md`

## Global Constraints

- Measurement ID is exactly `G-MB5F6MLB8Q`.
- Analytics is active only when `import.meta.env.PROD` is true; dev server and vitest must never load Google's script or send events.
- No personal data and no free-text input in events: Run-dialog commands are never sent; `mailto:` links report host `mailto`, never the address.
- Event names/params are exactly: `app_open {app_id, path?, slug?}`, `external_link {host}`, `site_mode {mode: 'room'|'flat'}`.
- No cookie banner.
- Existing tests must keep passing unchanged (the new `track` option defaults to a no-op).
- Do not commit or push until Stephen says so (global rule).

## Review Focus

1. Ad-blocked or throwing `gtag` — `track` must never throw into app code (covered in Task 1).
2. Run dialog with an unknown command (e.g. `cmd`, `foo`) — no `app_open` is sent (Task 2).
3. Explorer payload carries `owner` (a window object) — only `path`/`slug` may reach GA (Task 2).
4. `mailto:` link — host is `mailto`, the email address is never sent (Task 3).
5. Relative `pdfHref` (`/Portfolio/resume/resume-main.pdf`) passed to `openExternal` — must not throw while computing the host (Task 3).

---

## File Structure

- Create `src/analytics.js` — GA loader + `track`; one responsibility: talk to gtag safely.
- Create `src/analytics.test.js`
- Modify `src/xp/apps/registry.js` (+ `registry.test.js`) — emit `app_open`.
- Modify `src/xp/createDesktop.js` (+ `createDesktop.test.js`) — `track` option, `ctx.track`, wrapped `openExternal`.
- Modify `src/main.js` — init analytics, pass `track`, send `site_mode`.
- Modify `README.md` — short "Analytics" section.

### Task 1: Analytics module

**Files:**
- Create: `src/analytics.js`
- Test: `src/analytics.test.js`

**Interfaces:**
- Produces:
  - `createAnalytics({ id: string, enabled: boolean, doc?: Document, win?: Window }): { init(): void, track(name: string, params?: object): void }`
  - `export const { init: initAnalytics, track } = createAnalytics({ id: 'G-MB5F6MLB8Q', enabled: import.meta.env.PROD })`

- [ ] **Step 1: Write failing tests** in `src/analytics.test.js` (each builds a fresh `document`/`window` via the `doc`/`win` args or resets `document.head` and `window.dataLayer`/`window.gtag`):
  - `'does nothing when disabled'`: `enabled:false`, `init()` then `track('x')` → no `script[src*="googletagmanager"]` in head, `window.dataLayer` undefined.
  - `'init injects gtag.js and configures the id'`: `enabled:true, id:'G-TEST'` → one script with `src === 'https://www.googletagmanager.com/gtag/js?id=G-TEST'` and `async`; `Array.from(dataLayer[0])[0] === 'js'`; `Array.from(dataLayer[1])` equals `['config', 'G-TEST']`.
  - `'init is idempotent'`: calling `init()` twice → still one script.
  - `'track sends an event after init'`: `track('app_open', {app_id:'sol'})` → last `dataLayer` entry as array equals `['event','app_open',{app_id:'sol'}]`.
  - `'track before init sends nothing'`.
  - `'track never throws'` (Review Focus 1): after `init()`, replace `window.gtag` with a function that throws; `expect(() => track('x')).not.toThrow()`.

- [ ] **Step 2: Run** `npx vitest run src/analytics.test.js` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement** `src/analytics.js` per the interface. Standard gtag bootstrap: `win.dataLayer ||= []`, `win.gtag = function () { win.dataLayer.push(arguments); }` (must push the `arguments` object, not an array), then `gtag('js', new Date())`, `gtag('config', id)`, then append the async script to `doc.head`. `track` wraps its call in try/catch and is a no-op unless enabled and initialised.

- [ ] **Step 4: Run** `npx vitest run src/analytics.test.js` — Expected: all PASS.

### Task 2: `app_open` from the registry

**Files:**
- Modify: `src/xp/apps/registry.js` (`launch`)
- Test: `src/xp/apps/registry.test.js`

**Interfaces:**
- Consumes: `ctx.track?: (name: string, params?: object) => void` (optional; absent in existing tests).
- Produces: `registry.launch(id, payload)` calls `ctx.track?.('app_open', { app_id: id, path?, slug? })` only when `id` is a registered app, before running the launcher. `path` and `slug` are included only when they are strings in `payload`; nothing else from `payload` is sent.

- [ ] **Step 1: Write failing tests** appended to `registry.test.js`:
  - `'reports app_open for registered apps'`: ctx with a `track` spy; launch `'notepad'` with `{title:'a.txt'}` → spy called once with `('app_open', {app_id:'notepad'})` (title not sent).
  - `'includes only path and slug from the payload'` (Review Focus 3): launch `'explorer'` with `{path:'C:\\X', owner:{}, junk:1}` → `{app_id:'explorer', path:'C:\\X'}`; launch `'viewer'` with `{slug:'coin-pusher', index:0, slideshow:true}` → `{app_id:'viewer', slug:'coin-pusher'}`.
  - `'does not report unknown ids'` (Review Focus 2): launch `'cmd'` → spy not called (the "cannot find" dialog still shows).
  - `'works when ctx has no track'`: the existing tests already cover this and must still pass.

- [ ] **Step 2: Run** `npx vitest run src/xp/apps/registry.test.js` — Expected: new tests FAIL.

- [ ] **Step 3: Implement** the change inside `launch` in `registry.js` using optional call `ctx.track?.(...)`.

- [ ] **Step 4: Run** `npx vitest run src/xp/apps/registry.test.js` — Expected: all PASS.

### Task 3: `createDesktop` wiring and `external_link`

**Files:**
- Modify: `src/xp/createDesktop.js` (options destructuring at the `createDesktop` signature; `ctx` construction)
- Test: `src/xp/createDesktop.test.js`

**Interfaces:**
- Consumes: registry from Task 2 reading `ctx.track`.
- Produces:
  - `createDesktop(rootEl, { ..., track = () => {} })`; `ctx.track` is that function, so `registry.launch` reports `app_open`.
  - The `openExternal` option is wrapped: every call (including the Start menu E-mail item and `ctx.openExternal`) first calls `track('external_link', { host })`, then the original. `host` is `'mailto'` for `mailto:` URLs; otherwise `new URL(url, location.href).host`, falling back to `'unknown'` if parsing throws.

- [ ] **Step 1: Write failing tests** in `createDesktop.test.js` using the existing `mount` pattern with a `track` spy and `openExternal` spy:
  - `'reports app_open when an app launches'`: `desktop.ctx.registry.launch('iexplore')` → `track` called with `('app_open', {app_id:'iexplore'})`.
  - `'reports external_link with the host only'`: `desktop.ctx.openExternal('https://github.com/stephenyctsedev/XPcomputer')` → `track('external_link', {host:'github.com'})` and the raw `openExternal` spy called with the full URL.
  - `'never sends the email address'` (Review Focus 4): `desktop.ctx.openExternal('mailto:me@example.com')` → `track('external_link', {host:'mailto'})`; assert no call's params contain `'me@example.com'`.
  - `'handles a relative pdf href'` (Review Focus 5): `desktop.ctx.openExternal('/Portfolio/resume/resume-main.pdf')` does not throw; `track` called with an object having a string `host`.

- [ ] **Step 2: Run** `npx vitest run src/xp/createDesktop.test.js` — Expected: new tests FAIL; existing tests pass.

- [ ] **Step 3: Implement.** Rename the destructured option to `openExternal: openExternalRaw`, add `track = () => {}`, define a local `openExternal` wrapper plus a small `linkHost(url)` helper, and add `track` to `ctx`. All existing internal uses of `openExternal` (Start menu E-mail, ctx) now go through the wrapper automatically.

- [ ] **Step 4: Run** `npx vitest run src/xp/createDesktop.test.js` — Expected: all PASS.

### Task 4: App wiring, README, verification

**Files:**
- Modify: `src/main.js`
- Modify: `README.md` (new short "Analytics" section near "Build and deploy")

**Interfaces:**
- Consumes: `initAnalytics`, `track` from `src/analytics.js`; `createDesktop`'s `track` option.

- [ ] **Step 1: Implement in `main.js`.** Import `{ initAnalytics, track }`; call `initAnalytics()` before `createDesktop`; pass `track` in the `createDesktop` options; send `track('site_mode', { mode })` with the mode actually used — `'room'` after `mountRoom` succeeds, `'flat'` in `mountFlat` (this covers the fallback when the room fails to start).

- [ ] **Step 2: Document in README.** Short section: what is tracked (the three events), that it is production-only, where the Measurement ID lives (`src/analytics.js`), and how to check it (GA4 → Reports → Realtime).

- [ ] **Step 3: Run full suite** `npm test` — Expected: all tests pass, none skipped or newly failing.

- [ ] **Step 4: Run build** `npm run build` — Expected: succeeds. Then `grep -rl "G-MB5F6MLB8Q" dist/` — Expected: at least one built JS file listed. Also confirm `grep -rl "googletagmanager" src/` lists only `src/analytics.js` and its test.

- [ ] **Step 5: Stop.** Report results to Stephen and ask before committing or pushing. After deploy, Stephen opens the live site and checks GA4 Realtime.

---

## Self-review notes

- Spec coverage: loader (Task 1), `app_open` (2), `external_link` + wiring (3), `site_mode`, README, build/ID check (4). Non-goals (no banner, no PII) are in Global Constraints and tested via Review Focus 3–4.
- Names consistent across tasks: `createAnalytics`, `initAnalytics`, `track`, `ctx.track`, `linkHost`.
- `main.js` has no unit tests today; its wiring is verified by build output and Stephen's Realtime check.
