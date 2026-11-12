import { describe, expect, it } from 'vitest';
import { convert } from './jsonConvert';

describe('convert JSON → YAML', () => {
  it('produces YAML', () => {
    const result = convert('{"a":1,"b":[2,3]}', 'json', 'yaml');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toContain('a: 1');
    expect(result.value).toContain('- 2');
  });
});

describe('convert YAML → JSON', () => {
  it('round-trips object', () => {
    const result = convert('a: 1\nb:\n  - 2\n  - 3\n', 'yaml', 'json');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.parse(result.value)).toEqual({ a: 1, b: [2, 3] });
  });
});

describe('convert JSON → TOML', () => {
  it('produces TOML', () => {
    const result = convert('{"a":1,"section":{"key":"v"}}', 'json', 'toml');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toContain('a = 1');
    expect(result.value).toContain('[section]');
  });
});

describe('convert TOML → JSON', () => {
  it('round-trips object', () => {
    const result = convert('a = 1\n[section]\nkey = "v"\n', 'toml', 'json');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.parse(result.value)).toEqual({ a: 1, section: { key: 'v' } });
  });
});

describe('convert JSON → CSV', () => {
  it('emits header + rows for flat arrays', () => {
    const result = convert('[{"a":1,"b":"x"},{"a":2,"b":"y"}]', 'json', 'csv');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe('a,b\n1,x\n2,y');
  });

  it('quotes fields containing commas / quotes / newlines', () => {
    const result = convert('[{"a":"hi, there","b":"\\"q\\""}]', 'json', 'csv');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe('a,b\n"hi, there","""q"""');
  });

  it('rejects non-array input', () => {
    const result = convert('{"a":1}', 'json', 'csv');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/CSV/);
  });

  it('rejects arrays with nested structures', () => {
    const result = convert('[{"a":1,"b":{"c":2}}]', 'json', 'csv');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/嵌套/);
  });
});

describe('convert CSV → JSON', () => {
  it('parses header + rows into array of objects', () => {
    const result = convert('a,b\n1,x\n2,y', 'csv', 'json');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.parse(result.value)).toEqual([
      { a: '1', b: 'x' },
      { a: '2', b: 'y' },
    ]);
  });

  it('handles quoted fields', () => {
    const result = convert('a,b\n"hi, there","""q"""', 'csv', 'json');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.parse(result.value)).toEqual([{ a: 'hi, there', b: '"q"' }]);
  });

  it('handles CRLF line endings', () => {
    const result = convert('a,b\r\n1,x\r\n2,y\r\n', 'csv', 'json');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.parse(result.value)).toEqual([
      { a: '1', b: 'x' },
      { a: '2', b: 'y' },
    ]);
  });

  it('rejects an unclosed quoted field', () => {
    const result = convert('a,b\n1,"unfinished', 'csv', 'json');

    expect(result).toEqual({ ok: false, error: '第 2 行 CSV 字段的引号未闭合' });
  });

  it('rejects duplicate headers instead of overwriting a value', () => {
    const result = convert('a,a\n1,2', 'csv', 'json');

    expect(result).toEqual({ ok: false, error: 'CSV 表头包含重复列名“a”' });
  });

  it('rejects rows with more fields than the header', () => {
    const result = convert('a,b\n1,2,3', 'csv', 'json');

    expect(result).toEqual({ ok: false, error: '第 2 行 CSV 字段数为 3，超过表头的 2 列' });
  });

  it('rejects a quote that starts in the middle of an unquoted field', () => {
    const result = convert('a,b\n1,ab"cd"', 'csv', 'json');

    expect(result).toEqual({ ok: false, error: '第 2 行 CSV 引号必须位于字段开头' });
  });

  it('rejects characters after a quoted field closes', () => {
    const result = convert('a,b\n1,"ab"cd', 'csv', 'json');

    expect(result).toEqual({ ok: false, error: '第 2 行 CSV 引号闭合后存在无效字符' });
  });
});

describe('convert error handling', () => {
  it('returns error for invalid YAML', () => {
    const result = convert(': : :', 'yaml', 'json');
    expect(result.ok).toBe(false);
  });
});
