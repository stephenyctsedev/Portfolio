# Homepage Catches Up With the Résumé Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The homepage shows the same 12 expertise items and the two newest projects as the PDF, generated from the Resume repo, with the projects' GitHub links rendered as real links.

**Architecture:** Fix the LaTeX parser so an experience entry's repo link becomes an optional `link` field, render it on the homepage, point IE Favorites > Portfolio at My Pictures, then re-run the existing `npm run sync-resume` to regenerate `resume.json` and copy the PDF.

**Tech Stack:** Node ESM scripts, Vitest + jsdom, vanilla JS.

**Spec:** `docs/superpowers/specs/2026-11-15-homepage-resume-sync-design.md`

## Global Constraints

- Never hand-edit `src/data/resume.json`; it changes only through `npm run sync-resume`.
- Never edit the Resume repo (`../Resume`).
- Entries without a repo link keep exactly their current parsed shape (no `link` key).
- The phone number stays out of `resume.json` (sync default, no `--include-phone`).
- Titles come from the Resume repo as they are ("Personal Project: TransactionChecker", "Personal Project: ObsidianMCP"); do not rename.
- Do not touch the P2 wording items or the P3 items.
- Never commit or push unless Stephen says so. Commit steps are checkpoints: ask first, then commit with the repo's `type: summary` style and the session's attribution lines.

## Review Focus

- A `\textbullet` with an `\href` that is not `http(s)://` must not become a `link` (the homepage opens these in a new tab). Pinned in Task 1.
- An `\href` with no `\textbullet` separator leaves `company` exactly as today and creates no `link`. Pinned in Task 1.
- A link label containing `\_` or other escapes is unescaped, and the homepage HTML-escapes both href and label. Pinned in Tasks 1 and 2.
- Favorites > Portfolio must never call `openExternal` and must land in My Pictures. Pinned in Task 3.
- After the sync the phone number is still absent from `resume.json`, and tests that read the old data (readme text, experience counts) still pass or are updated for the new data. Pinned in Task 4.

---

### Task 1: Parser extracts the project link

**Files:**
- Modify: `scripts/tex-parse.mjs` (`parseExperience`, ~lines 95-111)
- Test: `scripts/tex-parse.test.mjs`

**Interfaces:**
- Produces: each `parseExperience(tex)` entry is `{ period, title, company, bullets, link? }` where `link` is `{ href: string, label: string }` and only exists when the company argument is `<company> \textbullet\ \href{<http(s) url>}{<label>}`.

