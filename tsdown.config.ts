import { defineConfig } from 'tsdown'

export default defineConfig({
  dts: {
    tsgo: true,
  },
  exports: true,
  entry: ['src/cli.ts'],
  banner: {
    js: '#!/usr/bin/env node',
  },
})
