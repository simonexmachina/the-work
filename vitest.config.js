import { defineConfig } from 'vitest/config';

// Disable watch mode when running in CI or when an agent is running tests
const isAgentMode = process.env.CI || process.env.CURSOR_AGENT || !process.stdout.isTTY;

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.js'],
    watch: !isAgentMode,
  },
});

