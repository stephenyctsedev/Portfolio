# "Skip the room — View résumé" entry (P1-2)

Status: awaiting approval. Size: small change.

## Intent and why

A recruiter or hiring manager in a hurry lands on the 3D room and sees nothing that says
"résumé", so they may leave before finding the content. Add one obvious, plainly worded
control on the first screen that takes them straight to the résumé, and make `?mode=flat`
a public, documented entry instead of a hidden one.

## Goals

- A visible "Skip the room — View résumé" link from the very first paint of the room page,
  usable even while the BIOS loading overlay is still up.
- One click ends with the résumé on screen: flat desktop, Internet Explorer open on the homepage.
- The link is a real, shareable URL (`?mode=flat&open=resume`).

## Non-goals / anti-goals

- No change to what phones and small screens get today (they already fall into flat mode
  automatically and still see an empty desktop). Possible follow-up, not part of this.
- Do not touch the room's teardown path or its existing HUD behaviour. A failure here must
  never break the 3D room, BIOS, XP desktop, Minesweeper, video player or PlayCanvas link.
- No new résumé page and no new copy of the content; the IE homepage already renders from `resume.json`.
- No retro jargon in the label; a first-time visitor must understand it at a glance.

## Constraints

- Room mode builds its UI in `src/room/mount.js`; the black `.room-loading` overlay
  (`z-index: 10`) covers the HUD until the first frame, so the link must sit above it.
- Flat mode (`mountFlat` in `src/main.js`) calls `desktop.powerOn()`; the boot takes ~6 s
  (BIOS, logo, welcome) and each stage is skippable only by a click today.
- Existing tests (295) must keep passing.

## Approaches considered

1. **Link reloads into flat mode with a flag (chosen).** Real `<a href="?mode=flat&open=resume">`.
   Simplest, bookmarkable, publishes `?mode=flat`, and the room never loads on that visit.
   Cost: a page reload for someone who clicks after the room has loaded.
2. **Switch in place, no reload.** Tear down the room and mount flat in the same page.
   No reload, but `mount.js` shows room teardown is delicate, and it puts the 3D room at risk.
3. **Static link in `index.html`.** Works even without JavaScript, but splits the UI across two
   places; creating the link from `main.js` before the room's dynamic import is already immediate.

## Design (as decided)

- `src/main.js` creates the link synchronously at startup, before `mountRoom` runs, but only in
  room mode (flat visitors are already on the fast path). It is appended to `#app` as its own
  element, outside `.room` / `.room-hud`, so room teardown and the HUD code are untouched.
- Placement: top-left, `z-index` above `.room-loading`; styled to match `.room-btn`.
  Label: "Skip the room — View résumé →".
- Flat mode reads `open=resume`. When present it skips the BIOS/logo/welcome sequence (my call)
  and, once the desktop is up (`booted`), launches Internet Explorer on the homepage.
  Without the flag, `?mode=flat` behaves exactly as it does now.
- Boot skip is an option on the boot/desktop layer (for example `fastBoot`), not a rewrite of the timings.
- `track('site_mode', ...)` keeps working; add one analytics event for the skip click.
- README mentions `?mode=flat` and `?mode=flat&open=resume`.

## Left to the builder

- Exact styling and the markup for the link.
- Where the `fastBoot` option plugs into `createBoot` / `createDesktop`.
- Test layout (unit tests for the flag parsing and the boot option; real-browser check of the click path).
