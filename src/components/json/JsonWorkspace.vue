<script setup lang="ts">
import { reactive, ref } from 'vue';
import { NTabs, NTabPane } from 'naive-ui';
import JsonFormatPane from './JsonFormatPane.vue';
import JsonQueryPane from './JsonQueryPane.vue';
import JsonDiffPane from './JsonDiffPane.vue';
import JsonConvertPane from './JsonConvertPane.vue';
import { hasWorkspaceInput } from '../../composables/useJsonWorkspaceTabs';
import {
  resolveJsonWorkspaceSeed,
  type JsonWorkspaceSeed,
} from '../../utils/jsonHandoff';

const props = defineProps<{
  title: string;
  seed?: JsonWorkspaceSeed;
}>();

const emit = defineEmits<{
  dirtyChange: [dirty: boolean];
  titleChange: [title: string];
  sendTo: [handoff: JsonWorkspaceSeed];
}>();

const initial = resolveJsonWorkspaceSeed(props.seed);
const tab = ref(initial.activePane);
const paneDirty = reactive({
  format: hasWorkspaceInput(initial.formatText),
  query: hasWorkspaceInput(initial.querySource),
  diff: hasWorkspaceInput(initial.diffLeft, initial.diffRight),
  convert: hasWorkspaceInput(initial.convertSource),
});

function setPaneDirty(pane: keyof typeof paneDirty, dirty: boolean) {
  paneDirty[pane] = dirty;
  emit('dirtyChange', Object.values(paneDirty).some(Boolean));
}
</script>

<template>
  <div class="json-workspace">
    <n-tabs v-model:value="tab" type="line" animated>
      <n-tab-pane name="format" tab="格式化" display-directive="show:lazy">
        <div class="pane-wrap">
          <JsonFormatPane
            :workspace-title="title"
            :initial-text="initial.formatText"
            @dirty-change="setPaneDirty('format', $event)"
            @title-change="emit('titleChange', $event)"
            @send-to="emit('sendTo', $event)"
          />
        </div>
      </n-tab-pane>
      <n-tab-pane name="query" tab="查询" display-directive="show:lazy">
        <div class="pane-wrap">
          <JsonQueryPane
            :workspace-title="title"
            :initial-source="initial.querySource"
            @dirty-change="setPaneDirty('query', $event)"
            @title-change="emit('titleChange', $event)"
          />
        </div>
      </n-tab-pane>
      <n-tab-pane name="diff" tab="对比" display-directive="show:lazy">
        <div class="pane-wrap">
          <JsonDiffPane
            :workspace-title="title"
            :initial-left="initial.diffLeft"
            :initial-right="initial.diffRight"
            @dirty-change="setPaneDirty('diff', $event)"
          />
        </div>
      </n-tab-pane>
      <n-tab-pane name="convert" tab="转换" display-directive="show:lazy">
        <div class="pane-wrap">
          <JsonConvertPane
            :workspace-title="title"
            :initial-source="initial.convertSource"
            @dirty-change="setPaneDirty('convert', $event)"
            @title-change="emit('titleChange', $event)"
          />
        </div>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<style scoped>
.json-workspace { height: 100%; min-height: 0; display: flex; flex-direction: column; }
.json-workspace :deep(.n-tabs) { height: 100%; display: flex; flex-direction: column; }
.json-workspace :deep(.n-tabs-pane-wrapper) { flex: 1; min-height: 0; }
.json-workspace :deep(.n-tab-pane) { height: 100%; }
.pane-wrap { height: 100%; min-height: 0; }
</style>
