<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { darkTheme, NConfigProvider } from 'naive-ui';

import JsonTool from './components/json/JsonTool.vue';
import { provideJsonHost } from './host/context';
import type { JsonHost, ThemeName } from './host/types';
import { darkOverrides, lightOverrides } from './theme/naiveTheme';

const props = defineProps<{ host: JsonHost }>();
provideJsonHost(props.host);

const theme = ref<ThemeName>('dark');
const connecting = ref(true);
const connectionError = ref('');
const naiveTheme = computed(() => theme.value === 'dark' ? darkTheme : null);
const naiveOverrides = computed(() => theme.value === 'dark' ? darkOverrides : lightOverrides);

onMounted(async () => {
  try {
    theme.value = await props.host.initialize((value) => {
      theme.value = value;
      applyTheme();
    });
    applyTheme();
  } catch (error) {
    connectionError.value = error instanceof Error ? error.message : String(error);
  } finally {
    connecting.value = false;
  }
});

onBeforeUnmount(() => props.host.dispose());

function applyTheme() {
  document.documentElement.dataset.theme = theme.value;
}

async function toggleTheme() {
  theme.value = await props.host.toggleTheme();
  applyTheme();
}
</script>

<template>
  <n-config-provider :theme="naiveTheme" :theme-overrides="naiveOverrides">
    <main class="app-shell">
      <header class="app-header">
        <div class="brand">
          <span class="brand-mark">{ }</span>
          <div class="brand-copy">
            <strong>JSON 工具</strong>
            <span>格式化、查询、对比与转换</span>
          </div>
        </div>
        <div class="top-actions">
          <span class="host-badge">{{ host.mode === 'plugin' ? '平台插件' : '独立应用' }}</span>
          <button
            v-if="host.mode === 'standalone'"
            type="button"
            class="theme-button"
            :title="theme === 'dark' ? '切换到浅色' : '切换到深色'"
            @click="toggleTheme"
          >
            {{ theme === 'dark' ? '浅色' : '深色' }}
          </button>
        </div>
      </header>

      <div v-if="connecting" class="center-state">正在连接宿主</div>
      <div v-else-if="connectionError" class="center-state error-state">
        <strong>无法启动 JSON 工具</strong>
        <span>{{ connectionError }}</span>
      </div>
      <JsonTool v-else :active="true" />
    </main>
  </n-config-provider>
</template>
