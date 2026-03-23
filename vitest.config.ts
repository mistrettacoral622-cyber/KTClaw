import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const nodeTestInclude = [
  'tests/unit/agent-config.test.ts',
  'tests/unit/channel-config.test.ts',
  'tests/unit/comms-scripts.test.ts',
  'tests/unit/env-path.test.ts',
  'tests/unit/gateway-*.test.ts',
  'tests/unit/openclaw-*.test.ts',
  'tests/unit/token-usage*.test.ts',
];

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: nodeTestInclude,
          setupFiles: ['./tests/setup.ts'],
        },
      },
      {
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
          exclude: nodeTestInclude,
          setupFiles: ['./tests/setup.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@electron': resolve(__dirname, 'electron'),
    },
  },
});
