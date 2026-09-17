# All Programs Flyout Hover Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Start > All Programs and its submenus reachable with the mouse. Today the flyout opens 200px away, past the right-hand column, and closes the instant the pointer touches that column on its way there.

**Architecture:** Two changes inside `src/xp/StartMenu.js`, each with its own tests in `src/xp/StartMenu.test.js`. **Task 1** opens every flyout beside the column or flyout it comes from, as Windows XP does, so the pointer moves straight from an item into its flyout. **Task 2** adds XP's menu delay (400 ms): a flyout that is already open only closes or switches once the pointer has rested elsewhere, so cutting across a neighbouring item on a diagonal is harmless; opening from nothing and clicking stay instant. **Task 3** checks both with a real mouse in flat mode and in the 3D room, and records the QA items.

**Tech Stack:** Plain JavaScript DOM, Vitest 5 + jsdom (fake timers), Vite dev server.

**Spec:** `docs/superpowers/specs/2026-09-07-xp-computer-portfolio-design.md` §5.4 (Start menu contents, unchanged by this plan). This is a defect-repair plan. The Start menu was built in `docs/superpowers/plans/2026-09-07-phase1-xp-shell-and-resume.md` and has behaved this way since it landed in `b74c188`.

## Global Constraints

- Start menu contents, labels, icons, keyboard handling (Escape, arrow keys over the top-level items) and the `startmenu:toggle` event are unchanged.
- A flyout's vertical placement (`panel.style.bottom`) is unchanged.
- Opening a flyout when none is open at that level stays instant. The delay applies only to closing or switching a flyout that is already open. Clicking always acts at once.
- No CSS changes and no new dependencies.
- Files are UTF-8. The working tree checks files out with CRLF line endings (`core.autocrlf=true`); edit with a tool that keeps them.
- **Never `git commit` or `git push` unless Stephen says so.** "Stage" steps run `git add` only.

---

## Evidence Behind This Plan

Measured in Chrome on `?mode=flat` (1024x768 screen scaled to 0.9635) before writing, so the executor does not have to re-derive any of it. Positions are in the Start menu's own unscaled pixels, the unit `panel.style.left` uses.

### Root cause

1. **The flyout is anchored to the wrong box.** `src/xp/StartMenu.js:60` places flyouts from the width of the *whole Start menu*: `rootEl.offsetWidth - 4` for All Programs, `rootEl.offsetWidth + level * 190` below it. Nothing about the item that opened the flyout goes into its horizontal position.
2. **There is no hover grace.** `src/xp/StartMenu.js:81-82` call `clearFlyouts(0)` on the very first `mouseenter` of any Start menu element other than All Programs, and `:51-52` do the same one level down, switching or clearing the submenu at once. The right-hand column is one of those elements, and it is exactly what the pointer has to cross.

| Box | Left | Right |
|---|---|---|
| Left column `.xp-sm-left` | 0 | 199 |
| All Programs button (its ▸ ends at about 190) | 3 | 196 |
| Right column `.xp-sm-right` | 199 | 398 |
| All Programs flyout today, `left: 396px` | 396 | 586 |
| Games submenu today, `left: 590px` | 590 | 780 |

From the button's right edge to the flyout is 200px, all of it right-hand column.

### Reproduction, current code

A capture-phase `mouseenter` logger plus a `MutationObserver` on `.xp-sm-flyouts`, pointer moved from All Programs straight right:

```text
enter .xp-sm-item.xp-sm-allprograms "All Programs▸"
  + flyout level 0
enter .xp-sm-right
  - flyout level 0 REMOVED
```

Control: jumping the pointer straight onto the flyout, skipping the column, keeps it open, and hovering Games opens its submenu normally. The column crossing is the only trigger.

### Moving the flyout alone is not enough

With the flyout moved beside the column by hand (`left: 195px`), a diagonal from the middle of All Programs toward Accessories leaves the button through its top edge. Pinball's row sits directly on top of All Programs' row with no gap:

```text
enter .xp-sm-item "Pinball"
  - flyout level 0 REMOVED
```

