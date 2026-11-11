import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // Logic tests run in Node; component tests opt into jsdom with a
    // `@vitest-environment jsdom` docblock at the top of the file.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    // Module-level env validation runs on import; give it a valid value.
    env: { API_BASE_URL: 'http://localhost:3001' },
  },
});