- [ ] **Step 1: Write the failing tests** in `scripts/tex-parse.test.mjs`, a new `describe('experience links')` using inline TeX (the fixtures stay as they are). Helper: `const entry = (company) => \`\\expEntry{2025 -- Present}{Personal Project: X}{${company}}{\\item did a thing}\``.
  - `splits the repo link out of the company line`: `parseExperience(entry('Self-Directed, Winnipeg, Canada \\textbullet\\ \\href{https://github.com/o/x}{github.com/o/x}'))[0]` has `company: 'Self-Directed, Winnipeg, Canada'` and `link: { href: 'https://github.com/o/x', label: 'github.com/o/x' }`.
  - `unescapes the link label`: label `github.com/o/my\_repo` gives `label: 'github.com/o/my_repo'`.
  - `ignores non-http links`: `\\href{javascript:alert(1)}{x}` after the bullet gives no `link` key.
  - `leaves company alone when there is no bullet separator`: company `Acme \\href{https://a.b}{a.b}` gives `company: 'Acme a.b'` (today's output) and no `link` key.
  - `entries without a link are unchanged`: the existing fixture's `parseExperience(files['experience.tex'])[0]` has no `link` property.
- [ ] **Step 2: Run** `npx vitest run scripts/tex-parse.test.mjs`. Expected: the first two and the third FAIL (no `link`); the "unchanged" ones pass.
- [ ] **Step 3: Implement.** In `parseExperience`, if the raw company argument contains `\textbullet`, split at the first one: the text before goes through `unescapeLatex` as `company`; match `\\href\{(https?:\/\/[^}]+)\}\{([^}]*)\}` in the text after and, if found, set `link = { href, label: unescapeLatex(label) }`. If there is no `\textbullet`, behave exactly as before.
- [ ] **Step 4: Run** `npx vitest run scripts/tex-parse.test.mjs`. Expected: PASS.
- [ ] **Step 5: Checkpoint commit** (ask first): `feat: parse an experience entry's repo link into a link field`.

### Task 2: Homepage renders the link

**Files:**
- Modify: `src/xp/apps/Homepage.js` (experience rows, ~line 33)
- Test: `src/xp/apps/Homepage.test.js`

**Interfaces:**
- Consumes: `job.link?: { href, label }` from Task 1's data shape.
- Produces: no new exports.

- [ ] **Step 1: Write the failing tests** in `Homepage.test.js`, using `{ ...resume, experience: [job] }` with `job = { period: '2025 – Present', title: 'Personal Project: X', company: 'Self-Directed, Winnipeg, Canada', link: { href: 'https://github.com/o/x', label: 'github.com/o/x' }, bullets: ['did a thing'] }`:
  - `shows a job's repo link after the company as a new-tab link`: html contains `<i>Self-Directed, Winnipeg, Canada</i>` and `<a href="https://github.com/o/x" target="_blank" rel="noopener">github.com/o/x</a>`.
  - `escapes the link href and label`: with `href: 'https://a.b/?q="x"'` and `label: '<b>'`, html contains `&quot;` and `&lt;b&gt;` and not `<b>` inside the anchor.
  - `renders jobs without a link exactly as before`: `renderHomepage({ ...resume, experience: [{ ...job, link: undefined }] }, opts)` contains `<i>Self-Directed, Winnipeg, Canada</i><ul>` (no anchor between).
- [ ] **Step 2: Run** `npx vitest run src/xp/apps/Homepage.test.js`. Expected: the first two FAIL.
- [ ] **Step 3: Implement** in `Homepage.js`: after `<i>${esc(job.company)}</i>`, when `job.link` is set, append ` &middot; ` plus the existing `external(job.link.href, job.link.label)` helper (it already escapes and sets `target="_blank" rel="noopener"`).
- [ ] **Step 4: Run** `npm test`. Expected: all pass (the IE click handler already routes external links through `openExternal`).
- [ ] **Step 5: Checkpoint commit** (ask first): `feat: show a project's repo link on the homepage`.

### Task 3: Favorites > Portfolio opens My Pictures

**Files:**
- Modify: `src/xp/apps/InternetExplorer.js` (the `favorites` array inside `openInternetExplorer`)
- Test: `src/xp/apps/InternetExplorer.test.js`

**Interfaces:**
- Produces: `export function buildFavorites({ resume, repoUrl, registry, openExternal, goHome }): Array<{ label?: string, action?: () => void, separator?: true }>` in `InternetExplorer.js`. `openInternetExplorer` builds its Favorites menu from it (`goHome` is the existing `load`).

- [ ] **Step 1: Write the failing tests** in `InternetExplorer.test.js`, a new `describe('buildFavorites')` with fakes `registry = { launch: vi.fn() }`, `openExternal = vi.fn()`, `goHome = vi.fn()` and the real `resume`:
  - `Portfolio opens My Pictures in Explorer and never goes off-site`: find the item labelled `Portfolio`, call `action()`; expect `registry.launch` toHaveBeenCalledWith(`'explorer'`, `{ path: \`${PATHS.myDocuments}\\My Pictures\` }`) (import `PATHS` from `../../data/filesystem.js`) and `openExternal` not called.
  - `the other favourites are unchanged`: `Homepage` calls `goHome`; `Resume (PDF)` calls `registry.launch('reader')`; `LinkedIn` calls `openExternal(resume.contact.linkedin)`; `Source on GitHub` calls `openExternal(repoUrl)`.
- [ ] **Step 2: Run** `npx vitest run src/xp/apps/InternetExplorer.test.js`. Expected: FAIL, `buildFavorites` is not exported.
- [ ] **Step 3: Implement** `buildFavorites` with the same items and order as today's `favorites` array, changing only Portfolio's action to `registry.launch('explorer', { path: \`${PATHS.myDocuments}\\My Pictures\` })`; import `PATHS` from `../../data/filesystem.js`; replace the inline array with `const favorites = () => buildFavorites({ resume, repoUrl, registry, openExternal, goHome: load })`.
- [ ] **Step 4: Run** `npm test`. Expected: all pass.
- [ ] **Step 5: Checkpoint commit** (ask first): `fix: make IE Favorites > Portfolio open My Pictures instead of this site`.

### Task 4: Sync the data and PDF, document, verify

**Files:**
- Modify (generated): `src/data/resume.json`, `public/resume/resume-main.pdf`
- Modify: `README.md`; any test whose expectation depended on the old data

**Interfaces:**
- Consumes: Tasks 1-3.

- [ ] **Step 1: Run the sync.** `npm run sync-resume` from the worktree root. Expected output: `ok  src/data/resume.json — 6 jobs, phone excluded` and `ok  public/resume/resume-main.pdf — from resume-main.pdf, <n> KB`. (It runs `git fetch origin preview` inside `../Resume`; read-only.)
- [ ] **Step 2: Check the generated data.** In `src/data/resume.json`: `expertise` has 12 entries ending `"Docker"`, `"Claude Code"`; `experience[0].title` is `Personal Project: TransactionChecker` with a `link`; `experience[1].title` is `Personal Project: ObsidianMCP` with a `link`; there is no `"phone"` key (`grep -c '"phone"' src/data/resume.json` prints `0`).
- [ ] **Step 3: Run** `npm test`. Expected: all pass. For any test that fails only because it encoded the old data (for example an experience count or the old Wix portfolio URL), update that expectation to the new data and note it in the ledger; a failure that is not about data is a real bug: stop and debug.
- [ ] **Step 4: README.** Add to the Setup/Content section: the homepage and PDF are generated from the Resume repo; to update, push the Resume repo, wait for its CI to refresh `origin/preview`, then run `npm run sync-resume` and commit `src/data/resume.json` and `public/resume/resume-main.pdf` together.
- [ ] **Step 5: Run** `npm run build`. Expected: succeeds.
- [ ] **Step 6: Verify in a real browser** (`npx vite --port 5199 --strictPort`, Playwright, `?mode=flat&open=resume`). Expected: the IE homepage's Experience section starts with "Personal Project: TransactionChecker" (2025 – Present) followed by "Personal Project: ObsidianMCP" (2026), each with a clickable GitHub link; its bullets mention IMAP IDLE, Docker and Tailscale; Expertise lists 12 items including Docker and Claude Code; clicking a project link opens a new tab (not inside the iframe); the About Me / Experience / Contact nav links still scroll; Favorites > Portfolio opens My Pictures. Stop the dev server afterwards.
- [ ] **Step 7: Checkpoint commit** (ask first), including the spec and this plan: `feat: sync the homepage and PDF from the Resume repo`.
