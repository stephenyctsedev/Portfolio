import { describe, it, expect } from 'vitest';
import { pickMode, wantsResume } from './modes.js';

describe('wantsResume', () => {
  it('is true for ?open=resume', () => {
    expect(wantsResume('?mode=flat&open=resume')).toBe(true);
  });
  it('still is true when other params such as utm tags are present', () => {
    expect(wantsResume('?mode=flat&open=resume&utm_source=linkedin')).toBe(true);
  });
  it('is false without the flag', () => {
    expect(wantsResume('?mode=flat')).toBe(false);
    expect(wantsResume('')).toBe(false);
  });
  it('is false for any other open value', () => {
    expect(wantsResume('?open=other')).toBe(false);
  });
});

describe('pickMode', () => {
  const desktop = { query: '', hasWebGL2: true, coarsePointer: false, viewportWidth: 1440 };

  it('picks room on a capable desktop', () => {
    expect(pickMode(desktop)).toBe('room');
  });
  it('forces flat with ?mode=flat', () => {
    expect(pickMode({ ...desktop, query: '?mode=flat' })).toBe('flat');
  });
  it('forces room with ?mode=room even on touch', () => {
    expect(pickMode({ ...desktop, query: '?mode=room', coarsePointer: true })).toBe('room');
  });
  it('falls back to flat without WebGL2', () => {
    expect(pickMode({ ...desktop, hasWebGL2: false })).toBe('flat');
  });
  it('falls back to flat on coarse pointers', () => {
    expect(pickMode({ ...desktop, coarsePointer: true })).toBe('flat');
  });
  it('falls back to flat under 900px wide', () => {
    expect(pickMode({ ...desktop, viewportWidth: 899 })).toBe('flat');
    expect(pickMode({ ...desktop, viewportWidth: 900 })).toBe('room');
  });
});
