import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupBrowserMocks } from './setup.js';

setupBrowserMocks();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const {
  updateSoundUI,
  handleSetGameVolume,
  handleToggleSound
} = await import('../src/ui/hud/controls.js');

describe('Audio Volume Slider & Sound Controls (/clean-code /bug-hunter)', () => {
  before(() => {
    // Inject sound DOM elements if not already present
    if (!document.getElementById('sound-volume-slider')) {
      const slider = document.createElement('input');
      slider.id = 'sound-volume-slider';
      slider.type = 'range';
      document.body.appendChild(slider);
    }
    if (!document.getElementById('sound-volume-val')) {
      const val = document.createElement('span');
      val.id = 'sound-volume-val';
      document.body.appendChild(val);
    }
    if (!document.getElementById('btn-sound-icon')) {
      const icon = document.createElement('i');
      icon.id = 'btn-sound-icon';
      document.body.appendChild(icon);
    }
    if (!document.getElementById('setup-sound-slider')) {
      const slider = document.createElement('input');
      slider.id = 'setup-sound-slider';
      slider.type = 'range';
      document.body.appendChild(slider);
    }
    if (!document.getElementById('setup-sound-volume-val')) {
      const val = document.createElement('span');
      val.id = 'setup-sound-volume-val';
      document.body.appendChild(val);
    }
    if (!document.getElementById('setup-btn-sound-icon')) {
      const icon = document.createElement('i');
      icon.id = 'setup-btn-sound-icon';
      document.body.appendChild(icon);
    }
  });

  it('ensures in-game volume slider is present and not hidden by md:flex in assembled index.html or Svelte HUD', () => {
    const indexPath = path.join(rootDir, 'index.html');
    const html = fs.readFileSync(indexPath, 'utf8');
    const svelteTopBar = fs.readFileSync(path.join(rootDir, 'src', 'svelte', 'hud', 'TopBar.svelte'), 'utf8');

    assert.ok(svelteTopBar.includes('id="sound-volume-slider"') || html.includes('id="sound-volume-slider"'), 'In-game sound-volume-slider must be in TopBar.svelte or index.html');
    assert.ok(html.includes('id="setup-sound-slider"'), 'Lobby setup-sound-slider must be in index.html');
    assert.ok(!html.includes('hidden md:flex items-center gap-1.5">\n          <input type="range" id="sound-volume-slider"'), 'Volume slider must not be hidden behind md breakpoint');
  });

  it('ensures sound-slider styling is compiled into CSS bundles', () => {
    const compiledCssPath = path.join(rootDir, 'src', 'compiled.css');
    const css = fs.readFileSync(compiledCssPath, 'utf8');

    assert.ok(css.includes('.sound-slider'), 'Compiled CSS must include .sound-slider');
    assert.ok(css.includes('webkit-slider-thumb'), 'Compiled CSS must include webkit-slider-thumb');
    assert.ok(css.includes('moz-range-thumb'), 'Compiled CSS must include moz-range-thumb');
  });

  it('updates sound volume to high level (> 50%) and synchronizes sliders and percentage labels', () => {
    handleSetGameVolume(0.8);

    const slider = document.getElementById('sound-volume-slider');
    const valText = document.getElementById('sound-volume-val');
    const btnIcon = document.getElementById('btn-sound-icon');

    assert.equal(Number(slider.value), 80);
    assert.equal(valText.textContent, '80%');
    assert.ok(btnIcon.className.includes('fa-volume-high'));
  });

  it('updates sound volume to low level (< 50%) with low volume icon', () => {
    handleSetGameVolume(0.3);

    const slider = document.getElementById('sound-volume-slider');
    const valText = document.getElementById('sound-volume-val');
    const btnIcon = document.getElementById('btn-sound-icon');

    assert.equal(Number(slider.value), 30);
    assert.equal(valText.textContent, '30%');
    assert.ok(btnIcon.className.includes('fa-volume-low'));
  });

  it('toggles mute to 0% and displays volume-xmark icon', () => {
    handleSetGameVolume(0.7);
    handleToggleSound(); // Mute

    const slider = document.getElementById('sound-volume-slider');
    const valText = document.getElementById('sound-volume-val');
    const btnIcon = document.getElementById('btn-sound-icon');

    assert.equal(Number(slider.value), 0);
    assert.equal(valText.textContent, '0%');
    assert.ok(btnIcon.className.includes('fa-volume-xmark'));
  });

  it('unmutes and restores previous volume level', () => {
    handleToggleSound(); // Unmute

    const slider = document.getElementById('sound-volume-slider');
    const valText = document.getElementById('sound-volume-val');
    const btnIcon = document.getElementById('btn-sound-icon');

    assert.equal(Number(slider.value), 70);
    assert.equal(valText.textContent, '70%');
    assert.ok(btnIcon.className.includes('fa-volume-high'));
  });
});
