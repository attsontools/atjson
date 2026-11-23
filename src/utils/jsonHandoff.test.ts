import { describe, expect, it } from 'vitest';

import {
  createJsonHandoffTitle,
  resolveJsonWorkspaceSeed,
  type JsonHandoffTarget,
} from './jsonHandoff';

describe('createJsonHandoffTitle', () => {
  it.each<[JsonHandoffTarget, string]>([
    ['format', 'order.json · 副本'],
    ['query', 'order.json · 查询'],
    ['diff-left', 'order.json · 对比左侧'],
    ['diff-right', 'order.json · 对比右侧'],
    ['convert', 'order.json · 转换'],
  ])('names the %s destination', (target, expected) => {
    expect(createJsonHandoffTitle('order.json', target)).toBe(expected);
  });
});

describe('resolveJsonWorkspaceSeed', () => {
  it.each([
    ['format', 'format', '{"id":1}', '', '', '', ''],
    ['query', 'query', '', '{"id":1}', '', '', ''],
    ['diff-left', 'diff', '', '', '{"id":1}', '', ''],
    ['diff-right', 'diff', '', '', '', '{"id":1}', ''],
    ['convert', 'convert', '', '', '', '', '{"id":1}'],
  ] as const)(
    'routes %s into the expected pane input',
    (target, activePane, formatText, querySource, diffLeft, diffRight, convertSource) => {
      expect(resolveJsonWorkspaceSeed({ target, text: '{"id":1}' })).toEqual({
        activePane,
        formatText,
        querySource,
        diffLeft,
        diffRight,
        convertSource,
      });
    },
  );

  it('returns a blank format workspace without a seed', () => {
    expect(resolveJsonWorkspaceSeed()).toEqual({
      activePane: 'format',
      formatText: '',
      querySource: '',
      diffLeft: '',
      diffRight: '',
      convertSource: '',
    });
  });
});
