import { describe, expect, it } from 'vitest';

import type { JsonPathSegment, JsonValue } from '../types/json';
import { deleteJsonNode } from './jsonTreeEdit';

const invalidCases: Array<[string, JsonValue, JsonPathSegment[]]> = [
  ['the root node', { value: 1 }, []],
  ['a missing object property', { value: 1 }, ['missing']],
  ['a string array index', { items: ['first'] }, ['items', '0']],
  ['a child of a primitive', { value: 1 }, ['value', 'child']],
];

describe('deleteJsonNode', () => {
  it('removes an object property without mutating the source value', () => {
    const source = {
      autoload: { files: ['app/helper.php'] },
      description: 'demo',
    };

    const result = deleteJsonNode(source, ['autoload']);

    expect(result).toEqual({
      ok: true,
      value: { description: 'demo' },
    });
    expect(source).toEqual({
      autoload: { files: ['app/helper.php'] },
      description: 'demo',
    });
  });

  it('removes a nested array element and compacts later indexes', () => {
    const source = { items: ['first', 'second', 'third'] };

    const result = deleteJsonNode(source, ['items', 1]);

    expect(result).toEqual({
      ok: true,
      value: { items: ['first', 'third'] },
    });
    expect(source.items).toEqual(['first', 'second', 'third']);
  });

  it.each(invalidCases)('rejects %s', (_label, source, path) => {
    expect(deleteJsonNode(source, path)).toEqual({ ok: false });
  });
});
