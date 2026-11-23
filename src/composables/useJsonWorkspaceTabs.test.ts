import { describe, expect, it } from 'vitest';
import { hasWorkspaceInput, useJsonWorkspaceTabs } from './useJsonWorkspaceTabs';
import type { JsonWorkspaceSeed } from '../utils/jsonHandoff';

describe('hasWorkspaceInput', () => {
  it('treats whitespace-only text as unsaved user input', () => {
    expect(hasWorkspaceInput('')).toBe(false);
    expect(hasWorkspaceInput('', '')).toBe(false);
    expect(hasWorkspaceInput('   ')).toBe(true);
    expect(hasWorkspaceInput('', '\n')).toBe(true);
  });
});

describe('useJsonWorkspaceTabs', () => {
  it('starts with JSON 1 active', () => {
    const workspaces = useJsonWorkspaceTabs();

    expect(workspaces.tabs.value).toEqual([
      { id: 'json-workspace-1', title: 'JSON 1', dirty: false },
    ]);
    expect(workspaces.activeTabId.value).toBe('json-workspace-1');
  });

  it('creates and activates sequentially numbered workspaces', () => {
    const workspaces = useJsonWorkspaceTabs();

    workspaces.newTab();
    workspaces.newTab();

    expect(workspaces.tabs.value.map((tab) => tab.title)).toEqual([
      'JSON 1',
      'JSON 2',
      'JSON 3',
    ]);
    expect(workspaces.activeTabId.value).toBe('json-workspace-3');
  });

  it('creates a dirty titled workspace from a one-shot seed', () => {
    const workspaces = useJsonWorkspaceTabs();
    const seed: JsonWorkspaceSeed = { target: 'query', text: '{"id":1}' };

    const tab = workspaces.newTab({ title: 'order.json · 查询', seed });

    expect(tab).toEqual({
      id: 'json-workspace-2',
      title: 'order.json · 查询',
      dirty: true,
      seed,
    });
    expect(workspaces.activeTabId.value).toBe('json-workspace-2');
    expect(workspaces.clearSeed(tab.id)).toEqual(seed);
    expect(tab.seed).toBeUndefined();
    expect(tab.dirty).toBe(true);
  });

  it('activates only existing workspaces', () => {
    const workspaces = useJsonWorkspaceTabs();
    workspaces.newTab();

    workspaces.activateTab('json-workspace-1');
    expect(workspaces.activeTabId.value).toBe('json-workspace-1');

    workspaces.activateTab('missing');
    expect(workspaces.activeTabId.value).toBe('json-workspace-1');
  });

  it('tracks whether a workspace contains unsaved input', () => {
    const workspaces = useJsonWorkspaceTabs();

    expect(workspaces.setDirty('json-workspace-1', true)).toBe(true);
    expect(workspaces.tabs.value[0].dirty).toBe(true);

    expect(workspaces.setDirty('missing', true)).toBe(false);
  });

  it('renames an existing workspace with a non-empty trimmed title', () => {
    const workspaces = useJsonWorkspaceTabs();

    expect(workspaces.renameTab('json-workspace-1', '  order.json  ')).toBe(true);
    expect(workspaces.tabs.value[0].title).toBe('order.json');
    expect(workspaces.renameTab('json-workspace-1', '   ')).toBe(false);
    expect(workspaces.renameTab('missing', 'other.json')).toBe(false);
    expect(workspaces.tabs.value[0].title).toBe('order.json');
  });

  it('closes an inactive workspace without changing the active one', () => {
    const workspaces = useJsonWorkspaceTabs();
    workspaces.newTab();

    workspaces.closeTab('json-workspace-1');

    expect(workspaces.tabs.value.map((tab) => tab.id)).toEqual(['json-workspace-2']);
    expect(workspaces.activeTabId.value).toBe('json-workspace-2');
  });

  it('requires confirmation before closing a dirty workspace', () => {
    const workspaces = useJsonWorkspaceTabs();
    workspaces.setDirty('json-workspace-1', true);

    expect(workspaces.closeTab('json-workspace-1')).toBe('needs-confirmation');
    expect(workspaces.tabs.value).toHaveLength(1);

    expect(workspaces.closeTab('json-workspace-1', true)).toBe('closed');
    expect(workspaces.tabs.value).toEqual([
      { id: 'json-workspace-2', title: 'JSON 2', dirty: false },
    ]);
  });

  it('selects the right neighbor then the left when closing active workspaces', () => {
    const workspaces = useJsonWorkspaceTabs();
    workspaces.newTab();
    workspaces.newTab();
    workspaces.activateTab('json-workspace-2');

    workspaces.closeTab('json-workspace-2');
    expect(workspaces.activeTabId.value).toBe('json-workspace-3');

    workspaces.closeTab('json-workspace-3');
    expect(workspaces.activeTabId.value).toBe('json-workspace-1');
  });

  it('replaces the last workspace with a newly numbered blank workspace', () => {
    const workspaces = useJsonWorkspaceTabs();

    workspaces.closeTab('json-workspace-1');

    expect(workspaces.tabs.value).toEqual([
      { id: 'json-workspace-2', title: 'JSON 2', dirty: false },
    ]);
    expect(workspaces.activeTabId.value).toBe('json-workspace-2');
  });

  it('ignores requests to close a missing workspace', () => {
    const workspaces = useJsonWorkspaceTabs();

    workspaces.closeTab('missing');

    expect(workspaces.tabs.value).toEqual([
      { id: 'json-workspace-1', title: 'JSON 1', dirty: false },
    ]);
    expect(workspaces.activeTabId.value).toBe('json-workspace-1');
  });
});
