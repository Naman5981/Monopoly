import { defineConfig } from 'vite';
import { assembleIndexHtml } from './tools/assemble-html.js';

function htmlTemplatesPlugin() {
  return {
    name: 'html-templates',
    buildStart() {
      assembleIndexHtml();
    },
    handleHotUpdate({ file, server }) {
      if (file.includes('src/templates') || file.includes('index.template.html')) {
        assembleIndexHtml();
        server.ws.send({ type: 'full-reload' });
      }
    }
  };
}

export default defineConfig(({ mode }) => {
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true' || process.env.VITE_NO_DEBUG === 'true';

  return {
    plugins: [htmlTemplatesPlugin()],
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
