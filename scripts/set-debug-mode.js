/**
 * scripts/set-debug-mode.js
 * Cross-platform script to enable or disable debug mode in World Tycoon.
 * Usage:
 *   node ./scripts/set-debug-mode.js --disable
 *   node ./scripts/set-debug-mode.js --enable
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const buildConfigFile = path.join(repoRoot, 'world-tycoon', 'src', 'game', 'buildConfig.js');
const indexHtmlFile = path.join(repoRoot, 'world-tycoon', 'index.html');

const mode = process.argv.includes('--disable') ? 'disable' : (process.argv.includes('--enable') ? 'enable' : null);

if (!mode) {
  console.error('Usage: node ./scripts/set-debug-mode.js --disable | --enable');
  process.exit(1);
}

if (mode === 'disable') {
  console.log('[set-debug-mode] Disabling debug mode for production/CI release build...');

  // 1. Update buildConfig.js
  if (fs.existsSync(buildConfigFile)) {
    let content = fs.readFileSync(buildConfigFile, 'utf8');
    content = content.replace(/DEBUG_ENABLED:\s*true/, 'DEBUG_ENABLED: false');
    fs.writeFileSync(buildConfigFile, content, 'utf8');
    console.log(`[+] Updated ${buildConfigFile} -> DEBUG_ENABLED: false`);
  }

  // 2. Update index.html
  if (fs.existsSync(indexHtmlFile)) {
    let html = fs.readFileSync(indexHtmlFile, 'utf8');
    if (!html.includes('data-debug-disabled="true"')) {
      html = html.replace(/<body\b/, '<body data-debug-disabled="true"');
    }
    const pattern = /(<button\b[^>]*data-debug-ui="true"[^>]*>[\s\S]*?<\/button>)/g;
    html = html.replace(pattern, (match) => {
      return `<!-- [CI_STRIPPED_DEBUG_START] ${match} [CI_STRIPPED_DEBUG_END] -->`;
    });
    fs.writeFileSync(indexHtmlFile, html, 'utf8');
    console.log(`[+] Updated ${indexHtmlFile} -> Debug UI triggers stripped`);
  }
} else if (mode === 'enable') {
  console.log('[set-debug-mode] Enabling debug mode for local developer PC...');

  // 1. Restore buildConfig.js
  if (fs.existsSync(buildConfigFile)) {
    let content = fs.readFileSync(buildConfigFile, 'utf8');
    content = content.replace(/DEBUG_ENABLED:\s*false/, 'DEBUG_ENABLED: true');
    fs.writeFileSync(buildConfigFile, content, 'utf8');
    console.log(`[+] Restored ${buildConfigFile} -> DEBUG_ENABLED: true`);
  }

  // 2. Restore index.html
  if (fs.existsSync(indexHtmlFile)) {
    let html = fs.readFileSync(indexHtmlFile, 'utf8');
    html = html.replace(/\s*data-debug-disabled="true"/g, '');
    const restorePattern = /<!--\s*\[CI_STRIPPED_DEBUG_START\]\s*(<button\b[\s\S]*?<\/button>)\s*\[CI_STRIPPED_DEBUG_END\]\s*-->/g;
    html = html.replace(restorePattern, '$1');
    fs.writeFileSync(indexHtmlFile, html, 'utf8');
    console.log(`[+] Restored ${indexHtmlFile} -> Debug UI triggers restored`);
  }
}
