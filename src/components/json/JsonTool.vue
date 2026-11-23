<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { NModal } from 'naive-ui';
import { useJsonWorkspaceTabs } from '../../composables/useJsonWorkspaceTabs';
import JsonWorkspace from './JsonWorkspace.vue';

const props = defineProps<{ active: boolean }>();
const workspaces = useJsonWorkspaceTabs();
const root = ref<HTMLElement | null>(null);
const pendingCloseId = ref<string | null>(null);
const editingId = ref<string | null>(null);
const editingTitle = ref('');
const pendingCloseTab = computed(() =>
  workspaces.tabs.value.find((tab) => tab.id === pendingCloseId.value) ?? null,
);

watch(workspaces.activeTabId, async (id) => {
  await nextTick();
  root.value
    ?.querySelector<HTMLElement>(`.workspace-tab[data-workspace-id="${id}"]`)
    ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
});

function onTabMouseDown(id: string, event: MouseEvent) {
  if (event.button === 1) {
    event.preventDefault();
    requestClose(id);
  } else if (event.button === 0) {
    workspaces.activateTab(id);
  }
}

function requestClose(id: string) {
  if (workspaces.closeTab(id) === 'needs-confirmation') pendingCloseId.value = id;
}

function confirmClose() {
  if (pendingCloseId.value) workspaces.closeTab(pendingCloseId.value, true);
  pendingCloseId.value = null;
}

function cancelClose() {
  pendingCloseId.value = null;
}

async function beginRename(id: string, title: string) {
  editingId.value = id;
  editingTitle.value = title;
  await nextTick();
  root.value?.querySelector<HTMLInputElement>('.workspace-title-input')?.select();
}

function commitRename(id: string) {
  if (editingId.value !== id) return;
  workspaces.renameTab(id, editingTitle.value);
  editingId.value = null;
}

function cancelRename() {
  editingId.value = null;
}

function onKeydown(event: KeyboardEvent) {
  if (!props.active || !(event.metaKey || event.ctrlKey)) return;
  const key = event.key.toLowerCase();
  if (key === 't') {
    event.preventDefault();
    workspaces.newTab();
  } else if (key === 'w') {
    event.preventDefault();
    requestClose(workspaces.activeTabId.value);
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div ref="root" class="json-tool">
    <div class="workspace-tabs" role="tablist" aria-label="JSON 工作页">
      <div
        v-for="tab in workspaces.tabs.value"
        :key="tab.id"
        :data-workspace-id="tab.id"
        :class="['workspace-tab', { active: tab.id === workspaces.activeTabId.value }]"
        role="tab"
        :aria-selected="tab.id === workspaces.activeTabId.value"
        :tabindex="tab.id === workspaces.activeTabId.value ? 0 : -1"
        :title="tab.title"
        @mousedown="onTabMouseDown(tab.id, $event)"
        @dblclick="beginRename(tab.id, tab.title)"
        @keydown.enter="workspaces.activateTab(tab.id)"
        @keydown.space.prevent="workspaces.activateTab(tab.id)"
      >
        <span v-if="tab.dirty" class="workspace-dirty" title="未保存" aria-label="未保存" />
        <input
          v-if="editingId === tab.id"
          v-model="editingTitle"
          class="workspace-title-input"
          :aria-label="`重命名 ${tab.title}`"
          @mousedown.stop
          @click.stop
          @keydown.stop
          @keydown.enter.prevent="commitRename(tab.id)"
          @keydown.esc.prevent="cancelRename"
          @blur="commitRename(tab.id)"
        />
        <span v-else class="workspace-title">{{ tab.title }}</span>
        <button
          type="button"
          class="workspace-close"
          :aria-label="`关闭 ${tab.title}`"
          @mousedown.stop
          @click.stop="requestClose(tab.id)"
        >×</button>
      </div>
      <button
        type="button"
        class="workspace-new"
        title="新建 JSON 工作页 (⌘T)"
        aria-label="新建 JSON 工作页"
        @click="workspaces.newTab"
      >+</button>
    </div>

    <div class="workspace-content">
      <JsonWorkspace
        v-for="tab in workspaces.tabs.value"
        v-show="tab.id === workspaces.activeTabId.value"
        :key="tab.id"
        :title="tab.title"
        @dirty-change="workspaces.setDirty(tab.id, $event)"
        @title-change="workspaces.renameTab(tab.id, $event)"
      />
    </div>

    <n-modal :show="!!pendingCloseTab" @mask-click="cancelClose" @esc="cancelClose">
      <div class="close-dialog" role="dialog" aria-modal="true" aria-labelledby="close-dialog-title">
        <h3 id="close-dialog-title">关闭“{{ pendingCloseTab?.title }}”？</h3>
        <p>这个工作页包含未保存内容，关闭后无法恢复。</p>
        <div class="close-dialog-actions">
          <button type="button" class="secondary-btn" @click="cancelClose">取消</button>
          <button type="button" class="danger-btn" @click="confirmClose">仍然关闭</button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<style scoped>
.json-tool { height: 100%; display: flex; flex-direction: column; }
.workspace-tabs {
  display: flex;
  flex: 0 0 auto;
  align-items: stretch;
  min-width: 0;
  overflow-x: auto;
  border-bottom: 1px solid var(--line);
  background: var(--bg-base);
  scrollbar-width: thin;
}
.workspace-tab {
  position: relative;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  min-width: 112px;
  max-width: 180px;
  padding: 7px 9px 7px 12px;
  border-right: 1px solid var(--line);
  color: var(--text-muted);
  cursor: pointer;
  font-size: var(--fs-xs);
  user-select: none;
}
.workspace-tab:hover { background: var(--bg-elev); }
.workspace-tab.active {
  background: var(--bg-elev);
  color: var(--text);
  box-shadow: inset 0 -2px 0 var(--accent);
}
.workspace-tab:focus-visible { outline: 1px solid var(--accent); outline-offset: -2px; }
.workspace-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.workspace-dirty {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  border-radius: var(--radius-pill);
  background: var(--warning);
}
.workspace-title-input {
  width: 110px;
  min-width: 0;
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  outline: none;
  background: var(--bg-base);
  color: var(--text);
  font: inherit;
}
.workspace-close,
.workspace-new {
  border: 0;
  background: none;
  color: var(--text-muted);
  cursor: pointer;
}
.workspace-close {
  display: grid;
  width: 20px;
  height: 20px;
  padding: 0;
  place-items: center;
  border-radius: var(--radius-sm);
  font-size: var(--fs-md);
}
.workspace-close:hover { background: var(--bg-base); color: var(--error); }
.workspace-new {
  flex: 0 0 auto;
  min-width: 42px;
  padding: 0 14px;
  font-size: var(--fs-lg);
}
.workspace-new:hover { color: var(--text); background: var(--bg-elev); }
.workspace-content { flex: 1; min-height: 0; padding-top: 8px; }
.close-dialog {
  width: min(380px, calc(100vw - 32px));
  padding: 18px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-pop);
  color: var(--text);
}
.close-dialog h3 { margin: 0 0 8px; font-size: var(--fs-lg); }
.close-dialog p { margin: 0; color: var(--text-muted); font-size: var(--fs-sm); }
.close-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
.secondary-btn,
.danger-btn {
  height: 30px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--fs-xs);
}
.secondary-btn { border: 1px solid var(--line-strong); background: var(--bg-elev-2); color: var(--text); }
.danger-btn { border: 1px solid var(--error); background: var(--error); color: var(--bg-base); }
</style>
