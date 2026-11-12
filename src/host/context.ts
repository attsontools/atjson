import { inject, provide } from 'vue';

import type { JsonHost } from './types';

const jsonHostKey = Symbol('json-host');

export function provideJsonHost(host: JsonHost): void {
  provide(jsonHostKey, host);
}

export function useJsonHost(): JsonHost {
  const host = inject<JsonHost>(jsonHostKey);
  if (!host) throw new Error('JSON host is unavailable');
  return host;
}
