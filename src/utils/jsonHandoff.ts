export type JsonWorkspacePane = 'format' | 'query' | 'diff' | 'convert';

export type JsonHandoffTarget =
  | 'format'
  | 'query'
  | 'diff-left'
  | 'diff-right'
  | 'convert';

export interface JsonWorkspaceSeed {
  target: JsonHandoffTarget;
  text: string;
}

export interface ResolvedJsonWorkspaceSeed {
  activePane: JsonWorkspacePane;
  formatText: string;
  querySource: string;
  diffLeft: string;
  diffRight: string;
  convertSource: string;
}

const TARGET_LABELS: Record<JsonHandoffTarget, string> = {
  format: '副本',
  query: '查询',
  'diff-left': '对比左侧',
  'diff-right': '对比右侧',
  convert: '转换',
};

const TARGET_PANES: Record<JsonHandoffTarget, JsonWorkspacePane> = {
  format: 'format',
  query: 'query',
  'diff-left': 'diff',
  'diff-right': 'diff',
  convert: 'convert',
};

export function createJsonHandoffTitle(
  sourceTitle: string,
  target: JsonHandoffTarget,
): string {
  return `${sourceTitle.trim() || 'JSON'} · ${TARGET_LABELS[target]}`;
}

export function resolveJsonWorkspaceSeed(
  seed?: JsonWorkspaceSeed,
): ResolvedJsonWorkspaceSeed {
  const text = seed?.text ?? '';
  return {
    activePane: seed ? TARGET_PANES[seed.target] : 'format',
    formatText: seed?.target === 'format' ? text : '',
    querySource: seed?.target === 'query' ? text : '',
    diffLeft: seed?.target === 'diff-left' ? text : '',
    diffRight: seed?.target === 'diff-right' ? text : '',
    convertSource: seed?.target === 'convert' ? text : '',
  };
}
