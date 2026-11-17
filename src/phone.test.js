import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountPhone, phoneRegistry, DESKTOP_HREF } from './phone.js';

const resume = {
  displayName: 'Test Person', title: 'Developer', summary: 'Hello there.',
  contact: { location: 'Winnipeg', email: 'a@b.c', linkedin: 'https://linkedin.example/x' },
  expertise: ['JS'], languages: [{ name: 'English', level: 'Fluent' }], education: [{ year: '2020', degree: 'BSc', school: 'U' }],
  experience: [{ period: '2024', title: 'Dev', company: 'Co', bullets: ['Did things'] }], updated: '2026',
};

describe('phoneRegistry', () => {
  it('opens the PDF in a new tab instead of the desktop Reader', () => {
    const openExternal = vi.fn();
    phoneRegistry({ pdfHref: '/Portfolio/resume.pdf', openExternal, goDesktop: vi.fn() }).launch('reader');
    expect(openExternal).toHaveBeenCalledWith('/Portfolio/resume.pdf');
  });
  it('sends the project-photos link to the XP desktop, the only place the pictures live', () => {
    const goDesktop = vi.fn();
    phoneRegistry({ pdfHref: 'x', openExternal: vi.fn(), goDesktop }).launch('explorer', { path: 'C:\\Pictures' });
    expect(goDesktop).toHaveBeenCalledOnce();
  });
});

describe('mountPhone', () => {
  let root;
  beforeEach(() => { document.body.innerHTML = '<div id="app"></div>'; root = document.querySelector('#app'); });
  const mount = (extra = {}) => mountPhone(root, { resume, pdfHref: 'r.pdf', repoUrl: 'https://repo.example', storage: new Map(), openExternal: vi.fn(), track: vi.fn(), ...extra });

  it('shows the résumé homepage full-screen in an iframe', () => {
    mount();
    const iframe = root.querySelector('iframe.phone-page');
    expect(iframe).not.toBeNull();
    expect(iframe.srcdoc).toContain('Test Person');
    expect(iframe.srcdoc).toContain('id="experience"');
  });
  it('offers a real link to the XP desktop, which is not the room or the résumé shortcut', () => {
    mount();
    const link = root.querySelector('a.phone-desktop');
    expect(link.getAttribute('href')).toBe(DESKTOP_HREF);
    expect(DESKTOP_HREF).toBe('?mode=flat');
  });
  it('tracks the desktop link without cancelling the navigation', () => {
    const track = vi.fn();
    mount({ track });
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    root.querySelector('a.phone-desktop').dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
    expect(track).toHaveBeenCalledWith('open_desktop', { transport_type: 'beacon' });
  });
  it('counts the visit like Internet Explorer does', () => {
    const storage = new Map();
    mount({ storage: { get: (k) => storage.get(k), set: (k, v) => storage.set(k, v) } });
    expect(storage.get('xpcomputer.visitors')).toBe('1');
  });
});
