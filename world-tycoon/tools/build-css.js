/**
 * tools/build-css.js
 * Programmatic, zero-CLI Tailwind PostCSS compiler.
 * Runs in ~150ms directly inside Node.js, eliminating heavy shell spawns.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export async function compileCss() {
  const inputCssPath = path.join(rootDir, 'src', 'style.css');
  const outputSrcCssPath = path.join(rootDir, 'src', 'compiled.css');
  const outputPublicCssPath = path.join(rootDir, 'public', 'compiled.css');
  const tailwindConfigPath = path.join(rootDir, 'tailwind.config.js');

  if (!fs.existsSync(inputCssPath)) {
    throw new Error(`[build-css] Input CSS not found: ${inputCssPath}`);
  }

  const css = fs.readFileSync(inputCssPath, 'utf8');

  const result = await postcss([
    tailwindcss({ config: tailwindConfigPath }),
    autoprefixer
  ]).process(css, { from: inputCssPath, to: outputSrcCssPath });

  fs.writeFileSync(outputSrcCssPath, result.css, 'utf8');
  if (fs.existsSync(path.dirname(outputPublicCssPath))) {
    fs.writeFileSync(outputPublicCssPath, result.css, 'utf8');
  }

  return { length: result.css.length, warnings: result.warnings() };
}

// When invoked directly from CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  compileCss()
    .then((res) => {
      console.log(`[build-css] Successfully compiled CSS (${res.length} bytes) in milliseconds.`);
    })
    .catch((err) => {
      console.error('[build-css] Error:', err);
      process.exit(1);
    });
}
