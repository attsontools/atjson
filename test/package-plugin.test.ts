import { generateKeyPairSync } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  createPluginManifest,
  loadPublisherSigningConfig
} from '../scripts/package-plugin.mjs';

describe('JSON plugin package contract', () => {
  it('pins the published Plugin SDK release', async () => {
    const packageJson = JSON.parse(await readFile(path.resolve(import.meta.dirname, '..', 'package.json'), 'utf8'));
    expect(packageJson.dependencies['@attson/plugin-sdk'])
      .toBe('github:attsontools/attool-plugin-sdk#v0.1.0-alpha.0');
  });

  it('uses the JSON application identity and minimum permission', () => {
    const manifest = createPluginManifest('0.1.0', 'linux', 'x86_64', {
      'ui/index.html': 'a'.repeat(64),
      'ui/assets/jsonWorker.js': 'b'.repeat(64)
    }, 'attson-json-2026-01');

    expect(manifest.appId).toBe('com.attson.json');
    expect(manifest.name).toBe('JSON 工具');
    expect(manifest.permissions).toEqual(['host.theme.read']);
    expect(Object.keys(manifest.files)).toContain('ui/assets/jsonWorker.js');
  });

  it('requires matching Ed25519 publisher configuration', () => {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    const publicKeyBase64 = Buffer.from(
      publicKey.export({ format: 'jwk' }).x,
      'base64url'
    ).toString('base64');

    const config = loadPublisherSigningConfig({
      ATJSON_PUBLISHER_KEY_ID: 'attson-json-2026-01',
      ATJSON_PUBLISHER_PRIVATE_KEY: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
      ATJSON_PUBLISHER_PUBLIC_KEY: publicKeyBase64
    });
    expect(config.keyId).toBe('attson-json-2026-01');
  });
});
