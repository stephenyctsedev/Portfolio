/** Google Analytics 4. Loads gtag.js in production builds only; track() never throws. */
export const GA_MEASUREMENT_ID = 'G-MB5F6MLB8Q';

export function createAnalytics({ id, enabled, doc = document, win = window }) {
  let started = false;
  return {
    init() {
      if (!enabled || started) return;
      started = true;
      win.dataLayer ||= [];
      // gtag.js requires the `arguments` object itself on the dataLayer, not an array.
      win.gtag = function gtag() { win.dataLayer.push(arguments); };
      win.gtag('js', new Date());
      win.gtag('config', id);
      const script = doc.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
      doc.head.append(script);
    },
    track(name, params) {
      if (!enabled || !started) return;
      try { win.gtag('event', name, params); } catch { /* analytics must never break the app */ }
    },
  };
}

export const { init: initAnalytics, track } = createAnalytics({ id: GA_MEASUREMENT_ID, enabled: import.meta.env.PROD });
