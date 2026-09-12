import { defineConfig } from 'vitest/config';
import path from 'path';

const alias = { '@': path.resolve(__dirname, '.') };
const exclude = ['node_modules', 'dist', '.npm-cache'];

/**
 * Node-first, jsdom opt-in.
 *
 * Dựng jsdom cho test logic thuần (quyền, tính kỳ, parse) là lãng phí — chỉ test
 * component (`.tsx`) mới cần DOM. Vitest 4 bỏ `environmentMatchGlobs`, tách bằng
 * `projects`. File `.ts` lẻ nào cần DOM thì thêm `// @vitest-environment jsdom`
 * ở đầu file.
 */
export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'node',
          globals: true,
          environment: 'node',
          include: ['**/*.{test,spec}.ts'],
          exclude,
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'dom',
          globals: true,
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
          include: ['**/*.{test,spec}.tsx'],
          exclude,
        },
      },
    ],
  },
});
