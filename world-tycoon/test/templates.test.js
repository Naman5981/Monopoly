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
    assert.ok(res.size > 30000, 'Assembled index.html should be valid and non-empty');
    assert.ok(fs.existsSync(res.path), 'Output file must exist');

    const content = fs.readFileSync(res.path, 'utf8');
    assert.equal(content.includes('<!-- #include'), false, 'All #include directives must be resolved');
  });

  it('contains all essential SVG symbols, HUD elements, and modal root IDs in assembled HTML', () => {
    const indexPath = path.join(rootDir, 'index.html');
    const content = fs.readFileSync(indexPath, 'utf8');

    // Essential SVG sprite symbol container
    assert.ok(content.includes('id="game-svg-symbols"'));

    // Essential screens, mounts, and canvas
    assert.ok(content.includes('id="landing-setup-screen"'));
    assert.ok(content.includes('id="three-canvas-container"'));
    assert.ok(content.includes('id="svelte-hud-mount"'));
    assert.ok(content.includes('id="svelte-modals-mount"'));

    // The setup dialog remains an HTML template; migrated dialogs mount from Svelte.
    const expectedModalIds = ['modal-setup'];

    for (const modalId of expectedModalIds) {
      assert.ok(content.includes(`id="${modalId}"`), `index.html must include modal id "${modalId}"`);
    }

    // Essential Svelte 5 declarative modal components
    const svelteModals = [
      'BuyCityModal.svelte',
      'UpgradeCityModal.svelte',
      'SellCitiesModal.svelte',
      'AuctionModal.svelte',
      'PortfolioModal.svelte',
      'RulesModal.svelte',
      'VictoryModal.svelte',
      'WardrobeModal.svelte',
      'BuyoutModal.svelte',
      'TradeModal.svelte',
      'ChanceWheelModal.svelte',
      'InspectorModal.svelte',
      'FestivalBoostModal.svelte',
      'LeaderboardModal.svelte',
      'MonopolyCelebrationModal.svelte',
      'UpdateAlertModal.svelte',
      'ResumeMatchModal.svelte',
      'DisconnectNoticeModal.svelte',
      'ConfirmExitLobbyModal.svelte',
      'ReconnectGraceModal.svelte'
    ];
    const svelteModalsDir = path.join(rootDir, 'src', 'svelte', 'modals');
    for (const svelteModal of svelteModals) {
      assert.ok(fs.existsSync(path.join(svelteModalsDir, svelteModal)), `Svelte modal ${svelteModal} must exist`);
    }
  });

  it('ensures each modular template file in src/templates/ is valid and non-empty', () => {
    const templatesDir = path.join(rootDir, 'src', 'templates');
    const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.html'));
    const modalFiles = fs.readdirSync(path.join(templatesDir, 'modals')).filter(f => f.endsWith('.html'));

    assert.ok(files.length >= 3, 'Top-level templates must exist');
    assert.ok(modalFiles.length >= 1, 'The remaining setup template must exist');

    for (const f of files) {
      const stat = fs.statSync(path.join(templatesDir, f));
      assert.ok(stat.size > 0, `${f} should not be empty`);
    }

    for (const f of modalFiles) {
      const stat = fs.statSync(path.join(templatesDir, 'modals', f));
      assert.ok(stat.size > 0, `modals/${f} should not be empty`);
    }
  });

  it('ensures all template files have balanced <div> open and close tags', () => {
    const templatesDir = path.join(rootDir, 'src', 'templates');
    const modalFiles = fs.readdirSync(path.join(templatesDir, 'modals')).filter(f => f.endsWith('.html'));

    for (const file of modalFiles) {
      const content = fs.readFileSync(path.join(templatesDir, 'modals', file), 'utf8');
      const opens = (content.match(/<div\b/gi) || []).length;
      const closes = (content.match(/<\/div>/gi) || []).length;
      assert.equal(opens, closes, `Modal template modals/${file} must have balanced <div> tags (opened: ${opens}, closed: ${closes})`);
    }
  });

  it('keeps the remaining setup dialog separate from the Svelte modal tree', () => {
    const setupTemplate = fs.readFileSync(path.join(rootDir, 'src', 'templates', 'modals', 'setup-dialog.html'), 'utf8');
    const modalRoot = fs.readFileSync(path.join(rootDir, 'src', 'svelte', 'modals', 'ModalsRoot.svelte'), 'utf8');
    assert.ok(setupTemplate.includes('id="modal-setup"'));
    assert.ok(modalRoot.includes('<LeaderboardModal />'));
    assert.ok(modalRoot.includes('<MonopolyCelebrationModal />'));
  });
});