One level down, with the Games submenu open, a diagonal from Games toward Minesweeper crosses Accessories first. The Games submenu is replaced by `[Notepad]` at once, and the pointer arrives on bare desktop.

### The proposed placement leaves no gap

With flyouts at `left: 195px` and `381px`, `document.elementFromPoint` sampled every half pixel along the All Programs row reads `All Programs → flyout border → Internet Explorer`, and along the Games row reads `Games → submenu border → Solitaire`. Nothing else is hit on either path.

### A prototype of this plan's final code

The `StartMenu.js` this plan produces, mounted as a second Start menu in the same page (real CSS, real Chrome pointer events):

```text
PATH 1  the reported path: All Programs, then straight right
        enter "All Programs", + flyout0 left=195px, enter flyout0 panel, enter "Internet Explorer"   (nothing removed)
PATH 2  All Programs up-right to Accessories, clipping Pinball
        enter "Pinball", 19 ms later enter flyout0 panel, enter "Accessories", + flyout1 [Notepad] left=381px   (nothing removed)
PATH 3  rest on Games, then up-right to Minesweeper, clipping Accessories
        402 ms after entering Games: flyout1 becomes [Minesweeper, Pinball, Solitaire]
        enter "Accessories", 33 ms later enter flyout1 panel, enter "Minesweeper"; 1 s later both flyouts still open
PATH 4  rest on My Computer
        enter .xp-sm-right, enter "My Computer": both flyouts still open; 402 ms later both removed
```

Every test below was also run red then green against the current code and against each task's result; the failure messages quoted in the steps are copied from those runs. Baseline before this plan: `npm test` gives 38 files, 251 tests, all passing.

---

## File Structure

| File | Change |
|---|---|
| `src/xp/StartMenu.js` | Task 1: flyouts open beside their column or parent flyout. Task 2: `MENU_DELAY_MS`, delayed close/switch, click opens a folder at once, `close()` drops a pending change |
| `src/xp/StartMenu.test.js` | New `Start menu flyouts` suite: placement, crossing, resting, diagonal submenu, click, close |
| `README.md` | Manual QA checklist entry |

---

### Task 1: Open each flyout beside the thing it opens from

