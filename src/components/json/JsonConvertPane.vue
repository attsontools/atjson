<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { NButton, NSelect } from 'naive-ui';
import CodeEditor from './CodeEditor.vue';
import { useFileDrop } from '../../composables/useFileDrop';
import { useJsonWorker } from '../../composables/useJsonWorker';
import { hasWorkspaceInput } from '../../composables/useJsonWorkspaceTabs';
import type { ConvertFormat } from '../../types/json';
import { useJsonHost } from '../../host/context';
import { downloadText } from '../../utils/textDownload';

const props = withDefaults(defineProps<{
  workspaceTitle: string;
  initialSource?: string;
}>(), {
  initialSource: '',
});

const emit = defineEmits<{
  dirtyChange: [dirty: boolean];
  titleChange: [title: string];
}>();

const FORMAT_OPTIONS = [
  { label: 'JSON', value: 'json' },
  { label: 'YAML', value: 'yaml' },
  { label: 'TOML', value: 'toml' },
  { label: 'CSV',  value: 'csv'  },
];

const worker = useJsonWorker();
const host = useJsonHost();

const source = ref(props.initialSource);
const target = ref('');
const fromFmt = ref<ConvertFormat>('json');
const toFmt = ref<ConvertFormat>('yaml');
const error = ref<string | null>(null);
const actionMessage = ref('');

let timer: number | null = null;
let recomputeRun = 0;
let actionTimer: number | null = null;
function schedule() {
  const run = ++recomputeRun;
  if (timer !== null) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = null;
    void recompute(run);
  }, 200);
}

async function recompute(run: number) {
  const sourceText = source.value;
  const sourceFormat = fromFmt.value;
  const targetFormat = toFmt.value;
  if (!sourceText.trim()) {
    target.value = '';
    error.value = null;
    return;
  }
  try {
    const res = await worker.convert(sourceText, sourceFormat, targetFormat, 'convert:convert');
    if (res === null || run !== recomputeRun) return;
    if (res.ok) {
      target.value = res.text;
      error.value = null;
    } else {
      target.value = '';
      error.value = res.error;
    }
  } catch (convertError) {
    if (run !== recomputeRun) return;
    target.value = '';
    error.value = convertError instanceof Error ? convertError.message : String(convertError);
  }
}

watch([source, fromFmt, toFmt], schedule, { immediate: true });
onBeforeUnmount(() => {
  if (timer !== null) window.clearTimeout(timer);
  if (actionTimer !== null) window.clearTimeout(actionTimer);
});

function setSource(value: string) {
  source.value = value;
  emit('dirtyChange', hasWorkspaceInput(value));
}

function swap() {
  const oldSource = source.value;
  const oldTarget = target.value;
  const oldFrom = fromFmt.value;
  fromFmt.value = toFmt.value;
  toFmt.value = oldFrom;
  setSource(oldTarget);
  target.value = oldSource;
}

async function copyTarget() {
  if (!target.value) return;
  try {
    await host.copy(target.value);
    showActionMessage('已复制结果');
  } catch (copyError) {
    error.value = copyError instanceof Error ? copyError.message : String(copyError);
  }
}

function saveTarget() {
  if (!target.value) return;
  try {
    const filename = downloadText(
      target.value,
      `${props.workspaceTitle}-${toFmt.value}`,
      toFmt.value,
      formatMime(toFmt.value),
    );
    showActionMessage(`已生成 ${filename}`);
  } catch (saveError) {
    error.value = saveError instanceof Error ? saveError.message : String(saveError);
  }
}

function formatMime(format: ConvertFormat): string {
  if (format === 'json') return 'application/json';
  if (format === 'csv') return 'text/csv;charset=utf-8';
  return 'text/plain;charset=utf-8';
}

function showActionMessage(message: string) {
  actionMessage.value = message;
  if (actionTimer !== null) window.clearTimeout(actionTimer);
  actionTimer = window.setTimeout(() => {
    actionMessage.value = '';
    actionTimer = null;
  }, 1800);
}

const sourceLang = computed(() => fromFmt.value === 'json' ? 'json' : 'plaintext');
const targetLang = computed(() => toFmt.value === 'json' ? 'json' : 'plaintext');

const drop = useFileDrop(
  (content, filename) => {
    setSource(content);
    if (filename.endsWith('.yaml') || filename.endsWith('.yml')) fromFmt.value = 'yaml';
    else if (filename.endsWith('.toml')) fromFmt.value = 'toml';
    else if (filename.endsWith('.csv')) fromFmt.value = 'csv';
    else if (filename.endsWith('.json')) fromFmt.value = 'json';
    emit('titleChange', filename);
  },
  { accept: ['json', 'yaml', 'yml', 'toml', 'csv', 'txt'], onError: (m) => { error.value = m; } },
);
</script>

<template>
  <div class="convert-pane" @drop="drop.onDrop" @dragover="drop.onDragOver">
    <div class="head">
      <div class="side">
        <span class="lbl">源</span>
        <n-select :value="fromFmt" :options="FORMAT_OPTIONS" size="small" @update:value="(v) => fromFmt = v" />
        <n-button size="small" @click="drop.openFile">打开</n-button>
      </div>
      <button class="swap" type="button" @click="swap" title="交换源/目标">⇄</button>
      <div class="side end">
        <span class="lbl">目标</span>
        <n-select :value="toFmt" :options="FORMAT_OPTIONS" size="small" @update:value="(v) => toFmt = v" />
        <n-button size="small" :disabled="!target" @click="copyTarget">复制</n-button>
        <n-button size="small" :disabled="!target" @click="saveTarget">另存为</n-button>
      </div>
    </div>
    <div class="split">
      <CodeEditor :model-value="source" :language="sourceLang" @update:model-value="setSource" height="100%" />
      <CodeEditor :model-value="target" :language="targetLang" :readonly="true" height="100%" />
    </div>
    <div class="status">
      <span class="err" v-if="error">{{ error }}</span>
      <span class="success" v-else-if="actionMessage">{{ actionMessage }}</span>
      <span class="meta">CSV 仅支持 array-of-flat-objects</span>
    </div>
  </div>
</template>

<style scoped>
.convert-pane { display: grid; grid-template-rows: auto 1fr auto; gap: 8px; height: 100%; }
.head { display: grid; grid-template-columns: 1fr 40px 1fr; align-items: center; gap: 8px; }
.side { display: flex; align-items: center; gap: 6px; }
.side.end { justify-content: flex-end; }
.side .lbl { color: var(--text-muted); font-size: var(--fs-xs); }
.swap {
  background: var(--bg-elev-2);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  height: 28px;
  cursor: pointer;
  color: var(--text);
}
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; min-height: 0; }
.status { display: flex; justify-content: space-between; font-size: var(--fs-xxs); }
.status .err { color: var(--error); }
.status .success { color: var(--success); }
.status .meta { color: var(--text-muted); }
@media (max-width: 720px) {
  .head { grid-template-columns: minmax(0, 1fr) 36px minmax(0, 1fr); }
  .side { flex-wrap: wrap; }
  .side :deep(.n-select) { flex: 1 1 100%; }
  .split {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(2, minmax(240px, 1fr));
    overflow: auto;
  }
}
</style>
