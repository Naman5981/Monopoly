import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { setupBrowserMocks } from './setup.js';
setupBrowserMocks();

import { cameraState, rotateBoardLeft, rotateBoardRight, resetCameraView } from '../src/three/core/camera.js';
import { initInputHandlers } from '../src/three/core/input.js';
import { context } from '../src/three/core/context.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('HUD Camera Controls Pill & Mouse Rotation Removal (/anti-ui-slop /game-art)', () => {
  beforeEach(() => {
    resetCameraView();
  });

  it('resetCameraView resets camera target to (0,0,0), zoom to 1.0, and azimuth to 45°', () => {
    cameraState.targetCameraAzimuth = Math.PI;
    cameraState.targetCameraZoom = 2.4;
    cameraState.targetCameraTarget.set(5, 2, -4);

    resetCameraView();

    assert.equal(cameraState.targetCameraAzimuth, Math.PI / 4);
    assert.equal(cameraState.targetCameraZoom, 1.0);
    assert.equal(cameraState.targetCameraTarget.x, 0);
    assert.equal(cameraState.targetCameraTarget.y, 0);
    assert.equal(cameraState.targetCameraTarget.z, 0);
  });

  it('rotateBoardLeft rotates camera azimuth counter-clockwise by 90 degrees', () => {
    resetCameraView();
    const initialAzimuth = cameraState.targetCameraAzimuth; // Math.PI / 4

    rotateBoardLeft();
    assert.equal(cameraState.targetCameraAzimuth, initialAzimuth - Math.PI / 2);

    rotateBoardLeft();
    assert.equal(cameraState.targetCameraAzimuth, initialAzimuth - Math.PI);
  });

  it('rotateBoardRight rotates camera azimuth clockwise by 90 degrees', () => {
    resetCameraView();
    const initialAzimuth = cameraState.targetCameraAzimuth; // Math.PI / 4

    rotateBoardRight();
    assert.equal(cameraState.targetCameraAzimuth, initialAzimuth + Math.PI / 2);

    rotateBoardRight();
    assert.equal(cameraState.targetCameraAzimuth, initialAzimuth + Math.PI);
  });

  it('mouse pointer dragging does NOT rotate board azimuth', () => {
    resetCameraView();
    const initialAzimuth = cameraState.targetCameraAzimuth;

    const mockCanvas = document.createElement('canvas');
    initInputHandlers(mockCanvas, () => {});

    // Simulate drag start on canvas
    mockCanvas.dispatchEvent({ type: 'pointerdown', clientX: 200, clientY: 200, button: 0 });

    // Simulate dragging mouse horizontally by 120 pixels
    window.dispatchEvent({ type: 'pointermove', clientX: 320, clientY: 200 });

    // Simulate pointer release
    window.dispatchEvent({ type: 'pointerup', clientX: 320, clientY: 200, button: 0 });

    // Camera azimuth must remain untouched
    assert.equal(cameraState.targetCameraAzimuth, initialAzimuth, 'Dragging mouse must not rotate camera azimuth');
  });

  it('TopBar.svelte provides tactile camera control pill with turn left, reset, and turn right buttons', () => {
    const topBarPath = path.resolve(__dirname, '../src/svelte/hud/TopBar.svelte');
    const content = fs.readFileSync(topBarPath, 'utf8');

    // Pill container must exist and be universally visible (flex, not hidden on smaller screens)
    assert.ok(content.includes('id="hud-camera-controls-pill"'), 'Must contain hud-camera-controls-pill');
    assert.ok(!content.includes('hidden lg:flex items-center" title="Camera Rotation Controls"'), 'Must not hide camera controls on non-lg screens');

    // Button IDs must be present for automation and accessibility
    assert.ok(content.includes('id="btn-hud-camera-rotate-left"'), 'Must contain rotate left button');
    assert.ok(content.includes('id="btn-hud-camera-reset"'), 'Must contain camera reset button');
    assert.ok(content.includes('id="btn-hud-camera-rotate-right"'), 'Must contain rotate right button');

    // Icons must represent turn left, compass/home reset, and turn right
    assert.ok(content.includes('fa-rotate-left'), 'Must include rotate-left icon');
    assert.ok(content.includes('fa-compass'), 'Must include compass reset icon');
    assert.ok(content.includes('fa-rotate-right'), 'Must include rotate-right icon');
  });
});
