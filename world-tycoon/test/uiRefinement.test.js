import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

describe('UI Visual Refinement Suite (/better-colors /game-art /fixing-motion-performance)', () => {
  it('verifies calmer atmospheric sky & horizon gradient in effects.js and clouds.js', () => {
    const effectsPath = path.join(ROOT, 'src/three/effects.js');
    const effectsContent = fs.readFileSync(effectsPath, 'utf8');

    // Calmer sky gradient for wood:day
    assert.ok(
      effectsContent.includes('radial-gradient(circle at 50% 28%, #ffffff 0%, #f0f9ff 25%, #e0f2fe 55%, #dbeafe 85%, #cbd5e1 100%)'),
      'effects.js should define a calm atmospheric horizon gradient for wood:day'
    );

    // Soft clouds opacity in clouds.js
    const cloudsPath = path.join(ROOT, 'src/three/environment/clouds.js');
    const cloudsContent = fs.readFileSync(cloudsPath, 'utf8');
    assert.ok(
      cloudsContent.includes('opacity: 0.75'),
      'clouds.js should use softened ambient opacity 0.75'
    );
  });

  it('verifies performance-first solid glass surfaces in style.css with zero high-frequency backdrop blur', () => {
    const stylePath = path.join(ROOT, 'src/style.css');
    const styleContent = fs.readFileSync(stylePath, 'utf8');

    // No backdrop-filter blur in style.css
    assert.ok(
      !styleContent.includes('backdrop-filter: blur'),
      'style.css must not use GPU fill-rate throttling backdrop-filter blur on HUD surfaces'
    );

    // High performance solid backgrounds on HUD cards and pills
    assert.ok(
      styleContent.includes('.hud-pill,') && styleContent.includes('background: rgba(255, 255, 255, 0.96);'),
      '.hud-pill should use solid 0.96 white surface'
    );
    assert.ok(
      styleContent.includes('.player-hud-card {') && (styleContent.includes('background: rgba(255, 255, 255, 0.98);') || styleContent.includes('color-mix(in srgb, var(--player-accent')),
      '.player-hud-card should use crisp solid surface'
    );
    assert.ok(
      styleContent.includes('.hud-status-pill {') && styleContent.includes('background: rgba(15, 23, 42, 0.96);'),
      '.hud-status-pill should use crisp dark solid surface'
    );
  });

  it('verifies single-hue semantic gradient ramps in templates and Svelte modal components', () => {
    const svelteOverlaysPath = path.join(ROOT, 'src/svelte/hud/FloatingOverlays.svelte');
    const hudPath = path.join(ROOT, 'src/templates/game-hud.html');
    const hudContent = fs.existsSync(svelteOverlaysPath) ? fs.readFileSync(svelteOverlaysPath, 'utf8') : fs.readFileSync(hudPath, 'utf8');
    assert.ok(
      hudContent.includes('from-emerald-600 to-teal-700'),
      '#festival-select-banner must use unified single-hue emerald ramp'
    );
    assert.ok(
      hudContent.includes('from-sky-600 to-indigo-700'),
      '#world-tour-banner must use unified single-hue sky/indigo ramp'
    );

    const festivalModalPath = path.join(ROOT, 'src/svelte/modals/FestivalBoostModal.svelte');
    const festivalContent = fs.readFileSync(festivalModalPath, 'utf8');
    assert.ok(
      festivalContent.includes('from-emerald-600 to-teal-700'),
      'FestivalBoostModal.svelte should use clean emerald ramp'
    );
    assert.ok(
      festivalContent.includes('from-amber-500 to-amber-700'),
      'FestivalBoostModal.svelte no-properties alert should use clean warm amber ramp'
    );

    const auctionModalPath = path.join(ROOT, 'src/svelte/modals/AuctionModal.svelte');
    const auctionContent = fs.readFileSync(auctionModalPath, 'utf8');
    assert.ok(
      auctionContent.includes('from-amber-500 to-amber-700'),
      'AuctionModal.svelte header should use clean warm amber ramp'
    );

    const buyoutModalPath = path.join(ROOT, 'src/svelte/modals/BuyoutModal.svelte');
    const buyoutContent = fs.readFileSync(buyoutModalPath, 'utf8');
    assert.ok(
      buyoutContent.includes('from-rose-600 to-rose-800'),
      'BuyoutModal.svelte header should use clean rose ramp'
    );
  });
});
