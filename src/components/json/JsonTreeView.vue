<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
import { NVirtualList } from 'naive-ui';
import type { JsonPathSegment, JsonValue } from '../../types/json';
import { flatten, allExpandableKeys, type FlatNode } from '../../utils/jsonTreeFlatten';
import { resolveEditorHistoryShortcut } from '../../utils/editorHistory';

const props = defineProps<{
  value: JsonValue;
  selectedKey?: string | null;
}>();

const emit = defineEmits<{
  copyPath: [path: string, restoreFocus: () => void];
  'update:selectedKey': [key: string];
  deleteNode: [path: JsonPathSegment[], parentKey: string];
  undo: [];
  redo: [];
}>();

const openKeys = ref<Set<string>>(new Set(['$']));
const treeElement = ref<HTMLDivElement | null>(null);

watch(
  () => props.value,
  () => {
    if (!props.selectedKey) openKeys.value = new Set(['$']);
  },
);

const nodes = shallowRef<FlatNode[]>([]);
function recompute() {
  nodes.value = flatten(props.value, openKeys.value);
}
watch(() => [props.value, openKeys.value], recompute, { immediate: true });

function toggle(node: FlatNode) {
  if (node.kind === 'primitive') return;
  const next = new Set(openKeys.value);
  if (next.has(node.key)) next.delete(node.key); else next.add(node.key);
  openKeys.value = next;
}

function isOpen(node: FlatNode) {
  return openKeys.value.has(node.key);
}

function copyPath(path: string) {
  emit('copyPath', path, () => treeElement.value?.focus({ preventScroll: true }));
}

function selectNode(node: FlatNode) {
  emit('update:selectedKey', node.key);
  treeElement.value?.focus({ preventScroll: true });
}

function onKeydown(event: KeyboardEvent) {
  const historyAction = resolveEditorHistoryShortcut(event);
  if (historyAction) {
    event.preventDefault();
    event.stopPropagation();
    emit(historyAction);
    return;
  }

  if (event.key !== 'Delete' || !props.selectedKey) return;
  const node = nodes.value.find((item) => item.key === props.selectedKey);
  if (!node?.parentKey) return;
  event.preventDefault();
  event.stopPropagation();
  emit('deleteNode', node.pathSegments, node.parentKey);
}

function expandAll() {
  openKeys.value = allExpandableKeys(props.value);
}

function collapseAll() {
  openKeys.value = new Set(['$']);
}

defineExpose({ expandAll, collapseAll });

const sizeLabel = (n: FlatNode) => n.kind === 'array' ? `[${n.size}]`
  : n.kind === 'object' ? `{${n.size}}` : '';
</script>

<template>
  <div
    ref="treeElement"
    class="tree-view"
    tabindex="0"
    role="tree"
    aria-label="JSON 树"
    @keydown="onKeydown"
  >
    <n-virtual-list
      class="tree-vlist"
      :items="nodes"
      :item-size="24"
      :item-resizable="false"
      key-field="key"
    >
      <template #default="{ item }">
        <div
          :class="['tree-row', { selected: item.key === selectedKey }]"
          :style="{ paddingLeft: `${item.depth * 14 + 4}px` }"
          role="treeitem"
          :aria-selected="item.key === selectedKey"
          @click="selectNode(item)"
        >
          <template v-if="item.kind === 'primitive'">
            <span v-if="item.label" class="key">{{ item.label }}:</span>
            <span :class="['value', item.primitiveClass]">{{ item.primitiveText }}</span>
            <button class="path-btn" type="button" :title="`复制 ${item.path}`" @click="copyPath(item.path)">⧉</button>
          </template>
          <template v-else>
            <button type="button" class="tree-toggle" @click="toggle(item)">
              <span class="caret">{{ isOpen(item) ? '▾' : '▸' }}</span>
              <span v-if="item.label" class="key">{{ item.label }}:</span>
              <span class="meta">{{ sizeLabel(item) }}</span>
            </button>
            <button class="path-btn" type="button" :title="`复制 ${item.path}`" @click="copyPath(item.path)">⧉</button>
          </template>
        </div>
      </template>
    </n-virtual-list>
  </div>
</template>

<style scoped>
.tree-view {
  height: 100%;
  outline: none;
}
.tree-view:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: -1px;
}
.tree-vlist {
  height: 100%;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  line-height: 1.6;
}
.tree-row {
  display: flex;
  gap: 6px;
  align-items: center;
  height: 24px;
  white-space: nowrap;
  padding-right: 4px;
  border-radius: var(--radius-sm);
}
.tree-row.selected {
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px var(--accent-line);
}
.tree-toggle {
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  color: var(--text);
  font: inherit;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.caret { width: 14px; display: inline-block; color: var(--text-muted); }
.key { color: var(--text-muted); }
.meta { color: var(--text-muted); }
.value.string { color: var(--syntax-string); }
.value.number { color: var(--syntax-number); }
.value.boolean { color: var(--syntax-boolean); }
.value.null { color: var(--text-muted); }
.path-btn {
  background: none;
  border: 0;
  color: var(--text-muted);
  cursor: pointer;
  font-size: var(--fs-xxs);
  padding: 0 4px;
}
.path-btn:hover { color: var(--text); }
</style>
