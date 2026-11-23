import { describe, expect, it, vi } from 'vitest';

import { downloadText, normalizeDownloadFilename } from './textDownload';

describe('normalizeDownloadFilename', () => {
  it.each([
    [' order ', 'json', 'order.json'],
    ['order.json', '.json', 'order.json'],
    ['api/result:latest', 'json', 'api_result_latest.json'],
    ['   ', 'json', 'json-output.json'],
  ])('normalizes %j with %j', (title, extension, expected) => {
    expect(normalizeDownloadFilename(title, extension)).toBe(expected);
  });
});

describe('downloadText', () => {
  it('downloads a text blob and releases its object URL', async () => {
    const createObjectUrl = vi.fn((_blob: Blob) => 'blob:json-output');
    const clickDownload = vi.fn();
    const revokeObjectUrl = vi.fn();

    const filename = downloadText('{"ok":true}', 'result', 'json', 'application/json', {
      createObjectUrl,
      clickDownload,
      revokeObjectUrl,
    });

    expect(filename).toBe('result.json');
    const blob = createObjectUrl.mock.calls[0][0];
    expect(blob.type).toBe('application/json');
    expect(await blob.text()).toBe('{"ok":true}');
    expect(clickDownload).toHaveBeenCalledWith('blob:json-output', 'result.json');
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:json-output');
  });
});
