import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [vue()],
  resolve: {
    alias: {
      '@host': fileURLToPath(
        new URL(mode === 'plugin' ? './src/host/plugin.ts' : './src/host/standalone.ts', import.meta.url)
      )
    }
  },
  optimizeDeps: {
    exclude: ['monaco-editor']
  },
  clearScreen: false
}));