**Files:**
- Modify: `src/xp/StartMenu.js:60`
- Test: `src/xp/StartMenu.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: a flyout's `style.left` is `beside.offsetLeft + beside.offsetWidth - 4`, where `beside = anchorEl.closest('.xp-sm-flyout, .xp-sm-left')`, meaning the left column for All Programs and the parent flyout for a submenu. Also the test suite `describe('Start menu flyouts')` with helpers `item(label)`, `flyout(level)`, `labels(level)` and `enter(...els)`, which Task 2 adds tests to.

- [ ] **Step 1: Write the failing test**

In `src/xp/StartMenu.test.js`, change the first line from:

```js
import { describe, it, expect, beforeEach } from 'vitest';
```

to:

```js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
```

Then append this block at the end of the file, after the existing `describe('Start menu keyboard')`:

```js
describe('Start menu flyouts', () => {
  let menu, root;
  const item = (label) => [...root.querySelectorAll('.xp-sm-item')].find((b) => b.querySelector('.xp-sm-label').textContent === label);
  const flyout = (level) => root.querySelector(`.xp-sm-flyout[data-level="${level}"]`);
  const labels = (level) => [...(flyout(level)?.querySelectorAll('.xp-sm-label') ?? [])].map((l) => l.textContent);
  // A real pointer fires a non-bubbling mouseenter on each element it newly enters, outermost first.
  const enter = (...els) => els.forEach((el) => el.dispatchEvent(new MouseEvent('mouseenter')));

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="sm"></div>';
    root = document.querySelector('#sm');
    const noop = () => {};
    menu = createStartMenu(root, {
      userName: 'Stephen',
      left: [{ label: 'Pinball', icon: 'pinball', action: noop }],
      right: [{ label: 'My Computer', icon: 'computer', action: noop }],
      allPrograms: [
        { label: 'Accessories', icon: 'folder', children: [{ label: 'Notepad', icon: 'notepad', action: noop }] },
        { label: 'Games', icon: 'folder', children: [{ label: 'Minesweeper', icon: 'mine', action: noop }, { label: 'Solitaire', icon: 'cards', action: noop }] },
        { label: 'Internet Explorer', icon: 'ie', action: noop },
      ],
      onLogOff: noop, onTurnOff: noop,
    });
    menu.open();
  });
  afterEach(() => {
    menu.close();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('opens All Programs beside the left column, and each submenu beside the flyout it came from', () => {
    // jsdom has no layout: give the boxes the widths Chrome measures, and let a flyout's offsetLeft follow its style.
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function () {
      if (this.classList.contains('xp-startmenu')) return 400;
      if (this.classList.contains('xp-sm-left')) return 199;
      if (this.classList.contains('xp-sm-flyout')) return 190;
      return 0;
    });
    vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function () { return parseFloat(this.style.left) || 0; });
    enter(item('All Programs'));
    expect(flyout(0).style.left).toBe('195px');
    enter(flyout(0), item('Games'));
    expect(flyout(1).style.left).toBe('381px');
  });
});
```

Why the stubs: jsdom does no layout, so every `offsetWidth` and `offsetLeft` is 0. The stubs give the boxes the widths Chrome measures (see Evidence) and make a flyout's `offsetLeft` follow the `left` the code just set, which is what a browser does. `.xp-startmenu` gets its real 400 so the current code fails with its real number. Labels in the fixture are unique on purpose, so `item(label)` can never pick the wrong row.

- [ ] **Step 2: Run the test and watch it fail**

```bash
npx vitest run src/xp/StartMenu.test.js
```

Expected: 1 failed, 2 passed. The new test fails with `AssertionError: expected '396px' to be '195px'`, meaning the flyout still opens past the right-hand column. Both keyboard tests pass.

- [ ] **Step 3: Anchor the flyout to its column or parent flyout**

In `src/xp/StartMenu.js:60`, inside `showFlyout`, change:

```js
    panel.style.left = `${level === 0 ? rootEl.offsetWidth - 4 : rootEl.offsetWidth + level * 190}px`;
```

to:

```js
    const beside = anchorEl.closest('.xp-sm-flyout, .xp-sm-left');
    panel.style.left = `${beside.offsetLeft + beside.offsetWidth - 4}px`;
```

Leave the `bottom` line below it alone. Why layout offsets rather than the `getBoundingClientRect()` maths the `bottom` line uses: `.xp-sm-left` and every `.xp-sm-flyout` have the Start menu as their `offsetParent`, so their offsets are already in the same unscaled pixels as `style.left`. They stay exact under the flat stage's `scale()` and under the room's CSS3D transform, with no correction needed. The 4px overlap is the one the old code used against the menu's right edge.

- [ ] **Step 4: Run the tests and make sure they pass**

```bash
npx vitest run src/xp/StartMenu.test.js
```

Expected: 3 passed.

- [ ] **Step 5: Look at it**

```bash
npm run dev
```

Open `http://localhost:5173/Portfolio/?mode=flat`, click through the boot, open Start and hover All Programs. The flyout's left border sits against the right end of the All Programs button and covers most of the right-hand column, with Run... hidden behind it, as in XP. Hover Games: its submenu opens touching the All Programs flyout's right edge. The ▸ arrows on All Programs and Games stay visible. Moving *straight* right from All Programs now reaches the flyout. Diagonal moves can still close it; that is Task 2.

- [ ] **Step 6: Stage**

```bash
git add src/xp/StartMenu.js src/xp/StartMenu.test.js
```

---

### Task 2: Give open flyouts XP's menu delay

**Files:**
- Modify: `src/xp/StartMenu.js`: the import at the top, the `let isOpen` line, `clearFlyouts` and the start of `showFlyout`, the All Programs `mouseenter` listener, the two column `mouseenter` listeners, and `close()`
- Test: `src/xp/StartMenu.test.js`

