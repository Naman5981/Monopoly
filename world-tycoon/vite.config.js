import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { assembleIndexHtml } from './tools/assemble-html.js';
import { compileCss } from './tools/build-css.js';

function developmentAutomationPlugin() {
  return {
    name: 'dev-automation',
    async buildStart() {
      assembleIndexHtml();
      await compileCss();
    },
    async handleHotUpdate({ file, server }) {
      const normalizedPath = file.replace(/\\/g, '/');

      // Auto-assemble HTML when templates or template shell change
      if (normalizedPath.includes('src/templates') || normalizedPath.includes('index.template.html')) {
        assembleIndexHtml();
        await compileCss();
        server.ws.send({ type: 'full-reload' });
        return;
      }

      // Auto-compile CSS when style.css changes
      if (normalizedPath.endsWith('src/style.css')) {
        await compileCss();
        server.ws.send({ type: 'full-reload' });
      }
    }
  };
}

export default defineConfig(({ mode }) => {
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true' || process.env.VITE_NO_DEBUG === 'true';

  return {
    plugins: [developmentAutomationPlugin(), svelte()],
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
