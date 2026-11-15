import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSkipLink, hideWhileScreenFocused, SKIP_ROOM_HREF } from './skipRoom.js';

describe('createSkipLink', () => {
  let parent;
  beforeEach(() => { document.body.innerHTML = '<div id="app"></div>'; parent = document.querySelector('#app'); });

  it('creates a real link to flat mode that opens the résumé', () => {
    const a = createSkipLink(parent);
    expect(SKIP_ROOM_HREF).toBe('?mode=flat&open=resume');
    expect(a.getAttribute('href')).toBe('?mode=flat&open=resume');
    expect(a.textContent).toBe('Skip the room — View résumé →');
    expect(a.parentElement).toBe(parent);
  });

  it('tracks the click without cancelling navigation', () => {
    const track = vi.fn();
    const a = createSkipLink(parent, { track });
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    a.dispatchEvent(event);
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('skip_room', { transport_type: 'beacon' });
    expect(event.defaultPrevented).toBe(false);
  });

  it('works without a track function', () => {
    const a = createSkipLink(parent);
    expect(() => a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))).not.toThrow();
  });
});

describe('hideWhileScreenFocused', () => {
  it('hides while the monitor is focused and returns when it is left', () => {
    const handlers = {};
    const room = { on: (event, fn) => { handlers[event] = fn; } };
    const link = document.createElement('a');
    hideWhileScreenFocused(link, room);
    expect(link.hidden).toBe(false);
    handlers.screenFocused();
    expect(link.hidden).toBe(true);
    handlers.screenLeft();
    expect(link.hidden).toBe(false);
  });
});
