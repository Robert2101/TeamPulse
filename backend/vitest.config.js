import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['tests/**/*.test.js'],
        globalSetup: ['./tests/globalSetup.js'],
        setupFiles: ['./tests/setup.js'],
        testTimeout: 20_000,
        hookTimeout: 120_000, // the first run downloads a MongoDB binary
    },
});
