/**
 * Decide which experience to load.
 * @param {{query?: string, hasWebGL2?: boolean, coarsePointer?: boolean, viewportWidth?: number}} env
 * @returns {'room' | 'flat' | 'phone'}
 *   room  - the 3D bedroom; flat - the 1024x768 XP desktop scaled to fit;
 *   phone - the résumé as a normal responsive page (the desktop scaled to a phone is ~4px text).
 */
export function pickMode({ query = '', hasWebGL2 = true, coarsePointer = false, viewportWidth = 1280 } = {}) {
  const forced = new URLSearchParams(query).get('mode');
  if (forced === 'flat' || forced === 'room' || forced === 'phone') return forced;
  if (viewportWidth < PHONE_MAX_WIDTH) return 'phone';
  if (!hasWebGL2 || coarsePointer || viewportWidth < 900) return 'flat';
  return 'room';
}

/** Below this width the desktop would be scaled under ~0.7x, so the résumé page is shown instead. */
export const PHONE_MAX_WIDTH = 700;

/** True when the URL asks to open the résumé straight away (`?open=resume`). */
export function wantsResume(query = '') {
  return new URLSearchParams(query).get('open') === 'resume';
}

/** Read the real browser environment (not unit tested). */
export function detectEnv() {
  let hasWebGL2 = false;
  try {
    hasWebGL2 = !!document.createElement('canvas').getContext('webgl2');
  } catch { hasWebGL2 = false; }
  const coarsePointer = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  return { query: location.search, hasWebGL2, coarsePointer, viewportWidth: innerWidth };
}
