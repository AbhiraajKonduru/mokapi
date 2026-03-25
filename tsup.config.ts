import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  shims: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  clean: true,
});
