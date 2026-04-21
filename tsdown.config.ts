import { defineConfig } from 'tsdown'

export default defineConfig({
  target: 'node25',
  dts: {
    tsgo: true,
  },
  exports: true,
  entry: ['src/cli.ts'],
  banner: {
    js: '#!/usr/bin/env node',
  },
})
