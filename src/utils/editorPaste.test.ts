import { describe, expect, it, vi } from 'vitest';

import { handlePlainTextPaste, type PlainTextPasteEvent } from './editorPaste';

function pasteEvent(text: string | null) {
  const preventDefault = vi.fn();
  const stopImmediatePropagation = vi.fn();
  const event: PlainTextPasteEvent = {
    clipboardData: text === null
      ? null
      : { getData: vi.fn((type: string) => type === 'text/plain' ? text : '') },
    preventDefault,
    stopImmediatePropagation,
  };
  return { event, preventDefault, stopImmediatePropagation };
}

describe('handlePlainTextPaste', () => {
  it('inserts user-pasted text exactly once and owns the event', () => {
    const { event, preventDefault, stopImmediatePropagation } = pasteEvent('{"ok":true}');
    const insert = vi.fn();

    expect(handlePlainTextPaste(event, insert)).toBe(true);
    expect(insert).toHaveBeenCalledOnce();
    expect(insert).toHaveBeenCalledWith('{"ok":true}');
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(stopImmediatePropagation).toHaveBeenCalledOnce();
  });

  it.each([null, ''])('leaves non-text paste events untouched', (text) => {
    const { event, preventDefault, stopImmediatePropagation } = pasteEvent(text);
    const insert = vi.fn();

    expect(handlePlainTextPaste(event, insert)).toBe(false);
    expect(insert).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
    expect(stopImmediatePropagation).not.toHaveBeenCalled();
  });
});
