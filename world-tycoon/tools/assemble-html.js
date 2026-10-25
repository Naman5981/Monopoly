/**
 * tools/assemble-html.js
 * Assembles world-tycoon/index.html from clean, modular templates in src/templates/.
 * Zero-dependency, instantaneous build step ensuring 100% valid standalone static HTML.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export function assembleIndexHtml() {
  const templatePath = path.join(rootDir, 'index.template.html');
  const outPath = path.join(rootDir, 'index.html');

  if (!fs.existsSync(templatePath)) {
    throw new Error(`[assemble-html] Template not found: ${templatePath}`);
  }

  let html = fs.readFileSync(templatePath, 'utf8');
  const includeRegex = /<!--\s*#include\s+"([^"]+)"\s*-->/g;

  html = html.replace(includeRegex, (_, relPath) => {
    const fullPath = path.resolve(rootDir, relPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`[assemble-html] Template file not found: ${fullPath}`);
    }
    return fs.readFileSync(fullPath, 'utf8').trimEnd();
  });

  fs.writeFileSync(outPath, html, 'utf8');
  return { path: outPath, size: html.length };
}

// When invoked directly from CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    const res = assembleIndexHtml();
    console.log(`[assemble-html] Successfully assembled ${res.path} (${res.size} bytes)`);
  } catch (err) {
    console.error('[assemble-html] Error:', err.message);
    process.exit(1);
  }
}
