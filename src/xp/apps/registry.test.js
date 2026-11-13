import { describe, it, expect, vi } from 'vitest';
import { createRegistry } from './registry.js';

describe('registry', () => {
  it('launches registered apps with the shell context and payload', () => {
    const calls = [];
    const ctx = { dialogs: { message: (o) => calls.push(o) } };
    const registry = createRegistry(ctx);
    registry.register('notepad', { name: 'Notepad', icon: 'notepad', launch: (c, payload) => calls.push([c === ctx, payload]) });
    registry.launch('notepad', { title: 'a.txt' });
    expect(calls).toEqual([[true, { title: 'a.txt' }]]);
    expect(registry.list()).toEqual([{ id: 'notepad', name: 'Notepad', icon: 'notepad' }]);
  });
  it('shows a Windows cannot find error for unknown ids', () => {
    const calls = [];
    const registry = createRegistry({ dialogs: { message: (o) => calls.push(o) } });
    registry.launch('cmd');
    expect(calls[0]).toMatchObject({ kind: 'error' });
    expect(calls[0].text).toContain("Windows cannot find 'cmd'");
  });
  it('reports app_open for registered apps without leaking the payload', () => {
    const track = vi.fn();
    const registry = createRegistry({ track, dialogs: { message: () => {} } });
    registry.register('notepad', { name: 'Notepad', icon: 'notepad', launch: () => {} });
    registry.launch('notepad', { title: 'a.txt' });
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('app_open', { app_id: 'notepad' });
  });
  it('includes only path and slug from the payload', () => {
    const track = vi.fn();
    const registry = createRegistry({ track, dialogs: { message: () => {} } });
    registry.register('explorer', { name: 'Explorer', icon: 'x', launch: () => {} });
    registry.register('viewer', { name: 'Viewer', icon: 'x', launch: () => {} });
    registry.launch('explorer', { path: 'C:\X', owner: {}, junk: 1 });
    registry.launch('viewer', { slug: 'coin-pusher', index: 0, slideshow: true });
    expect(track).toHaveBeenNthCalledWith(1, 'app_open', { app_id: 'explorer', path: 'C:\X' });
    expect(track).toHaveBeenNthCalledWith(2, 'app_open', { app_id: 'viewer', slug: 'coin-pusher' });
  });
  it('does not report unknown ids', () => {
    const track = vi.fn();
    const messages = [];
    const registry = createRegistry({ track, dialogs: { message: (o) => messages.push(o) } });
    registry.launch('cmd');
    expect(track).not.toHaveBeenCalled();
    expect(messages).toHaveLength(1);
  });
});
