import { iconEl } from '../icons/index.js';
import { attachMenubar } from '../Menu.js';
import { renderHomepage } from './Homepage.js';

export const HOME_URL = 'http://www.stephentse.local/index.html';
const VISITOR_KEY = 'xpcomputer.visitors';

export function registerInternetExplorer(registry) {
  registry.register('iexplore', { name: 'Internet Explorer', icon: 'ie', launch: openInternetExplorer });
}

function nextVisitorNumber(storage) {
  const count = Number(storage.get(VISITOR_KEY) ?? 0) + 1;
  storage.set(VISITOR_KEY, String(count));
  return 1337 + count;
}

/**
 * Smooth-scroll a section of the homepage document into view.
 * @returns {boolean} whether a matching element was found
 */
export function scrollToAnchor(doc, id) {
  const target = id ? doc.getElementById(id) : null;
  if (!target) return false;
  target.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  return true;
}

/**
 * Click handler for the homepage that lives inside the IE <iframe srcdoc>.
 * Every link is handled here and the browser's default navigation is always cancelled:
 * an about:srcdoc document resolves "#about" against the PARENT page's URL, so letting the
 * default run navigates the iframe to the whole app (a nested 3D room) instead of scrolling.
 */
export function handleHomepageClick(e, { registry, openExternal, onAnchor }) {
  const a = e.target.closest('a');
  if (!a) return;
  e.preventDefault();
  if (a.dataset.app) { registry.launch(a.dataset.app, a.dataset.path ? { path: a.dataset.path } : undefined); return; }
  const href = a.getAttribute('href') ?? '';
  if (href.startsWith('#')) { onAnchor(href.slice(1)); return; }
  openExternal(href);
}

export function openInternetExplorer(ctx) {
  const { wm, dialogs, menus, registry, resume, pdfHref, repoUrl, storage, openExternal } = ctx;
  const body = document.createElement('div');
  body.className = 'xp-ie';
  body.innerHTML = `
    <div class="xp-ie-menubar"></div>
    <div class="xp-ie-toolbar">
      <button class="xp-tb" data-cmd="back" disabled><span class="xp-tb-ico" data-icon="arrowLeft"></span>Back</button>
      <button class="xp-tb" data-cmd="forward" disabled><span class="xp-tb-ico" data-icon="arrowRight"></span></button>
      <span class="xp-tb-sep"></span>
      <button class="xp-tb" data-cmd="stop" title="Stop"><span class="xp-tb-ico" data-icon="stop"></span></button>
      <button class="xp-tb" data-cmd="refresh" title="Refresh"><span class="xp-tb-ico" data-icon="refresh"></span></button>
      <button class="xp-tb" data-cmd="home" title="Home"><span class="xp-tb-ico" data-icon="home"></span></button>
      <span class="xp-tb-sep"></span>
      <button class="xp-tb" data-cmd="search"><span class="xp-tb-ico" data-icon="search"></span>Search</button>
      <button class="xp-tb" data-cmd="favorites"><span class="xp-tb-ico" data-icon="star"></span>Favorites</button>
      <button class="xp-tb" data-cmd="history" title="History"><span class="xp-tb-ico" data-icon="clock"></span></button>
    </div>
    <div class="xp-ie-address"><label>Address</label><div class="xp-ie-url"><span class="xp-ie-url-ico"></span><input type="text" readonly></div><button class="xp-tb" data-cmd="go">Go</button></div>
    <div class="xp-ie-page"><iframe title="Homepage"></iframe></div>
    <div class="status-bar xp-ie-status"><p class="status-bar-field xp-ie-status-main">Done</p><p class="status-bar-field">Internet</p></div>`;
  for (const holder of body.querySelectorAll('.xp-tb-ico')) holder.append(iconEl(holder.dataset.icon, 16));
  body.querySelector('.xp-ie-url-ico').append(iconEl('ie', 16));
  const addressInput = body.querySelector('.xp-ie-url input');
  addressInput.value = HOME_URL;
  const iframe = body.querySelector('iframe');
  const status = body.querySelector('.xp-ie-status-main');

  const win = wm.open({ appId: 'iexplore', title: `${resume.displayName}'s Homepage - Microsoft Internet Explorer`.replace('Microsoft ', ''), icon: 'ie', width: 800, height: 600, minWidth: 420, minHeight: 300, content: body });

  const notAvailable = () => dialogs.message({ title: 'Internet Explorer', kind: 'info', owner: win, text: 'This feature is not available in the demo. Try the homepage links instead.' });
  const favorites = () => [
    { label: 'Homepage', action: load },
    { label: 'Resume (PDF)', action: () => registry.launch('reader') },
    { separator: true },
    { label: 'LinkedIn', action: () => openExternal(resume.contact.linkedin) },
    { label: 'Portfolio', action: () => openExternal(resume.contact.portfolio) },
    { label: 'Source on GitHub', action: () => openExternal(repoUrl) },
  ];
  attachMenubar(body.querySelector('.xp-ie-menubar'), menus, {
    File: [{ label: 'New Window', action: () => openInternetExplorer(ctx) }, { label: 'Save As...', action: () => registry.launch('reader') }, { separator: true }, { label: 'Close', action: () => win.close() }],
    Edit: [{ label: 'Cut', disabled: true }, { label: 'Copy', disabled: true }, { label: 'Paste', disabled: true }],
    View: [{ label: 'Refresh', shortcut: 'F5', action: load }, { label: 'Source', action: () => openExternal(repoUrl) }],
    Favorites: favorites,
    Tools: [{ label: 'Internet Options...', action: notAvailable }],
    Help: [{ label: 'About Internet Explorer', action: () => dialogs.message({ title: 'About Internet Explorer', owner: win, text: 'A loving recreation in plain JavaScript. No Microsoft code inside.' }) }],
  });

  function load() {
    status.textContent = 'Opening page...';
    addressInput.value = HOME_URL;
    iframe.srcdoc = renderHomepage(resume, { pdfHref, repoUrl, visitors: nextVisitorNumber(storage) });
  }
  iframe.addEventListener('load', () => {
    status.textContent = 'Done';
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.addEventListener('click', (e) => handleHomepageClick(e, {
      registry,
      openExternal,
      onAnchor: (id) => { if (scrollToAnchor(doc, id)) addressInput.value = `${HOME_URL}#${id}`; },
    }));
  });
  body.addEventListener('click', (e) => {
    const cmd = e.target.closest('[data-cmd]')?.dataset.cmd;
    if (!cmd) return;
    if (cmd === 'refresh' || cmd === 'home' || cmd === 'go') load();
    else if (cmd === 'stop') status.textContent = 'Done';
    else if (cmd === 'favorites') menus.open(e.target.closest('[data-cmd]'), favorites());
    else if (cmd === 'search' || cmd === 'history') notAvailable();
  });
  load();
  return win;
}
