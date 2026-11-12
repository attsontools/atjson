import { describe, it, expect } from 'vitest';
import { createJsonWorkerClient, type WorkerLike } from './useJsonWorker';
import type { WorkerRes } from '../workers/jsonWorker';

function makeMockWorker() {
  let listener: ((ev: { data: WorkerRes }) => void) | null = null;
  let errorListener: ((ev: { message?: string; error?: unknown }) => void) | null = null;
  let messageErrorListener: ((ev: { data?: unknown }) => void) | null = null;
  const posted: unknown[] = [];
  const w: WorkerLike = {
    postMessage(msg) { posted.push(msg); },
    addEventListener(type, l) {
      if (type === 'message') listener = l as typeof listener;
      else if (type === 'error') errorListener = l as typeof errorListener;
      else messageErrorListener = l as typeof messageErrorListener;
    },
    terminate() {},
  };
  const reply = (msg: WorkerRes) => { listener?.({ data: msg }); };
  const fail = (message: string) => { errorListener?.({ message }); };
  const failMessage = (data: unknown) => { messageErrorListener?.({ data }); };
  return { w, posted, reply, fail, failMessage };
}

describe('createJsonWorkerClient', () => {
  it('resolves parse with structured result', async () => {
    const mock = makeMockWorker();
    const client = createJsonWorkerClient(() => mock.w);
    const p = client.parse('{"a":1}');
    expect(mock.posted).toHaveLength(1);
    const req = mock.posted[0] as { id: number; kind: string };
    expect(req.kind).toBe('parse');
    mock.reply({ id: req.id, ok: true, kind: 'parse', value: { a: 1 }, elapsedMs: 3 });
    await expect(p).resolves.toEqual({ value: { a: 1 }, elapsedMs: 3 });
  });

  it('increments request id monotonically', async () => {
    const mock = makeMockWorker();
    const client = createJsonWorkerClient(() => mock.w);
    void client.parse('1');
    void client.parse('2');
    const ids = mock.posted.map((m) => (m as { id: number }).id);
    expect(ids[1]).toBe(ids[0] + 1);
  });

  it('cancels previous tagged request by resolving old promise with null (no worker cancel message)', async () => {
    const mock = makeMockWorker();
    const client = createJsonWorkerClient(() => mock.w);
    const p1 = client.parse('a', 'format:parse');
    const p2 = client.parse('b', 'format:parse');
    // Worker no longer accepts cancel messages — only parse requests are posted.
    expect(mock.posted).toHaveLength(2);
    expect((mock.posted[0] as { kind: string }).kind).toBe('parse');
    expect((mock.posted[1] as { kind: string }).kind).toBe('parse');
    const ids = mock.posted.map((m) => (m as { id: number }).id);
    // When worker eventually responds for the superseded p1, it must resolve to null.
    mock.reply({ id: ids[0], ok: true, kind: 'parse', value: 'a', elapsedMs: 1 });
    await expect(p1).resolves.toBeNull();
    // p2 still pending until we reply
    mock.reply({ id: ids[1], ok: true, kind: 'parse', value: 'b', elapsedMs: 1 });
    await expect(p2).resolves.toEqual({ value: 'b', elapsedMs: 1 });
  });

  it('parse error becomes resolved outcome with error field', async () => {
    const mock = makeMockWorker();
    const client = createJsonWorkerClient(() => mock.w);
    const p = client.parse('bad');
    const req = mock.posted[0] as { id: number };
    mock.reply({ id: req.id, ok: false, kind: 'parse', error: { message: 'boom' } });
    await expect(p).resolves.toEqual({ value: null, error: { message: 'boom' }, elapsedMs: 0 });
  });

  it('untagged requests are not cancelled by later ones', async () => {
    const mock = makeMockWorker();
    const client = createJsonWorkerClient(() => mock.w);
    void client.parse('a');
    void client.parse('b');
    const cancels = mock.posted.filter((m) => (m as { kind: string }).kind === 'cancel');
    expect(cancels).toHaveLength(0);
  });

  it('serialize error resolves to ok:false outcome (no hang)', async () => {
    const mock = makeMockWorker();
    const client = createJsonWorkerClient(() => mock.w);
    const p = client.serialize({ a: 1 }, 'format');
    const req = mock.posted[0] as { id: number };
    mock.reply({ id: req.id, ok: false, kind: 'serialize', error: { message: 'boom' } });
    await expect(p).resolves.toEqual({ ok: false, error: 'boom' });
  });

  it('jsonpath error resolves to ok:false outcome (no hang)', async () => {
    const mock = makeMockWorker();
    const client = createJsonWorkerClient(() => mock.w);
    const p = client.jsonpath({}, '][[[');
    const req = mock.posted[0] as { id: number };
    mock.reply({ id: req.id, ok: false, kind: 'jsonpath', error: { message: 'bad expr' } });
    await expect(p).resolves.toEqual({ ok: false, error: 'bad expr' });
  });

  it('serialize ok resolves to structured outcome', async () => {
    const mock = makeMockWorker();
    const client = createJsonWorkerClient(() => mock.w);
    const p = client.serialize({ a: 1 }, 'format');
    const req = mock.posted[0] as { id: number };
    mock.reply({ id: req.id, ok: true, kind: 'serialize', text: '{"a":1}', elapsedMs: 2 });
    await expect(p).resolves.toEqual({ ok: true, text: '{"a":1}', elapsedMs: 2 });
  });

  it('jsonpath ok resolves to structured outcome', async () => {
    const mock = makeMockWorker();
    const client = createJsonWorkerClient(() => mock.w);
    const p = client.jsonpath({ a: [1] }, '$.a[*]');
    const req = mock.posted[0] as { id: number };
    mock.reply({ id: req.id, ok: true, kind: 'jsonpath', matches: [1], text: '[1]', elapsedMs: 1 });
    await expect(p).resolves.toEqual({ ok: true, matches: [1], text: '[1]', elapsedMs: 1 });
  });

  it('posts both JSON diff options to the worker', async () => {
    const mock = makeMockWorker();
    const client = createJsonWorkerClient(() => mock.w);
    const p = client.diff(
      '{"a":1}',
      '{"a":2}',
      false,
      { keyOnly: true, parseNestedJsonStrings: true },
      'diff:compare',
    );
    const req = mock.posted[0] as {
      id: number;
      kind: string;
      keyOnly?: boolean;
      parseNestedJsonStrings?: boolean;
    };

    expect(req).toMatchObject({
      kind: 'diff',
      keyOnly: true,
      parseNestedJsonStrings: true,
    });

    mock.reply({
      id: req.id,
      ok: true,
      kind: 'diff',
      equal: true,
      delta: null,
      changeCount: 0,
      leftText: '{}',
      rightText: '{}',
      html: null,
      elapsedMs: 1,
    });
    await expect(p).resolves.toMatchObject({ equal: true, changeCount: 0 });
  });

  it('rejects every pending request when the worker crashes', async () => {
    const mock = makeMockWorker();
    const client = createJsonWorkerClient(() => mock.w);
    const parse = client.parse('{"a":1}');
    const convert = client.convert('{}', 'json', 'yaml');

    mock.fail('worker script failed');

    await expect(parse).rejects.toThrow('JSON Worker 运行失败：worker script failed');
    await expect(convert).rejects.toThrow('JSON Worker 运行失败：worker script failed');
    await expect(client.parse('{}')).rejects.toThrow('JSON Worker 运行失败：worker script failed');
  });

  it('rejects pending requests when a worker message cannot be decoded', async () => {
    const mock = makeMockWorker();
    const client = createJsonWorkerClient(() => mock.w);
    const parse = client.parse('{"a":1}');

    mock.failMessage({ broken: true });

    await expect(parse).rejects.toThrow('JSON Worker 消息解析失败');
  });

  it('rejects pending and future requests after dispose', async () => {
    const mock = makeMockWorker();
    const client = createJsonWorkerClient(() => mock.w);
    const parse = client.parse('{"a":1}');

    client.dispose();

    await expect(parse).rejects.toThrow('JSON Worker 已关闭');
    await expect(client.parse('{}')).rejects.toThrow('JSON Worker 已关闭');
  });
});
