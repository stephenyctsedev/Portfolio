import { describe, it, expect, beforeEach } from 'vitest';
import { createWindowManager } from '../WindowManager.js';
import { createMenus } from '../Menu.js';
import { openNotepad } from './Notepad.js';

describe('Notepad', () => {
  let ctx;
  beforeEach(() => {
    document.body.innerHTML = '<div id="screen"><div id="layer"></div></div>';
    ctx = {
      wm: createWindowManager(document.querySelector('#layer')),
      dialogs: { message: () => Promise.resolve('OK') },
      menus: createMenus(document.querySelector('#screen')),
    };
  });
  const textarea = (win) => win.el.querySelector('textarea');
  const openFormatMenu = (win) => [...win.el.querySelectorAll('.xp-menubar-item')].find((i) => i.textContent === 'Format').click();
  const wordWrapItem = () => [...document.querySelectorAll('.xp-menu-item')].find((r) => r.textContent.includes('Word Wrap'));

  it('wraps long lines by default so project text needs no sideways scrolling', () => {
    const win = openNotepad(ctx, { title: 'Sun Wah Supermarket.txt', text: 'a very long line '.repeat(40) });
    expect(textarea(win).wrap).toBe('soft');
  });

  it('shows Word Wrap as ticked, and toggling it turns wrapping off and back on', () => {
    const win = openNotepad(ctx, { title: 'x.txt', text: 'hello' });
    openFormatMenu(win);
    expect(wordWrapItem().querySelector('.xp-menu-check').textContent).toBe('✓');
    wordWrapItem().click();
    expect(textarea(win).wrap).toBe('off');
    openFormatMenu(win);
    expect(wordWrapItem().querySelector('.xp-menu-check').textContent).toBe('');
    wordWrapItem().click();
    expect(textarea(win).wrap).toBe('soft');
  });
});
