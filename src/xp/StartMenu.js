import { iconEl } from './icons/index.js';

// Windows XP's default menu show delay: an open flyout closes or switches only after the pointer rests elsewhere this long.
export const MENU_DELAY_MS = 400;

export function createStartMenu(rootEl, { userName, left, right, allPrograms, onLogOff, onTurnOff, sounds }) {
  rootEl.classList.add('xp-startmenu');
  rootEl.setAttribute('role', 'menu');
  rootEl.hidden = true;
  rootEl.innerHTML = `
    <div class="xp-sm-header"><span class="xp-sm-avatar"></span><span class="xp-sm-user"></span></div>
    <div class="xp-sm-columns"><div class="xp-sm-left"></div><div class="xp-sm-right"></div></div>
    <div class="xp-sm-footer">
      <button type="button" class="xp-sm-footer-btn" role="menuitem" data-cmd="logoff"><span class="xp-sm-footer-ico"></span>Log Off</button>
      <button type="button" class="xp-sm-footer-btn" role="menuitem" data-cmd="turnoff"><span class="xp-sm-footer-ico"></span>Turn Off Computer</button>
    </div>
    <div class="xp-sm-flyouts"></div>`;
  rootEl.querySelector('.xp-sm-avatar').append(iconEl('user', 40));
  rootEl.querySelector('.xp-sm-user').textContent = userName;
  rootEl.querySelectorAll('.xp-sm-footer-ico')[0].append(iconEl('logoff', 22));
  rootEl.querySelectorAll('.xp-sm-footer-ico')[1].append(iconEl('power', 22));
  const leftCol = rootEl.querySelector('.xp-sm-left');
  const rightCol = rootEl.querySelector('.xp-sm-right');
  const flyouts = rootEl.querySelector('.xp-sm-flyouts');
  let isOpen = false;
  let hoverTimer = null;
  const anchors = []; // anchors[level] is the item whose flyout is open at that level

  function row(item, { iconSize = 24, arrow = false } = {}) {
    if (item.separator) { const sep = document.createElement('div'); sep.className = 'xp-sm-sep'; return sep; }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'xp-sm-item';
    b.setAttribute('role', 'menuitem');
    b.append(iconEl(item.icon, iconSize));
    const text = document.createElement('span');
    text.className = 'xp-sm-text';
    text.innerHTML = `<span class="xp-sm-label"></span>${item.sublabel ? '<span class="xp-sm-sublabel"></span>' : ''}`;
    text.querySelector('.xp-sm-label').textContent = item.label;
    if (item.sublabel) text.querySelector('.xp-sm-sublabel').textContent = item.sublabel;
    b.append(text);
    if (arrow || item.children) { const a = document.createElement('span'); a.className = 'xp-sm-arrow'; a.textContent = '▸'; b.append(a); }
    return b;
  }

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
      if (!item.separator && item.action) el.addEventListener('click', () => { close(); item.action(); });
      panel.append(el);
    }
    flyouts.append(panel);
    const menuRect = rootEl.getBoundingClientRect();
    const scale = menuRect.width / rootEl.offsetWidth || 1;
    const anchorRect = anchorEl.getBoundingClientRect();
    // .xp-sm-left and every .xp-sm-flyout are laid out against .xp-startmenu (their offsetParent), so their offsets are style.left's units.
    const beside = anchorEl.closest('.xp-sm-flyout, .xp-sm-left');
    panel.style.left = `${beside.offsetLeft + beside.offsetWidth - 4}px`;
    panel.style.bottom = `${Math.max(0, (menuRect.bottom - anchorRect.bottom) / scale - 2)}px`;
  }

  for (const item of left) {
    const el = row(item, { iconSize: item.sublabel ? 32 : 24 });
    if (!item.separator) el.addEventListener('click', () => { close(); item.action(); });
    leftCol.append(el);
  }
  const all = row({ label: 'All Programs', icon: 'exe' }, { arrow: true });
  all.classList.add('xp-sm-allprograms');
  all.addEventListener('click', () => showFlyout(allPrograms, 0, all));
  all.addEventListener('mouseenter', () => hoverOpener(allPrograms, 0, all));
  leftCol.append(all);
  for (const item of right) {
    const el = row(item, { iconSize: 22 });
    if (!item.separator) el.addEventListener('click', () => { close(); item.action(); });
    rightCol.append(el);
  }
  rootEl.querySelector('[data-cmd="logoff"]').addEventListener('click', () => { close(); onLogOff(); });
  rootEl.querySelector('[data-cmd="turnoff"]').addEventListener('click', () => { close(); onTurnOff(); });
  rootEl.querySelector('.xp-sm-columns').addEventListener('mouseenter', (e) => { if (!e.target.closest('.xp-sm-allprograms')) hoverElsewhere(0); }, true);

  function onDocumentDown(e) { if (isOpen && !rootEl.contains(e.target) && !e.target.closest('.xp-start')) close(); }
  const focusables = () => [...rootEl.querySelectorAll('.xp-sm-item, .xp-sm-footer-btn')].filter((b) => !b.closest('.xp-sm-flyout'));
  function onKey(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = focusables();
    const index = items.indexOf(document.activeElement);
    const next = e.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
    items[next]?.focus({ preventScroll: true });
  }
  function open() {
    if (isOpen) return;
    isOpen = true;
    rootEl.hidden = false;
    focusables()[0]?.focus({ preventScroll: true });
    sounds?.play('menu');
    document.addEventListener('pointerdown', onDocumentDown, true);
    document.addEventListener('keydown', onKey);
    rootEl.dispatchEvent(new CustomEvent('startmenu:toggle', { detail: true }));
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    rootEl.hidden = true;
    cancelHover();
    clearFlyouts(0);
    document.removeEventListener('pointerdown', onDocumentDown, true);
    document.removeEventListener('keydown', onKey);
    rootEl.dispatchEvent(new CustomEvent('startmenu:toggle', { detail: false }));
  }
  return { open, close, toggle: () => (isOpen ? close() : open()), get isOpen() { return isOpen; } };
}
