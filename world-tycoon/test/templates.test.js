import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { assembleIndexHtml } from '../tools/assemble-html.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Modular Templates & HTML Assembly (/clean-code)', () => {
  it('assembles index.html from index.template.html cleanly without errors', () => {
    const res = assembleIndexHtml();
    assert.ok(res.size > 100000, 'Assembled index.html should be over 100KB');
    assert.ok(fs.existsSync(res.path), 'Output file must exist');

    const content = fs.readFileSync(res.path, 'utf8');
    assert.equal(content.includes('<!-- #include'), false, 'All #include directives must be resolved');
  });

  it('contains all essential SVG symbols, HUD elements, and modal root IDs in assembled HTML', () => {
    const indexPath = path.join(rootDir, 'index.html');
    const content = fs.readFileSync(indexPath, 'utf8');

    // Essential SVG sprite symbol container
    assert.ok(content.includes('id="game-svg-symbols"'));

    // Essential screens and canvas
    assert.ok(content.includes('id="landing-setup-screen"'));
    assert.ok(content.includes('id="three-canvas-container"'));

    // Essential modals
    const expectedModalIds = [
      'modal-buy-city',
      'modal-festival-boost',
      'modal-festival-no-properties',
      'modal-buyout-city',
      'modal-sell-cities',
      'modal-upgrade-city',
      'modal-auction',
      'modal-chance-wheel',
      'modal-chance-result',
      'modal-tile-inspector',
      'modal-portfolio',
      'modal-trade',
      'modal-rules',
      'modal-victory',
      'modal-monopoly-celebration',
      'modal-wardrobe',
      'modal-update-alert'
    ];

    for (const modalId of expectedModalIds) {
      assert.ok(content.includes(`id="${modalId}"`), `index.html must include modal id "${modalId}"`);
    }
  });

  it('ensures each modular template file in src/templates/ is valid and non-empty', () => {
    const templatesDir = path.join(rootDir, 'src', 'templates');
    const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.html'));
    const modalFiles = fs.readdirSync(path.join(templatesDir, 'modals')).filter(f => f.endsWith('.html'));

    assert.ok(files.length >= 3, 'Top-level templates must exist');
    assert.ok(modalFiles.length >= 15, 'Modal templates must exist');

    for (const f of files) {
      const stat = fs.statSync(path.join(templatesDir, f));
      assert.ok(stat.size > 0, `${f} should not be empty`);
    }

    for (const f of modalFiles) {
      const stat = fs.statSync(path.join(templatesDir, 'modals', f));
      assert.ok(stat.size > 0, `modals/${f} should not be empty`);
    }
  });
});
