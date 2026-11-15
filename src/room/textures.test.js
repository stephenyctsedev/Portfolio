import { describe, it, expect, vi, afterEach } from 'vitest';
import * as THREE from 'three';
import { canvasTexture, makeRoomTextures, makePosterTexture, fitFontSize } from './textures.js';

// Regression: the poster font size only looked at height, so "PROGRAMMER" ran past the poster frame
// whenever the fallback font (no Impact installed) was wider than Impact.
describe('fitFontSize', () => {
  const measure = (size, text) => text.length * size * 0.6;

  it('keeps the maximum size when every line already fits', () => {
    expect(fitFontSize(measure, ['NOW', 'HIRING:'], { maxSize: 46, maxWidth: 400 })).toBe(46);
  });
  it('shrinks until the widest line fits the width', () => {
    const size = fitFontSize(measure, ['NOW', 'PROGRAMMER'], { maxSize: 46, maxWidth: 200 });
    expect(size).toBe(33);
    expect(measure(size, 'PROGRAMMER')).toBeLessThanOrEqual(200);
    expect(measure(size + 1, 'PROGRAMMER')).toBeGreaterThan(200);
  });
  it('never drops below the minimum size', () => {
    expect(fitFontSize(measure, ['PROGRAMMER'], { maxSize: 46, maxWidth: 5, minSize: 10 })).toBe(10);
  });
  it('keeps the maximum size when the canvas cannot measure text', () => {
    expect(fitFontSize(() => undefined, ['PROGRAMMER'], { maxSize: 46, maxWidth: 100 })).toBe(46);
    expect(fitFontSize(() => NaN, ['PROGRAMMER'], { maxSize: 46, maxWidth: 100 })).toBe(46);
  });
});

const fakeContext = () => new Proxy({}, {
  get: (_, key) => (key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {}),
  set: () => true,
});

describe('poster text', () => {
  afterEach(() => vi.restoreAllMocks());

  // A canvas that measures text as 0.6em per character in whatever font is currently set, like a wide fallback font,
  // and records every line that gets drawn.
  const recordingContext = () => {
    const drawn = [];
    const state = { font: '10px sans-serif' };
    const ctx = new Proxy(state, {
      get: (target, key) => {
        if (key === 'measureText') return (text) => ({ width: text.length * parseFloat(/(\d+(?:\.\d+)?)px/.exec(target.font)[1]) * 0.6 });
        if (key === 'fillText') return (text) => drawn.push({ text, font: target.font });
        if (key in target) return target[key];
        return () => {};
      },
      set: (target, key, value) => { target[key] = value; return true; },
    });
    return { ctx, drawn };
  };

  it('prints the live site address, not the old repository name', () => {
    const { ctx, drawn } = recordingContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
    makePosterTexture(['STAY', 'CURIOUS']);
    const texts = drawn.map((d) => d.text);
    expect(texts).toContain('stephenyctsedev.github.io/Portfolio');
    expect(texts.join(' ')).not.toContain('XPcomputer');
  });

  it('keeps every line of the poster, including the small URL footer, inside the frame', () => {
    const { ctx, drawn } = recordingContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
    makePosterTexture(['NOW', 'HIRING:', 'GAME', 'PROGRAMMER']);
    expect(drawn.map((d) => d.text)).toContain('PROGRAMMER');
    expect(drawn.length).toBeGreaterThan(4); // headline lines plus the footer
    for (const { text, font } of drawn) {
      const width = text.length * parseFloat(/(\d+(?:\.\d+)?)px/.exec(font)[1]) * 0.6;
      expect(width, `"${text}" is ${width}px wide`).toBeLessThanOrEqual(256 - 40);
    }
  });
});

describe('textures', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns null instead of throwing when canvas 2D is unavailable', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(canvasTexture(8, 8, () => {})).toBeNull();
    expect(makeRoomTextures()).toEqual({ city: null, grid: null, posterA: null, posterB: null });
  });

  it('draws into a CanvasTexture in sRGB when a context exists', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(fakeContext);
    let drawn = null;
    const tex = canvasTexture(64, 32, (ctx, w, h) => { drawn = [w, h]; ctx.fillRect(0, 0, w, h); });
    expect(tex).toBeInstanceOf(THREE.CanvasTexture);
    expect(tex.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(drawn).toEqual([64, 32]);
    const set = makeRoomTextures();
    for (const key of ['city', 'grid', 'posterA', 'posterB']) expect(set[key], key).toBeInstanceOf(THREE.CanvasTexture);
  });
});
