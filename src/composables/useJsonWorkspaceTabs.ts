import { ref } from 'vue';

export interface JsonWorkspaceTab {
  id: string;
  title: string;
  dirty: boolean;
}

export type CloseWorkspaceResult = 'closed' | 'needs-confirmation' | 'missing';

export function hasWorkspaceInput(...values: string[]): boolean {
  return values.some((value) => value.length > 0);
}

export function useJsonWorkspaceTabs() {
  const tabs = ref<JsonWorkspaceTab[]>([
    { id: 'json-workspace-1', title: 'JSON 1', dirty: false },
  ]);
  const activeTabId = ref('json-workspace-1');
  let nextSequence = 2;

  function newTab(): JsonWorkspaceTab {
    const sequence = nextSequence++;
    const tab = {
      id: `json-workspace-${sequence}`,
      title: `JSON ${sequence}`,
      dirty: false,
    };
    tabs.value.push(tab);
    activeTabId.value = tab.id;
    return tab;
  }

  function activateTab(id: string): void {
    if (tabs.value.some((tab) => tab.id === id)) {
      activeTabId.value = id;
    }
  }

  function setDirty(id: string, dirty: boolean): boolean {
    const tab = tabs.value.find((item) => item.id === id);
    if (!tab) return false;
    tab.dirty = dirty;
    return true;
  }

  function renameTab(id: string, title: string): boolean {
    const next = title.trim();
    if (!next) return false;
    const tab = tabs.value.find((item) => item.id === id);
    if (!tab) return false;
    tab.title = next;
    return true;
  }

  function closeTab(id: string, force = false): CloseWorkspaceResult {
    const index = tabs.value.findIndex((tab) => tab.id === id);
    if (index === -1) return 'missing';
    if (tabs.value[index].dirty && !force) return 'needs-confirmation';
    const wasActive = activeTabId.value === id;
    tabs.value.splice(index, 1);
    if (tabs.value.length === 0) {
      newTab();
      return 'closed';
    }
    if (wasActive && tabs.value.length > 0) {
      activeTabId.value = tabs.value[Math.min(index, tabs.value.length - 1)].id;
    }
    return 'closed';
  }

  return { tabs, activeTabId, newTab, activateTab, setDirty, renameTab, closeTab };
}
