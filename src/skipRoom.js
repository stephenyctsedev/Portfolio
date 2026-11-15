/** Relative on purpose: keeps whatever base path the site is served from. */
export const SKIP_ROOM_HREF = '?mode=flat&open=resume';

/**
 * A real link on the room's first screen that jumps to the flat desktop with the résumé open.
 * It never cancels the click: the browser does the navigation, so it also works while the
 * room is still loading.
 */
export function createSkipLink(parent, { track = () => {} } = {}) {
  const a = document.createElement('a');
  a.className = 'skip-room';
  a.href = SKIP_ROOM_HREF;
  a.textContent = 'Skip the room — View résumé →';
  // The page is about to unload, so ask analytics to send the event as a beacon.
  a.addEventListener('click', () => track('skip_room', { transport_type: 'beacon' }));
  parent.append(a);
  return a;
}

/** The link would sit on the XP desktop's top-left icons while the monitor is focused. */
export function hideWhileScreenFocused(link, room) {
  room.on('screenFocused', () => { link.hidden = true; });
  room.on('screenLeft', () => { link.hidden = false; });
}
