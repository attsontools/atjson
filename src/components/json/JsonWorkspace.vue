<script setup lang="ts">
import { reactive, ref } from 'vue';
import { NTabs, NTabPane } from 'naive-ui';
import JsonFormatPane from './JsonFormatPane.vue';
import JsonQueryPane from './JsonQueryPane.vue';
import JsonDiffPane from './JsonDiffPane.vue';
import JsonConvertPane from './JsonConvertPane.vue';

defineProps<{ title: string }>();

const emit = defineEmits<{
  dirtyChange: [dirty: boolean];
  titleChange: [title: string];
}>();

const tab = ref('format');
const paneDirty = reactive({ format: false, query: false, diff: false, convert: false });

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
            @dirty-change="setPaneDirty('format', $event)"
            @title-change="emit('titleChange', $event)"
          />
        </div>
      </n-tab-pane>
      <n-tab-pane name="query" tab="查询" display-directive="show:lazy">
        <div class="pane-wrap">
          <JsonQueryPane
            :workspace-title="title"
            @dirty-change="setPaneDirty('query', $event)"
            @title-change="emit('titleChange', $event)"
          />
        </div>
      </n-tab-pane>
      <n-tab-pane name="diff" tab="对比" display-directive="show:lazy">
        <div class="pane-wrap">
          <JsonDiffPane
            :workspace-title="title"
            @dirty-change="setPaneDirty('diff', $event)"
          />
        </div>
      </n-tab-pane>
      <n-tab-pane name="convert" tab="转换" display-directive="show:lazy">
        <div class="pane-wrap">
          <JsonConvertPane
            :workspace-title="title"
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
