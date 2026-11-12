import { copyText, type JsonHost, type ThemeName } from './types';

const STORAGE_KEY = 'atjson.theme';

export interface StandaloneDependencies {
  readTheme(): string | null;
  writeTheme(theme: ThemeName): void;
}

export function createStandaloneHost(dependencies: StandaloneDependencies): JsonHost {
  let theme: ThemeName = 'dark';
  let themeListener: ((theme: ThemeName) => void) | null = null;
  return {
    mode: 'standalone',
    async initialize(onTheme) {
      themeListener = onTheme;
      theme = dependencies.readTheme() === 'light' ? 'light' : 'dark';
      return theme;
    },
    async toggleTheme() {
      theme = theme === 'dark' ? 'light' : 'dark';
      dependencies.writeTheme(theme);
      themeListener?.(theme);
      return theme;
    },
    copy: copyText,
    dispose() {
      themeListener = null;
    }
  };
}

export const host = createStandaloneHost({
  readTheme: () => localStorage.getItem(STORAGE_KEY),
  writeTheme: (theme) => localStorage.setItem(STORAGE_KEY, theme)
});
