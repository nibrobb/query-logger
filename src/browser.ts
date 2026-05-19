import * as QueryLogger from './index.js';

if (typeof globalThis !== 'undefined') {
  (globalThis as typeof globalThis & { QueryLogger?: typeof QueryLogger }).QueryLogger = QueryLogger;
}

export * from './index.js';

