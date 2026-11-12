import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  assertVersionAlignment,
  expectedReleaseAssets,
  verifyReleaseAssets
} from '../scripts/verify-release.mjs';

const version = '0.1.0-alpha.1';

describe('JSON production release contract', () => {
  it('requires tag, package, Tauri and Cargo versions to align', () => {
    expect(() => assertVersionAlignment({
      tagName: `v${version}`,
      packageVersion: version,
      tauriVersion: version,
      cargoVersion: version
    })).not.toThrow();
  });

  it('requires exactly five standalone and five plugin assets', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'atjson-release-assets-'));
    const expected = [
      `AT.JSON_${version}_linux_aarch64.atpkg`,
      `AT.JSON_${version}_linux_aarch64.deb`,
      `AT.JSON_${version}_linux_x86_64.atpkg`,
      `AT.JSON_${version}_linux_x86_64.deb`,
      `AT.JSON_${version}_macos_aarch64.atpkg`,
      `AT.JSON_${version}_macos_aarch64.dmg`,
      `AT.JSON_${version}_macos_x86_64.atpkg`,
      `AT.JSON_${version}_macos_x86_64.dmg`,
      `AT.JSON_${version}_windows_x86_64.atpkg`,
      `AT.JSON_${version}_windows_x86_64.exe`
    ];
    expect(expectedReleaseAssets(version)).toEqual(expected);
    try {
      await Promise.all(expected.map((name) => writeFile(path.join(directory, name), 'asset')));
      await expect(verifyReleaseAssets(directory, version)).resolves.toBeUndefined();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
