/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import Vue from '@vitejs/plugin-vue'
import VueMacros from 'unplugin-vue-macros/vite'
import { resolve } from 'path'

const shared = {
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [
    VueMacros({
      plugins: {
        vue: Vue(),
      },
    }),
  ],
}

export default defineConfig({
  test: {
    projects: [
      {
        ...shared,
        test: {
          name: 'unit',
          environment: 'happy-dom',
          include: ['src/__tests__/unit/**/*.test.ts'],
          clearMocks: true,
        },
      },
      {
        ...shared,
        test: {
          name: 'ui',
          environment: 'happy-dom',
          include: ['src/__tests__/ui/**/*.test.ts'],
          clearMocks: true,
        },
      },
    ],
  },
})
