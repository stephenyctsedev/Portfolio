# Homepage catches up with the résumé (P1-1)

Status: awaiting approval. Size: small change.

## Intent and why

The homepage is generated from the Resume repo (`../Resume`, branch `main`) by `npm run sync-resume`.
It was last synced on 2026-09-10, so it still ends its timeline at a supermarket job and shows 10
expertise items while the PDF shows 12 and two recent technical projects. Someone who only reads the
homepage concludes the technical work stopped years ago. Bring the homepage back in line with the
PDF, and keep it generated from the same source so the two cannot drift again.

## Goals

- Homepage Expertise has the same 12 items as the PDF (adds Docker, Claude Code).
- Homepage Experience shows the two newest entries first, with the Resume repo's current titles:
  "Personal Project: TransactionChecker" (2025 – Present; Python, IMAP IDLE, Docker, Tailscale) and
  "Personal Project: ObsidianMCP" (2026).
- The projects' GitHub links render as proper, clickable links, not as text glued to the company name.
- `public/resume/resume-main.pdf` is refreshed from the Resume repo's `origin/preview` so the PDF and
  the homepage come from the same commit.

## Non-goals / anti-goals

- Do not edit the Resume repo, and do not hand-edit `src/data/resume.json` (it is generated).
- Do not rename the project to "Home Automation & Finance Sync"; the fix list used a title from an older PDF.
- Do not touch the P2 wording items (tense, "Innoduction", "window phone") or the phone number (P3-4):
  their source of truth is the Resume repo's `.tex` files.
- Do not break the homepage nav fix or the skip-room link from the earlier commits.

## Constraints

- `buildResume()` output must still pass `validateResume()`; the existing 306 tests must keep passing.
- The phone number stays excluded from `resume.json` (the sync's default).
- The sync also changes `contact.portfolio` from the old Wix URL to this site's URL. `contact.portfolio`
  is used in one place, IE's Favorites > Portfolio, which would then open the page the visitor is already on.

## Approaches considered

1. **Re-sync from the Resume repo and fix the parser (chosen).** One source of truth; small parser change.
2. **Rename the project in the Resume repo first.** Edits another repo and needs its CI to rebuild the PDF; not wanted.
3. **Hand-add the entries to `resume.json`.** Overwritten by the next sync, so the drift returns.

## Design (as decided)

- `scripts/tex-parse.mjs` `parseExperience`: split the company argument at `\textbullet`. The part before
  it stays `company`; an `\href{url}{label}` after it becomes an optional `link: { href, label }`.
  Entries without a link are unchanged (no `link` key), so the other four jobs keep their exact output.
- `src/xp/apps/Homepage.js`: when a job has `link`, show it after the company as an external link (new tab,
  `rel="noopener"`), which the IE click handler already routes through `openExternal`.
- IE Favorites > Portfolio opens My Pictures in Explorer (the same target as the homepage's "Projects" link)
  instead of the portfolio URL. (My call: this site is the portfolio, so linking to it would be a no-op.)
- Run `npm run sync-resume` (defaults: branch `main`, no phone) to regenerate `resume.json` and copy the PDF.
- README: one line saying the homepage is generated, with the sync command and the order (push Resume, wait for its CI, then sync).

## Left to the builder

- Exact markup and styling of the project link line.
- Whether any existing test asserts the old Wix portfolio URL and needs its expectation updated.
- Test layout: parser unit tests for linked and unlinked entries, a Homepage render test for the new entries, a Favorites test.
