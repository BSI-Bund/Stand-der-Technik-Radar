import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: '/Stand-der-Technik-Radar/',
  plugins: [react()],
  server: { host: '127.0.0.1' },
  build: { target: 'es2022' },
  test: { include: ['tests/unit/**/*.test.ts'] },
});
