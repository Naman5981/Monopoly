import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true' || process.env.VITE_NO_DEBUG === 'true';

  return {
    server: {
      port: 3000,
      open: true,
    },
    build: {
      target: 'esnext',
      outDir: 'dist',
    },
    define: {
      __DEBUG_ALLOWED__: JSON.stringify(!isCI)
    }
  };
});
