<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue';
import { NButton } from 'naive-ui';
import CodeEditor from './CodeEditor.vue';
import JsonTreeView from './JsonTreeView.vue';
import { useFileDrop } from '../../composables/useFileDrop';
import { useJsonWorker } from '../../composables/useJsonWorker';
import type { JsonValue } from '../../types/json';
import { useJsonHost } from '../../host/context';

const worker = useJsonWorker();
const host = useJsonHost();

const text = ref('');
const error = ref<string | null>(null);
const elapsedMs = ref(0);
// shallowRef: parsed JSON can be large and is always replaced wholesale (never
// mutated in place) — deep reactivity would wrap it in a Proxy that Worker
// postMessage's structured-clone algorithm rejects (DataCloneError).
const parsed = shallowRef<JsonValue | null>(null);
const hasParsed = ref(false);
const treeRef = ref<{ expandAll: () => void; collapseAll: () => void } | null>(null);
let parsedSource: string | null = null;
let textRevision = 0;

const charCount = computed(() => text.value.length);

let parseTimer: number | null = null;
function scheduleReparse() {
  if (parseTimer !== null) window.clearTimeout(parseTimer);
  parseTimer = window.setTimeout(() => {
    parseTimer = null;
    void reparse();
  }, 300);
}

async function reparse() {
  const source = text.value;
  const revision = textRevision;
  if (!source.trim()) {
    parsed.value = null;
    hasParsed.value = false;
    parsedSource = null;
    error.value = null;
    elapsedMs.value = 0;
    return;
  }
  try {
    const res = await worker.parse(source, 'format:parse');
    if (res === null || revision !== textRevision) return;
    elapsedMs.value = res.elapsedMs;
    if (res.error) {
      parsed.value = null;
      hasParsed.value = false;
      parsedSource = null;
      const line = res.error.line ? `第 ${res.error.line} 行：` : '';
      error.value = `${line}${res.error.message ?? '解析失败'}`;
    } else {
      parsed.value = res.value;
      hasParsed.value = true;
      parsedSource = source;
      error.value = null;
    }
  } catch (parseError) {
    if (revision !== textRevision) return;
    parsed.value = null;
    hasParsed.value = false;
    parsedSource = null;
    error.value = parseError instanceof Error ? parseError.message : String(parseError);
  }
}

function setText(next: string) {
  text.value = next;
  textRevision++;
  parsed.value = null;
  hasParsed.value = false;
  parsedSource = null;
  scheduleReparse();
}

async function doSerialize(mode: 'format' | 'minify' | 'sort') {
  try {
    if (parseTimer !== null) {
      window.clearTimeout(parseTimer);
      parseTimer = null;
    }
    const source = text.value;
    const revision = textRevision;
    let value: JsonValue | undefined = hasParsed.value && parsedSource === source
      ? parsed.value
      : undefined;
    if (value === undefined) {
      const p = await worker.parse(source, 'format:parse');
      if (p === null || revision !== textRevision) return;
      if (p.error) { error.value = p.error.message ?? '解析失败'; return; }
      value = p.value;
    }
    if (value === undefined) return;
    const out = await worker.serialize(value, mode, 2, 'format:serialize');
    if (out === null || revision !== textRevision) return;
    if (!out.ok) { error.value = out.error; return; }
    setText(out.text);
  } catch (e) {
    error.value = (e as Error).message;
  }
}

function doFormat()   { void doSerialize('format'); }
function doMinify()   { void doSerialize('minify'); }
function doSortKeys() { void doSerialize('sort'); }

function expandAll()   { treeRef.value?.expandAll(); }
function collapseAll() { treeRef.value?.collapseAll(); }

async function doCopy() {
  try {
    await host.copy(text.value);
  } catch (copyError) {
    error.value = copyError instanceof Error ? copyError.message : String(copyError);
  }
}

const drop = useFileDrop(
  (content) => setText(content),
  { accept: ['json', 'txt'], onError: (m) => { error.value = m; } },
);

function copyTreePath(path: string) {
  host.copy(path).catch((copyError) => {
    error.value = copyError instanceof Error ? copyError.message : String(copyError);
  });
}

onBeforeUnmount(() => { if (parseTimer !== null) window.clearTimeout(parseTimer); });
</script>

<template>
  <div class="format-pane" @drop="drop.onDrop" @dragover="drop.onDragOver">
    <div class="toolbar">
      <n-button size="small" @click="doFormat">格式化</n-button>
      <n-button size="small" @click="doMinify">最小化</n-button>
      <n-button size="small" @click="doSortKeys">键排序</n-button>
      <n-button size="small" @click="doCopy">复制</n-button>
      <span class="spacer" />
      <n-button size="small" @click="expandAll">全部展开</n-button>
      <n-button size="small" @click="collapseAll">全部折叠</n-button>
      <n-button size="small" @click="drop.openFile">打开文件</n-button>
    </div>
    <div class="split">
      <CodeEditor :model-value="text" language="json" @update:model-value="setText" height="100%" />
      <div class="tree-pane">
        <JsonTreeView v-if="hasParsed" ref="treeRef" :value="parsed" @copy-path="copyTreePath" />
        <div v-else class="empty">{{ text.trim() ? '等待有效 JSON' : '左侧粘贴 / 拖入 JSON 文本' }}</div>
      </div>
    </div>
    <div class="status">
      <span class="err" v-if="error">{{ error }}</span>
      <span class="meta">字符 {{ charCount }} · 解析 {{ elapsedMs }} ms</span>
    </div>
  </div>
</template>

<style scoped>
.format-pane { display: grid; grid-template-rows: auto 1fr auto; gap: 8px; height: 100%; }
.toolbar { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; row-gap: 6px; }
.toolbar .spacer { flex: 1; min-width: 8px; }
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; min-height: 0; }
.tree-pane {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--bg-elev-2);
  overflow: auto;
  padding: 8px 12px;
  font-size: var(--fs-xs);
}
.empty { color: var(--text-muted); padding: 40px 0; text-align: center; }
.status { display: flex; justify-content: space-between; font-size: var(--fs-xxs); }
.status .err { color: var(--error); }
.status .meta { color: var(--text-muted); }
@media (max-width: 720px) {
  .split {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(2, minmax(240px, 1fr));
    overflow: auto;
  }
}
</style>
