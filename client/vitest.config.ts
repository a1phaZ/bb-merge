import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';
import { resolve } from 'node:path';

export default defineConfig({
  root: resolve(__dirname),
  plugins: [angular({ tsconfig: resolve(__dirname, 'tsconfig.app.json') })],
  test: {
    globals: true,
    setupFiles: [
      '@analogjs/vite-plugin-angular/setup-vitest',
      'src/test-setup.ts',
    ],
    include: ['src/**/*.spec.ts'],
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/app/**'],
      exclude: ['src/app/**/*.spec.ts', 'src/app/**/models/**'],
    },
  },
});
