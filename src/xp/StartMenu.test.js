import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createStartMenu, MENU_DELAY_MS } from './StartMenu.js';

describe('Start menu keyboard', () => {
  let menu, hits, root;
  beforeEach(() => {
    document.body.innerHTML = '<div id="sm"></div>';
    root = document.querySelector('#sm');
    hits = [];
    menu = createStartMenu(root, {
      userName: 'Stephen',
      left: [{ label: 'Internet', sublabel: 'Internet Explorer', icon: 'ie', action: () => hits.push('ie') }, { label: 'Notepad', icon: 'notepad', action: () => hits.push('notepad') }],
      right: [{ label: 'My Computer', icon: 'computer', action: () => hits.push('computer') }],
      allPrograms: [], onLogOff: () => hits.push('logoff'), onTurnOff: () => hits.push('turnoff'),
    });
  });
  it('focuses the first item on open and moves with arrows', () => {
    menu.open();
    expect(document.activeElement.textContent).toContain('Internet');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement.textContent).toContain('Notepad');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement.textContent).toContain('Turn Off');
    document.activeElement.click();
    expect(hits).toEqual(['turnoff']);
    expect(menu.isOpen).toBe(false);
  });
  it('has menu semantics', () => {
    expect(root.getAttribute('role')).toBe('menu');
    expect(root.querySelector('.xp-sm-item').getAttribute('role')).toBe('menuitem');
  });
});

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

  it('drops a pending flyout change when the Start menu closes', () => {
    enter(item('All Programs'));
    enter(flyout(0), item('Games'));
    enter(item('Accessories'));
    menu.close();
    vi.advanceTimersByTime(MENU_DELAY_MS);
    expect(root.querySelectorAll('.xp-sm-flyout')).toHaveLength(0);
  });

  it('keeps menus when the pointer returns to the item whose flyout is open', () => {
    enter(item('All Programs')); enter(flyout(0), item('Games'));
    enter(item('Pinball')); enter(item('All Programs'));
    vi.advanceTimersByTime(MENU_DELAY_MS * 2);
    expect(labels(1)).toEqual(['Minesweeper', 'Solitaire']);
  });

  it('closes a submenu after resting on a plain item in its parent flyout', () => {
    enter(item('All Programs')); enter(flyout(0), item('Games')); enter(item('Internet Explorer'));
    expect(flyout(1)).not.toBeNull();
    vi.advanceTimersByTime(MENU_DELAY_MS);
    expect(flyout(1)).toBeNull(); expect(flyout(0)).not.toBeNull();
  });

  it('opens All Programs on hover again after it closed', () => {
    enter(item('All Programs')); enter(root.querySelector('.xp-sm-right'), item('My Computer'));
    vi.advanceTimersByTime(MENU_DELAY_MS);
    enter(item('All Programs'));
    expect(flyout(0)).not.toBeNull();
  });

  it('stays open while the pointer moves within All Programs', () => {
    const ap = item('All Programs');
    enter(ap, ap.querySelector('.xp-sm-text'), ap.querySelector('.xp-sm-label'));
    enter(ap.querySelector('.xp-sm-arrow'));
    vi.advanceTimersByTime(MENU_DELAY_MS * 2);
    expect(flyout(0)).not.toBeNull();
  });

  it('drops a pending close when All Programs is clicked', () => {
    enter(item('All Programs')); enter(root.querySelector('.xp-sm-right'), item('My Computer'));
    item('All Programs').click();
    vi.advanceTimersByTime(MENU_DELAY_MS * 2);
    expect(flyout(0)).not.toBeNull();
  });
});
