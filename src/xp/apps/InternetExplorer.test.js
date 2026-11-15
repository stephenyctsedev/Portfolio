import { describe, it, expect, vi, beforeEach } from 'vitest';
import resume from '../../data/resume.json';
import { renderHomepage } from './Homepage.js';
import { handleHomepageClick, scrollToAnchor, buildFavorites } from './InternetExplorer.js';
import { PATHS } from '../../data/filesystem.js';

const opts = { pdfHref: '/resume.pdf', repoUrl: 'https://github.com/example/repo', visitors: 1 };

/** Parse the real homepage markup so the test uses the exact links users click. */
function homepageDoc() {
  return new DOMParser().parseFromString(renderHomepage(resume, opts), 'text/html');
}

function click(el) {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'target', { value: el });
  return event;
}

describe('handleHomepageClick', () => {
  let handlers, doc;
  beforeEach(() => {
    handlers = { registry: { launch: vi.fn() }, openExternal: vi.fn(), onAnchor: vi.fn() };
    doc = homepageDoc();
  });

  // Regression: inside an about:srcdoc iframe a native "#about" jump resolves against the
  // PARENT url, so the iframe loaded the whole app (a nested 3D room) instead of scrolling.
  it.each(['about', 'experience', 'contact'])('intercepts the #%s nav link instead of letting the iframe navigate', (id) => {
    const event = click(doc.querySelector(`a[href="#${id}"]`));
    handleHomepageClick(event, handlers);
    expect(event.defaultPrevented).toBe(true);
    expect(handlers.onAnchor).toHaveBeenCalledWith(id);
    expect(handlers.openExternal).not.toHaveBeenCalled();
    expect(handlers.registry.launch).not.toHaveBeenCalled();
  });

  it('intercepts every in-page nav link that has a matching section', () => {
    for (const a of doc.querySelectorAll('td.nav a[href^="#"]:not([data-app])')) {
      const id = a.getAttribute('href').slice(1);
      expect(doc.getElementById(id), `nav link #${id} has no target section`).not.toBeNull();
    }
  });

  it('still launches the app for data-app links such as Projects', () => {
    const projects = doc.querySelector('a[data-app="explorer"]');
    const event = click(projects);
    handleHomepageClick(event, handlers);
    expect(event.defaultPrevented).toBe(true);
    expect(handlers.registry.launch).toHaveBeenCalledWith('explorer', { path: projects.dataset.path });
    expect(handlers.onAnchor).not.toHaveBeenCalled();
  });

  it('opens external links outside the iframe', () => {
    const linkedin = [...doc.querySelectorAll('a')].find((a) => a.getAttribute('href') === resume.contact.linkedin);
    const event = click(linkedin);
    handleHomepageClick(event, handlers);
    expect(event.defaultPrevented).toBe(true);
    expect(handlers.openExternal).toHaveBeenCalledWith(resume.contact.linkedin);
  });

  it('ignores clicks that are not on a link', () => {
    const event = click(doc.querySelector('h1'));
    handleHomepageClick(event, handlers);
    expect(event.defaultPrevented).toBe(false);
    expect(handlers.onAnchor).not.toHaveBeenCalled();
  });
});

describe('scrollToAnchor', () => {
  it('smooth-scrolls the matching section into view', () => {
    const doc = homepageDoc();
    const target = doc.getElementById('experience');
    target.scrollIntoView = vi.fn();
    expect(scrollToAnchor(doc, 'experience')).toBe(true);
    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('does nothing when the id does not exist', () => {
    expect(scrollToAnchor(homepageDoc(), 'nope')).toBe(false);
  });
});

describe('buildFavorites', () => {
  let registry, openExternal, goHome, items;
  const item = (label) => items.find((i) => i.label === label);
  beforeEach(() => {
    registry = { launch: vi.fn() };
    openExternal = vi.fn();
    goHome = vi.fn();
    items = buildFavorites({ resume, repoUrl: opts.repoUrl, registry, openExternal, goHome });
  });

  it('Portfolio opens My Pictures in Explorer and never goes off-site', () => {
    item('Portfolio').action();
    expect(registry.launch).toHaveBeenCalledWith('explorer', { path: `${PATHS.myDocuments}\\My Pictures` });
    expect(openExternal).not.toHaveBeenCalled();
  });

  it('keeps the other favourites as they were', () => {
    item('Homepage').action();
    expect(goHome).toHaveBeenCalledTimes(1);
    item('Resume (PDF)').action();
    expect(registry.launch).toHaveBeenCalledWith('reader');
    item('LinkedIn').action();
    expect(openExternal).toHaveBeenCalledWith(resume.contact.linkedin);
    item('Source on GitHub').action();
    expect(openExternal).toHaveBeenCalledWith(opts.repoUrl);
  });
});
