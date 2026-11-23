import { describe, expect, it, vi } from 'vitest';

import { replaceEditorValue, resolveEditorHistoryShortcut } from './editorHistory';

function createEditor(current = '{"before":true}', hasModel = true) {
  const range = { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 16 };
  return {
    getValue: vi.fn(() => current),
    getModel: vi.fn(() => hasModel ? { getFullModelRange: () => range } : null),
    pushUndoStop: vi.fn(() => true),
    executeEdits: vi.fn(() => true),
    setValue: vi.fn(),
    range,
  };
}

describe('replaceEditorValue', () => {
  it('replaces the complete model as one undoable edit', () => {
    const editor = createEditor();

    expect(replaceEditorValue(editor, '{"after":true}')).toBe(true);
    expect(editor.pushUndoStop).toHaveBeenCalledTimes(2);
    expect(editor.executeEdits).toHaveBeenCalledWith('external-value', [{
      range: editor.range,
      text: '{"after":true}',
      forceMoveMarkers: true,
    }]);
    expect(editor.pushUndoStop.mock.invocationCallOrder[0])
      .toBeLessThan(editor.executeEdits.mock.invocationCallOrder[0]);
    expect(editor.executeEdits.mock.invocationCallOrder[0])
      .toBeLessThan(editor.pushUndoStop.mock.invocationCallOrder[1]);
  });

  it('does not create history when the value is unchanged or the model is unavailable', () => {
    const unchanged = createEditor();
    const unavailable = createEditor('{"before":true}', false);

    expect(replaceEditorValue(unchanged, '{"before":true}')).toBe(false);
    expect(replaceEditorValue(unavailable, '{"after":true}')).toBe(false);
    expect(unchanged.executeEdits).not.toHaveBeenCalled();
    expect(unavailable.executeEdits).not.toHaveBeenCalled();
  });

  it('directly updates read-only editors because Monaco rejects executeEdits for them', () => {
    const editor = createEditor();

    expect(replaceEditorValue(editor, '{"result":true}', false)).toBe(true);
    expect(editor.setValue).toHaveBeenCalledWith('{"result":true}');
    expect(editor.pushUndoStop).not.toHaveBeenCalled();
    expect(editor.executeEdits).not.toHaveBeenCalled();
  });
});

describe('resolveEditorHistoryShortcut', () => {
  it.each([
    ['Control+Z', { key: 'z', ctrlKey: true }, 'undo'],
    ['Command+Z', { key: 'Z', metaKey: true }, 'undo'],
    ['Control+Shift+Z', { key: 'z', ctrlKey: true, shiftKey: true }, 'redo'],
    ['Command+Shift+Z', { key: 'z', metaKey: true, shiftKey: true }, 'redo'],
    ['Control+Y', { key: 'y', ctrlKey: true }, 'redo'],
  ])('maps %s to editor history', (_label, event, expected) => {
    expect(resolveEditorHistoryShortcut(event)).toBe(expected);
  });

  it.each([
    { key: 'z' },
    { key: 'z', ctrlKey: true, altKey: true },
    { key: 'y', metaKey: true },
  ])('ignores unrelated shortcuts %#', (event) => {
    expect(resolveEditorHistoryShortcut(event)).toBeNull();
  });
});
