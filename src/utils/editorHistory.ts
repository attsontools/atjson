interface EditorModelLike {
  getFullModelRange: () => unknown;
}

interface EditorLike {
  getValue: () => string;
  getModel: () => EditorModelLike | null;
  pushUndoStop: () => boolean;
  setValue: (value: string) => void;
  executeEdits: (
    source: string,
    edits: Array<{ range: unknown; text: string; forceMoveMarkers: boolean }>,
  ) => boolean;
}

interface HistoryShortcutLike {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

export type EditorHistoryAction = 'undo' | 'redo';

export function replaceEditorValue(editor: EditorLike, next: string, recordHistory = true): boolean {
  if (editor.getValue() === next) return false;
  if (!recordHistory) {
    editor.setValue(next);
    return true;
  }
  const model = editor.getModel();
  if (!model) return false;

  editor.pushUndoStop();
  const changed = editor.executeEdits('external-value', [{
    range: model.getFullModelRange(),
    text: next,
    forceMoveMarkers: true,
  }]);
  editor.pushUndoStop();
  return changed;
}

export function resolveEditorHistoryShortcut(event: HistoryShortcutLike): EditorHistoryAction | null {
  if (event.altKey) return null;

  const key = event.key.toLowerCase();
  const commandModifier = !!event.ctrlKey || !!event.metaKey;
  if (key === 'z' && commandModifier) return event.shiftKey ? 'redo' : 'undo';
  if (key === 'y' && event.ctrlKey && !event.metaKey && !event.shiftKey) return 'redo';
  return null;
}
