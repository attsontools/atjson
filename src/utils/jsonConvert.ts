import yaml from 'js-yaml';
import toml from '@iarna/toml';
import type { ConvertFormat, JsonValue } from '../types/json';

export type ConvertResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

export function convert(text: string, from: ConvertFormat, to: ConvertFormat): ConvertResult {
  if (from === to) return { ok: true, value: text };
  let parsed: JsonValue;
  try {
    parsed = parseFormat(text, from);
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
  try {
    return { ok: true, value: stringifyFormat(parsed, to) };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

function parseFormat(text: string, format: ConvertFormat): JsonValue {
  switch (format) {
    case 'json':
      return JSON.parse(text) as JsonValue;
    case 'yaml':
      return yaml.load(text) as JsonValue;
    case 'toml':
      return toml.parse(text) as unknown as JsonValue;
    case 'csv':
      return parseCsv(text);
  }
}

function stringifyFormat(value: JsonValue, format: ConvertFormat): string {
  switch (format) {
    case 'json':
      return JSON.stringify(value, null, 2);
    case 'yaml':
      return yaml.dump(value);
    case 'toml':
      return toml.stringify(value as Parameters<typeof toml.stringify>[0]);
    case 'csv':
      return toCsv(value);
  }
}

function toCsv(value: JsonValue): string {
  if (!Array.isArray(value)) {
    throw new Error('CSV 仅支持顶层为数组的结构');
  }
  if (value.length === 0) return '';
  const keys = new Set<string>();
  for (const row of value) {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error('CSV 仅支持 array-of-flat-objects');
    }
    for (const [k, v] of Object.entries(row)) {
      if (v !== null && typeof v === 'object') {
        throw new Error('CSV 不支持嵌套结构');
      }
      keys.add(k);
    }
  }
  const cols = Array.from(keys);
  const lines = [cols.map(escapeCsv).join(',')];
  for (const row of value as Array<{ [k: string]: JsonValue }>) {
    lines.push(cols.map((c) => escapeCsv(formatScalar(row[c]))).join(','));
  }
  return lines.join('\n');
}

function formatScalar(v: JsonValue | undefined): string {
  if (v === undefined || v === null) return '';
  return String(v);
}

function escapeCsv(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function parseCsv(text: string): JsonValue {
  const rows = parseCsvRows(text);
  if (rows.length === 0) return [];
  const header = rows[0].values;
  const seenHeaders = new Set<string>();
  for (const key of header) {
    if (seenHeaders.has(key)) throw new Error(`CSV 表头包含重复列名“${key}”`);
    seenHeaders.add(key);
  }
  return rows.slice(1).map((row) => {
    if (row.values.length > header.length) {
      throw new Error(`第 ${row.line} 行 CSV 字段数为 ${row.values.length}，超过表头的 ${header.length} 列`);
    }
    const obj: { [k: string]: JsonValue } = {};
    header.forEach((key, i) => {
      obj[key] = row.values[i] ?? '';
    });
    return obj;
  });
}

interface CsvRow {
  values: string[];
  line: number;
}

function parseCsvRows(text: string): CsvRow[] {
  const rows: CsvRow[] = [];
  let field = '';
  let row: string[] = [];
  let i = 0;
  let inQuotes = false;
  let quoteClosed = false;
  let line = 1;
  let rowStartLine = 1;
  let quotedFieldStartLine = 1;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        quoteClosed = true;
        i++;
        continue;
      }
      if (ch === '\n') line++;
      else if (ch === '\r') {
        line++;
        if (text[i + 1] === '\n') {
          field += '\r\n';
          i += 2;
          continue;
        }
      }
      field += ch;
      i++;
      continue;
    }
    if (quoteClosed && ch !== ',' && ch !== '\n' && ch !== '\r') {
      throw new Error(`第 ${line} 行 CSV 引号闭合后存在无效字符`);
    }
    if (ch === '"') {
      if (field.length > 0) throw new Error(`第 ${line} 行 CSV 引号必须位于字段开头`);
      inQuotes = true;
      quotedFieldStartLine = line;
      i++;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      quoteClosed = false;
      i++;
      continue;
    }
    if (ch === '\n' || ch === '\r') {
      row.push(field);
      rows.push({ values: row, line: rowStartLine });
      row = [];
      field = '';
      quoteClosed = false;
      if (ch === '\r' && text[i + 1] === '\n') i += 2;
      else i++;
      line++;
      rowStartLine = line;
      continue;
    }
    field += ch;
    i++;
  }
  if (inQuotes) throw new Error(`第 ${quotedFieldStartLine} 行 CSV 字段的引号未闭合`);
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push({ values: row, line: rowStartLine });
  }
  return rows.filter((r) => r.values.length > 0 && !(r.values.length === 1 && r.values[0] === ''));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
