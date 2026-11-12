import { describe, expect, it, vi } from 'vitest';

import { createPluginHost } from '../src/host/plugin';
import { createStandaloneHost } from '../src/host/standalone';
import { copyText } from '../src/host/types';

describe('host adapters', () => {
  it('persists standalone theme changes and notifies the application', async () => {
    let stored = 'light';
    const host = createStandaloneHost({
      readTheme: () => stored,
      writeTheme: (theme) => { stored = theme; }
    });
    const onTheme = vi.fn();

    await expect(host.initialize(onTheme)).resolves.toBe('light');
    await expect(host.toggleTheme()).resolves.toBe('dark');
    expect(stored).toBe('dark');
    expect(onTheme).toHaveBeenCalledWith('dark');
  });

  it('connects the plugin with the JSON app id and follows host theme changes', async () => {
    let listener: ((theme: 'dark' | 'light') => void) | undefined;
    const close = vi.fn();
    const connect = vi.fn(async () => ({
      handshake: async () => ({ theme: 'dark' as const }),
      onThemeChange(next: (theme: 'dark' | 'light') => void) { listener = next; return vi.fn(); },
      close
    }));
    const host = createPluginHost(connect);
    const onTheme = vi.fn();

    await expect(host.initialize(onTheme)).resolves.toBe('dark');
    expect(connect).toHaveBeenCalledWith('com.attson.json');
    listener?.('light');
    expect(onTheme).toHaveBeenCalledWith('light');
    host.dispose();
    expect(close).toHaveBeenCalledOnce();
  });

  it('falls back when clipboard write is denied', async () => {
    const fallbackCopy = vi.fn(() => true);
    await expect(copyText('value', {
      writeClipboard: async () => { throw new Error('denied'); },
      fallbackCopy
    })).resolves.toBeUndefined();
    expect(fallbackCopy).toHaveBeenCalledWith('value');
  });
});
