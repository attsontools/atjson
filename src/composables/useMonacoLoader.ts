import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api.js';

type MonacoModule = typeof Monaco;

let monacoPromise: Promise<MonacoModule> | null = null;

export function loadMonaco(): Promise<MonacoModule> {
  if (!monacoPromise) {
    monacoPromise = (async () => {
      const [{ default: editorWorker }, { default: jsonWorker }, monaco] = await Promise.all([
        import('monaco-editor/esm/vs/editor/editor.worker?worker'),
        import('monaco-editor/esm/vs/language/json/json.worker?worker'),
        import('monaco-editor/esm/vs/editor/editor.api.js'),
        import('monaco-editor/esm/vs/language/json/monaco.contribution.js'),
      ]);
      (self as unknown as { MonacoEnvironment: Monaco.Environment }).MonacoEnvironment = {
        getWorker(_workerId, label) {
          if (label === 'json') return new jsonWorker();
          return new editorWorker();
        },
      };
      return monaco;
    })();
  }
  return monacoPromise;
}
