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
    assert.ok(res.size > 8000, 'Assembled index.html should be valid and non-empty');
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

    // Essential Svelte 5 declarative modal components
    const svelteModals = [
      'BuyCityModal.svelte',
      'UpgradeCityModal.svelte',
      'SellCitiesModal.svelte',
      'AuctionModal.svelte',
      'RulesModal.svelte',
      'VictoryModal.svelte',
      'BuyoutModal.svelte',
      'TradeModal.svelte',
      'ChanceWheelModal.svelte',
      'InspectorModal.svelte',
      'FestivalBoostModal.svelte',
      'LeaderboardModal.svelte',
      'MonopolyCelebrationModal.svelte',
      'ResumeMatchModal.svelte',
      'DisconnectNoticeModal.svelte',
      'ConfirmExitLobbyModal.svelte',
      'ReconnectGraceModal.svelte'
    ];
    const svelteModalsDir = path.join(rootDir, 'src', 'svelte', 'modals');
    for (const svelteModal of svelteModals) {
      assert.ok(fs.existsSync(path.join(svelteModalsDir, svelteModal)), `Svelte modal ${svelteModal} must exist`);
    }

    // Essential Svelte 5 declarative lobby components
    const svelteLobbyComponents = [
      'LobbyScreen.svelte',
      'LobbyHeader.svelte',
      'LobbyRoster.svelte',
      'HeroPreview.svelte',
      'MatchSettingsPanel.svelte',
      'MultiplayerPortal.svelte',
      'PlayerSetupCards.svelte',
      'LobbyNetworkStatus.svelte'
    ];
    const svelteLobbyDir = path.join(rootDir, 'src', 'svelte', 'lobby');
    for (const comp of svelteLobbyComponents) {
      assert.ok(fs.existsSync(path.join(svelteLobbyDir, comp)), `Svelte lobby component ${comp} must exist`);
    }
  });

  it('ensures each modular template file in src/templates/ is valid and non-empty', () => {
    const templatesDir = path.join(rootDir, 'src', 'templates');
    const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.html'));

    assert.ok(files.length >= 3, 'Top-level templates must exist');

    for (const f of files) {
      const stat = fs.statSync(path.join(templatesDir, f));
      assert.ok(stat.size > 0, `${f} should not be empty`);
    }
  });

  it('ensures all template files have balanced <div> open and close tags', () => {
    const templatesDir = path.join(rootDir, 'src', 'templates');
    const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.html'));

    for (const file of files) {
      const content = fs.readFileSync(path.join(templatesDir, file), 'utf8');
      const opens = (content.match(/<div\b/gi) || []).length;
      const closes = (content.match(/<\/div>/gi) || []).length;
      assert.equal(opens, closes, `Template ${file} must have balanced <div> tags (opened: ${opens}, closed: ${closes})`);
    }
  });

  it('ensures Svelte ModalsRoot cleanly mounts all active dialogs', () => {
    const modalRoot = fs.readFileSync(path.join(rootDir, 'src', 'svelte', 'modals', 'ModalsRoot.svelte'), 'utf8');
    assert.ok(modalRoot.includes('<RulesModal />'));
    assert.ok(modalRoot.includes('<LeaderboardModal />'));
    assert.ok(modalRoot.includes('<MonopolyCelebrationModal />'));
  });
});

