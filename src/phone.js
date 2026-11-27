import { renderHomepage } from './xp/apps/Homepage.js';
import { handleHomepageClick, scrollToAnchor, nextVisitorNumber } from './xp/apps/InternetExplorer.js';

/** Relative on purpose (keeps the base path). Plain `?mode=flat` = the XP desktop, without opening anything. */
export const DESKTOP_HREF = '?mode=flat';

/**
 * Stand-in for the XP app registry, so the homepage's data-app links still do something sensible
 * on a phone: the PDF opens in a new tab, and the project photos (which live in the desktop's
 * My Pictures) hand over to the desktop.
 */
export function phoneRegistry({ pdfHref, openExternal, goDesktop }) {
  return {
    launch(appId) {
      if (appId === 'reader') openExternal(pdfHref);
      else goDesktop();
    },
  };
}

/**
 * The résumé as a full-screen responsive page (the same synced homepage the IE window shows),
 * with a bottom bar that opens the real XP desktop for anyone who wants it.
 */
export function mountPhone(root, { resume, portfolio, pdfHref, repoUrl, storage, openExternal, track = () => {} }) {
  const stage = document.createElement('div');
  stage.className = 'phone-stage';

  const iframe = document.createElement('iframe');
  iframe.className = 'phone-page';
  iframe.title = `${resume.displayName}'s résumé`;
  iframe.srcdoc = renderHomepage(resume, { pdfHref, repoUrl, portfolio, visitors: nextVisitorNumber(storage) });

  const bar = document.createElement('div');
  bar.className = 'phone-bar';
  const link = document.createElement('a');
  link.className = 'phone-desktop';
  link.href = DESKTOP_HREF;
  link.textContent = 'Open the Windows XP desktop →';
  // Left to navigate natively; the page is about to unload, so ask analytics to use a beacon.
  link.addEventListener('click', () => track('open_desktop', { transport_type: 'beacon' }));
  const hint = document.createElement('span');
  hint.className = 'phone-hint';
  hint.textContent = 'Best on a computer';
  bar.append(link, hint);

  stage.append(iframe, bar);
  root.append(stage);

  const registry = phoneRegistry({ pdfHref, openExternal, goDesktop: () => { location.href = DESKTOP_HREF; } });
  iframe.addEventListener('load', () => {
    const doc = iframe.contentDocument;
    if (!doc) return;
    // An about:srcdoc "#about" resolves against the PARENT URL, so every click is handled here (see InternetExplorer.js).
    doc.addEventListener('click', (e) => handleHomepageClick(e, { registry, openExternal, onAnchor: (id) => scrollToAnchor(doc, id) }));
  });
  return stage;
}
