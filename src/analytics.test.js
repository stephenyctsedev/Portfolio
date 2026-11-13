import { describe, it, expect, beforeEach } from 'vitest';
import { createAnalytics } from './analytics.js';

const scripts = () => document.head.querySelectorAll('script[src*="googletagmanager"]');
const entries = () => (window.dataLayer ?? []).map((e) => Array.from(e));

describe('analytics', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    delete window.dataLayer;
    delete window.gtag;
  });

  it('does nothing when disabled', () => {
    const a = createAnalytics({ id: 'G-TEST', enabled: false });
    a.init();
    a.track('app_open', { app_id: 'sol' });
    expect(scripts().length).toBe(0);
    expect(window.dataLayer).toBeUndefined();
  });

  it('init injects gtag.js and configures the id', () => {
    createAnalytics({ id: 'G-TEST', enabled: true }).init();
    expect(scripts().length).toBe(1);
    expect(scripts()[0].getAttribute('src')).toBe('https://www.googletagmanager.com/gtag/js?id=G-TEST');
    expect(scripts()[0].async).toBe(true);
    expect(entries()[0][0]).toBe('js');
    expect(entries()[1]).toEqual(['config', 'G-TEST']);
  });

  it('init is idempotent', () => {
    const a = createAnalytics({ id: 'G-TEST', enabled: true });
    a.init();
    a.init();
    expect(scripts().length).toBe(1);
  });

  it('track sends an event after init', () => {
    const a = createAnalytics({ id: 'G-TEST', enabled: true });
    a.init();
    a.track('app_open', { app_id: 'sol' });
    expect(entries().at(-1)).toEqual(['event', 'app_open', { app_id: 'sol' }]);
  });

  it('track before init sends nothing', () => {
    const a = createAnalytics({ id: 'G-TEST', enabled: true });
    a.track('app_open', { app_id: 'sol' });
    expect(window.dataLayer).toBeUndefined();
  });

  it('track never throws, even if gtag does', () => {
    const a = createAnalytics({ id: 'G-TEST', enabled: true });
    a.init();
    window.gtag = () => { throw new Error('blocked'); };
    expect(() => a.track('x')).not.toThrow();
  });
});