**Interfaces:**
- Consumes: Task 1's `describe('Start menu flyouts')` suite and its helpers `item(label)`, `flyout(level)`, `labels(level)`, `enter(...els)`.
- Produces: `export const MENU_DELAY_MS = 400` from `src/xp/StartMenu.js`. Private to `createStartMenu`: `hoverTimer`, `anchors` (where `anchors[level]` is the item whose flyout is open at that level), `cancelHover()`, `afterHover(fn)`, `hoverOpener(items, level, anchorEl)` and `hoverElsewhere(level)`. Nothing outside `StartMenu.js` uses them.

The rules this task implements:

| The pointer enters... | Effect |
|---|---|
| An item whose flyout is already open | Cancel any pending change |
| An item with a flyout, with nothing open at that level | Open it now (as today) |
| An item with a flyout, with a different one open at that level | Switch after `MENU_DELAY_MS` |
| Anything else in the two columns, or a plain item inside a flyout | Close the flyouts from that level up, after `MENU_DELAY_MS` |
| Any flyout panel | Cancel any pending change: the pointer made it |

Clicking All Programs or a folder opens it now. `close()` (Escape, a click outside, launching an item) cancels any pending change.

- [ ] **Step 1: Write the failing tests**

In `src/xp/StartMenu.test.js`, change the second line from:

```js
import { createStartMenu } from './StartMenu.js';
```

to:

```js
import { createStartMenu, MENU_DELAY_MS } from './StartMenu.js';
```

Then add these four tests inside `describe('Start menu flyouts')`, after the placement test and before the suite's closing `});`:

```js
  it('keeps All Programs open while the pointer cuts across another item on its way there', () => {
    enter(item('All Programs'));
    enter(item('Pinball'));
    expect(flyout(0)).not.toBeNull();
    enter(flyout(0), item('Accessories'));
    vi.advanceTimersByTime(MENU_DELAY_MS * 2);
    expect(labels(0)).toEqual(['Accessories', 'Games', 'Internet Explorer']);
    expect(labels(1)).toEqual(['Notepad']);
  });

  it('closes All Programs once the pointer rests on another item for the menu delay', () => {
    enter(item('All Programs'));
    enter(root.querySelector('.xp-sm-right'), item('My Computer'));
    vi.advanceTimersByTime(MENU_DELAY_MS - 1);
    expect(flyout(0)).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(flyout(0)).toBeNull();
  });

  it('keeps a submenu while the pointer cuts across the folder above it on its way there', () => {
    enter(item('All Programs'));
    enter(flyout(0), item('Games'));
    enter(item('Accessories'));
    expect(labels(1)).toEqual(['Minesweeper', 'Solitaire']);
    enter(flyout(1), item('Minesweeper'));
    vi.advanceTimersByTime(MENU_DELAY_MS * 2);
    expect(labels(1)).toEqual(['Minesweeper', 'Solitaire']);
  });

  it('switches submenus after resting on another folder, and at once on click', () => {
    enter(item('All Programs'));
    enter(flyout(0), item('Games'));
    enter(item('Accessories'));
    vi.advanceTimersByTime(MENU_DELAY_MS);
    expect(labels(1)).toEqual(['Notepad']);
    item('Games').click();
    expect(labels(1)).toEqual(['Minesweeper', 'Solitaire']);
  });
```

Each `enter(...)` call is one pointer move: the first test is the diagonal from the Evidence section (All Programs, across Pinball, into the flyout), the second is the reported path's column, the third is the Games-to-Minesweeper diagonal.

- [ ] **Step 2: Run the tests and watch them fail**

```bash
npx vitest run src/xp/StartMenu.test.js
```

Expected: 4 failed, 3 passed. `MENU_DELAY_MS` is not exported yet so it is `undefined`, but every test fails on an assertion before that matters:

