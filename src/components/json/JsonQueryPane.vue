<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { NButton, NInput } from 'naive-ui';
import CodeEditor from './CodeEditor.vue';
import { useFileDrop } from '../../composables/useFileDrop';
import { useJsonWorker } from '../../composables/useJsonWorker';
import { hasWorkspaceInput } from '../../composables/useJsonWorkspaceTabs';
import type { JsonValue } from '../../types/json';
import { useJsonHost } from '../../host/context';
import { downloadText } from '../../utils/textDownload';

const props = defineProps<{ workspaceTitle: string }>();

const emit = defineEmits<{
  dirtyChange: [dirty: boolean];
  titleChange: [title: string];
}>();

const worker = useJsonWorker();
const host = useJsonHost();

const source = ref('');
const expression = ref('$');
const result = ref('');
const matchCount = ref(0);
const elapsedMs = ref(0);
const error = ref<string | null>(null);
const actionMessage = ref('');

let cachedSource = '';
let cachedParsed: JsonValue | null = null;
let executeRun = 0;
let actionTimer: number | null = null;

async function execute() {
  const run = ++executeRun;
  const sourceText = source.value;
  const jsonpath = expression.value || '$';
  error.value = null;
  if (!sourceText.trim()) {
    result.value = '';
    matchCount.value = 0;
    return;
  }
  try {
    if (sourceText !== cachedSource || cachedParsed === null) {
      const p = await worker.parse(sourceText, 'query:parse');
      if (p === null || run !== executeRun || source.value !== sourceText) return;
      if (p.error) {
        error.value = `源 JSON 解析失败：${p.error.message ?? ''}`;
        result.value = '';
        matchCount.value = 0;
        elapsedMs.value = 0;
        return;
      }
      cachedSource = sourceText;
      cachedParsed = p.value;
    }
    if (run !== executeRun || source.value !== sourceText || (expression.value || '$') !== jsonpath) return;
    const out = await worker.jsonpath(cachedParsed, jsonpath, 'query:jsonpath');
    if (out === null || run !== executeRun || source.value !== sourceText || (expression.value || '$') !== jsonpath) return;
    if (!out.ok) { error.value = `表达式错误：${out.error}`; result.value = ''; return; }
    elapsedMs.value = out.elapsedMs;
    matchCount.value = Array.isArray(out.matches) ? out.matches.length : 0;
    result.value = out.text;
  } catch (e) {
    if (run !== executeRun) return;
    error.value = e instanceof Error ? e.message : String(e);
    result.value = '';
  }
}

function setSource(next: string) {
  source.value = next;
  emit('dirtyChange', hasWorkspaceInput(next));
  cachedSource = '';
  cachedParsed = null;
  executeRun++;
  result.value = '';
  matchCount.value = 0;
  elapsedMs.value = 0;
}

async function copy() {
  if (!result.value) return;
  try {
    await host.copy(result.value);
    showActionMessage('已复制结果');
  } catch (copyError) {
    error.value = copyError instanceof Error ? copyError.message : String(copyError);
  }
}

function saveResult() {
  if (!result.value) return;
  try {
    const filename = downloadText(
      result.value,
      `${props.workspaceTitle}-query`,
      'json',
      'application/json',
    );
    showActionMessage(`已生成 ${filename}`);
  } catch (saveError) {
    error.value = saveError instanceof Error ? saveError.message : String(saveError);
  }
}

function showActionMessage(message: string) {
  actionMessage.value = message;
  if (actionTimer !== null) window.clearTimeout(actionTimer);
  actionTimer = window.setTimeout(() => {
    actionMessage.value = '';
    actionTimer = null;
  }, 1800);
}

function onExprKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    void execute();
  }
}

const drop = useFileDrop(
  (content, filename) => {
    setSource(content);
    emit('titleChange', filename);
  },
  { accept: ['json', 'txt'], onError: (m) => { error.value = m; } },
);

onBeforeUnmount(() => {
  if (actionTimer !== null) window.clearTimeout(actionTimer);
});
</script>

<template>
  <div class="query-pane" @drop="drop.onDrop" @dragover="drop.onDragOver">
    <div class="expr-row">
      <n-input
        v-model:value="expression"
        placeholder="$.store.book[?(@.price < 10)].title"
        class="mono"
        @keydown="onExprKeydown"
      />
      <n-button type="primary" size="small" @click="execute">执行 (⌘↵)</n-button>
      <n-button size="small" :disabled="!result" @click="copy">复制结果</n-button>
      <n-button size="small" :disabled="!result" @click="saveResult">另存为</n-button>
      <n-button size="small" @click="drop.openFile">打开</n-button>
    </div>
    <div class="split">
      <CodeEditor :model-value="source" language="json" @update:model-value="setSource" height="100%" />
      <CodeEditor :model-value="result" language="json" :readonly="true" height="100%" />
    </div>
    <div class="status">
      <span class="err" v-if="error">{{ error }}</span>
      <span class="success" v-else-if="actionMessage">{{ actionMessage }}</span>
      <span class="meta">{{ matchCount }} 条匹配 · {{ elapsedMs }} ms</span>
    </div>
  </div>
</template>

<style scoped>
.query-pane { display: grid; grid-template-rows: auto 1fr auto; gap: 8px; height: 100%; }
.expr-row { display: flex; gap: 6px; align-items: center; }
.expr-row .mono :deep(input) { font-family: var(--font-mono); }
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; min-height: 0; }
.status { display: flex; justify-content: space-between; font-size: var(--fs-xxs); }
.status .err { color: var(--error); }
.status .success { color: var(--success); }
.status .meta { color: var(--text-muted); }
@media (max-width: 720px) {
  .expr-row { flex-wrap: wrap; }
  .expr-row :deep(.n-input) { flex: 1 1 100%; }
  .split {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(2, minmax(240px, 1fr));
    overflow: auto;
  }
}
</style>
