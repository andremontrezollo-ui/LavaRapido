import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      'src/**/__tests__/**/*.{test,spec}.ts',
      'tests/**/*.{test,spec}.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@backend': path.resolve(__dirname, './src'),
    },
  },
});
