import { defineConfig } from 'vitest/config';

export default defineConfig({
  css: false,
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/**/*.{test,spec}.ts'],
    root: __dirname,
  },
});