- `keeps All Programs open while the pointer cuts across another item on its way there`: `expected null not to be null`
- `closes All Programs once the pointer rests on another item for the menu delay`: `expected null not to be null`
- `keeps a submenu while the pointer cuts across the folder above it on its way there`: `expected [ 'Notepad' ] to deeply equal [ 'Minesweeper', 'Solitaire' ]`
- `switches submenus after resting on another folder, and at once on click`: `expected [ 'Notepad' ] to deeply equal [ 'Minesweeper', 'Solitaire' ]`

- [ ] **Step 3: Add the delay constant**

At the top of `src/xp/StartMenu.js`, change:

```js
import { iconEl } from './icons/index.js';

export function createStartMenu(rootEl, { userName, left, right, allPrograms, onLogOff, onTurnOff, sounds }) {
```

to:

```js
import { iconEl } from './icons/index.js';

// Windows XP's default menu show delay: an open flyout closes or switches only after the pointer rests elsewhere this long.
export const MENU_DELAY_MS = 400;

export function createStartMenu(rootEl, { userName, left, right, allPrograms, onLogOff, onTurnOff, sounds }) {
```

- [ ] **Step 4: Track which item owns each open flyout, and route flyout hovers through the delay**

Change:

```js
  let isOpen = false;
```

to:

```js
  let isOpen = false;
  let hoverTimer = null;
  const anchors = []; // anchors[level] is the item whose flyout is open at that level
```

Then change `clearFlyouts` and the start of `showFlyout` from:

```js
  function clearFlyouts(fromLevel = 0) {
    [...flyouts.children].filter((f) => Number(f.dataset.level) >= fromLevel).forEach((f) => f.remove());
  }
  function showFlyout(items, level, anchorEl) {
    clearFlyouts(level);
    const panel = document.createElement('div');
    panel.className = 'xp-sm-flyout';
    panel.dataset.level = String(level);
    for (const item of items) {
      const el = row(item, { iconSize: 16 });
      if (item.children) el.addEventListener('mouseenter', () => showFlyout(item.children, level + 1, el));
      else if (item.action) el.addEventListener('mouseenter', () => clearFlyouts(level + 1));
```

to:

```js
  function clearFlyouts(fromLevel = 0) {
    [...flyouts.children].filter((f) => Number(f.dataset.level) >= fromLevel).forEach((f) => f.remove());
    anchors.length = Math.min(anchors.length, fromLevel);
  }
  function cancelHover() { clearTimeout(hoverTimer); hoverTimer = null; }
  function afterHover(fn) { cancelHover(); hoverTimer = setTimeout(() => { hoverTimer = null; fn(); }, MENU_DELAY_MS); }
  function hoverOpener(items, level, anchorEl) {
    if (anchors[level] === anchorEl) cancelHover();
    else if (anchors.length <= level) showFlyout(items, level, anchorEl);
    else afterHover(() => showFlyout(items, level, anchorEl));
  }
  function hoverElsewhere(level) { if (anchors.length > level) afterHover(() => clearFlyouts(level)); }
  function showFlyout(items, level, anchorEl) {
    cancelHover();
    clearFlyouts(level);
    anchors[level] = anchorEl;
    const panel = document.createElement('div');
    panel.className = 'xp-sm-flyout';
    panel.dataset.level = String(level);
    panel.addEventListener('mouseenter', cancelHover);
    for (const item of items) {
      const el = row(item, { iconSize: 16 });
      if (item.children) {
        el.addEventListener('mouseenter', () => hoverOpener(item.children, level + 1, el));
        el.addEventListener('click', () => showFlyout(item.children, level + 1, el));
      } else if (item.action) el.addEventListener('mouseenter', () => hoverElsewhere(level + 1));
```

The rest of `showFlyout` stays as it is: the action `click` line, `panel.append(el)`, and Task 1's positioning. Levels only ever open one at a time from the level above, so `anchors` never has holes, and `anchors.length` is the number of open flyouts. The panel's own `mouseenter` fires before its item's (outermost first), so arriving on a folder inside a flyout cancels the old pending change and then applies the folder's own rule.

- [ ] **Step 5: Send All Programs and the columns through the same rules**

Change:

```js
  all.addEventListener('mouseenter', () => showFlyout(allPrograms, 0, all));
```

to:

```js
  all.addEventListener('mouseenter', () => hoverOpener(allPrograms, 0, all));
```

Then change:

```js
  rootEl.querySelector('.xp-sm-columns').addEventListener('mouseenter', (e) => { if (!e.target.closest('.xp-sm-allprograms')) clearFlyouts(0); }, true);
  rootEl.querySelector('.xp-sm-right').addEventListener('mouseenter', () => clearFlyouts(0));
```

to:

```js
  rootEl.querySelector('.xp-sm-columns').addEventListener('mouseenter', (e) => { if (!e.target.closest('.xp-sm-allprograms')) hoverElsewhere(0); }, true);
```

The `.xp-sm-right` listener goes. It duplicated the capture listener on `.xp-sm-columns`, which already receives the non-bubbling `mouseenter` of the right-hand column during capture. The `closes All Programs once the pointer rests...` test enters `.xp-sm-right` itself to prove it.

- [ ] **Step 6: Run the tests and make sure they pass**

```bash
npx vitest run src/xp/StartMenu.test.js
```

Expected: 7 passed.

- [ ] **Step 7: Write the failing test for a delay that outlives the menu**

Add this test inside `describe('Start menu flyouts')`, after the four from Step 1:

```js
  it('drops a pending flyout change when the Start menu closes', () => {
    enter(item('All Programs'));
    enter(flyout(0), item('Games'));
    enter(item('Accessories'));
    menu.close();
    vi.advanceTimersByTime(MENU_DELAY_MS);
    expect(root.querySelectorAll('.xp-sm-flyout')).toHaveLength(0);
  });
```

- [ ] **Step 8: Run the test and watch it fail**

```bash
npx vitest run src/xp/StartMenu.test.js
```

Expected: 1 failed, 7 passed. `drops a pending flyout change when the Start menu closes` fails with `expected …(1) to have a length of +0 but got 1`. The switch to Accessories was still pending when the menu closed; it fired 400 ms later and built a flyout inside the hidden menu, which would reappear on the next open.

- [ ] **Step 9: Cancel the pending change in close()**

In `close()`, change:

```js
    rootEl.hidden = true;
    clearFlyouts(0);
```

to:

```js
    rootEl.hidden = true;
    cancelHover();
    clearFlyouts(0);
```

`createDesktop`'s `setInteractive(false)` and `destroy()` both go through `startMenu.close()`, so this also covers turning off, logging off and teardown.

- [ ] **Step 10: Run the tests and make sure they pass**

```bash
npx vitest run src/xp/StartMenu.test.js
```

Expected: 8 passed.

- [ ] **Step 11: Stage**

```bash
git add src/xp/StartMenu.js src/xp/StartMenu.test.js
```

---

### Task 3: Check it with a real mouse and record the QA items

**Files:**
- Modify: `README.md` (Manual QA checklist)

**Interfaces:**
- Consumes: Tasks 1 and 2 complete.
- Produces: nothing code-facing.

- [ ] **Step 1: Run everything**

```bash
npm test
```

Expected: 38 files, 257 tests, all passing (251 before this plan plus 6 new). If an unrelated suite fails, stop and report rather than adjusting it.

- [ ] **Step 2: Walk the four paths in flat mode**

```bash
npm run dev
```

Open `http://localhost:5173/Portfolio/?mode=flat`, click through the boot and open Start. Move the mouse at a normal pace:

1. Hover All Programs, then move straight right across the menu. The flyout stays open and the pointer lands on Internet Explorer.
2. From the middle of All Programs, move up-right onto Accessories. The flyout stays open and Accessories' submenu (Notepad) opens.
3. Rest on Games for half a second; its submenu replaces Notepad. Move up-right onto Minesweeper, cutting across Accessories. The Games submenu stays. Click Minesweeper: the game opens and the Start menu closes.
4. Open Start > All Programs again, then rest on My Computer. Both flyouts close after about half a second, not instantly.

Also confirm that nothing else changed: Escape closes the menu, clicking All Programs opens its flyout, clicking Games opens its submenu at once, and arrow keys still move over the top-level items.

If you are driving a browser tool instead of a hand, paste this into the page first:

```js
const sm = document.querySelector('.xp-startmenu'); window.__startMenuLog = [];
document.addEventListener('mouseenter', (e) => { const it = e.target.closest?.('.xp-sm-item'); if (sm.contains(e.target) && it === e.target) window.__startMenuLog.push(`enter ${it.textContent.trim()}`); }, true);
new MutationObserver((ms) => ms.forEach((m) => { m.addedNodes.forEach((n) => window.__startMenuLog.push(`+ flyout${n.dataset.level} left=${n.style.left}`)); m.removedNodes.forEach((n) => window.__startMenuLog.push(`- flyout${n.dataset.level}`)); })).observe(sm.querySelector('.xp-sm-flyouts'), { childList: true });
```

Walk each path as separate pointer moves that stop on a point *inside* the item being crossed; a single jump skips it and proves nothing. Then read `window.__startMenuLog`. Paths 1 to 3 show no `- flyout` line while crossing, and path 4 shows both removals only after the wait.

- [ ] **Step 3: Repeat in the 3D room**

Open `http://localhost:5173/Portfolio/?mode=room`, click the PC, wait for the desktop, and repeat paths 1 and 3. The flyouts sit beside their parents exactly as in flat mode, because the placement reads layout offsets, which the room's CSS3D transform does not change.

- [ ] **Step 4: Record the QA item**

In `README.md`, under `## Manual QA checklist`, after the line
`- [ ] Every desktop icon, Start menu item, All Programs entry and Run command does something sensible`, add:

```markdown
- [ ] All Programs opens beside its button; moving straight or diagonally into it, or from Games diagonally to Minesweeper, never closes a menu; resting on another item closes it after about half a second
```

- [ ] **Step 5: Stage**

```bash
git add README.md
```

- [ ] **Step 6: Report**

Summarise for Stephen: before (flyout 200px away, gone on first contact with the right-hand column), after (beside the button, 400 ms of grace), the test counts from Step 1, and anything about the delay that felt slow in Step 2. Do not commit; wait for him to say so.

---

## Self-Review

**Coverage.** "The All Programs menu is too far away": Task 1 puts it beside the button. "When I move the mouse to the menu, the menu already hide": Task 1 takes the right-hand column off the straight path, and Task 2 covers the diagonal paths, which the evidence shows still close it after Task 1 alone. The same defect one level down (Games to Minesweeper) is covered by Task 1's placement and Task 2's switch delay. The timer hygiene the delay introduces is Task 2 Steps 7 to 10. Real-mouse proof in both modes is Task 3.

**No placeholders.** Every step has the literal code or command. The widths in the placement test (400, 199, 190) and the expected lefts (195, 381) are the Chrome measurements from the evidence section. Every quoted failure is copied from a real run of these exact snippets.

**Consistency.** `beside` is introduced in Task 1 and not renamed. `MENU_DELAY_MS` is defined in Task 2 Step 3; `hoverTimer`, `anchors`, `cancelHover`, `afterHover`, `hoverOpener` and `hoverElsewhere` in Step 4. They are used only in Steps 4, 5 and 9. `close()` gains `cancelHover()` only after Step 7's test demands it. The helpers `item`, `flyout`, `labels` and `enter` are defined once in Task 1 and reused unchanged.

**Open choices for Stephen.**

- *Task 2 is separable.* Task 1 plus Task 3 alone fixes the straight path and keeps every menu change instant, but diagonal moves still close or swap menus, as measured above.
- *The delay value.* 400 ms is XP's default. It also means that with Accessories' submenu open, Games' submenu replaces it only after the pointer rests on Games that long; clicking is instant. A shorter value such as 250 ms feels snappier and still covers the crossings measured here (19 to 33 ms). Only `MENU_DELAY_MS` changes; the tests are written against the constant.
- *Where it lands.* This worktree branch is off `main` (`0c9cbf4`). `dev` sits one merge behind with identical Start menu code, and earlier work went through `dev` into `main`.
