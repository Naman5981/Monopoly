import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { drawTileToCanvas } from '../src/three/board/tileCanvas.js';
import { hexToRgb } from '../src/three/board/tiles/canvasUtils.js';
import { gameState } from '../src/game/state.js';

function createMockCtx(calls = []) {
  return {
    clearRect: () => {},
    fillRect: (x, y, w, h) => { calls.push({ type: 'fillRect', x, y, w, h }); },
    strokeRect: (x, y, w, h) => { calls.push({ type: 'strokeRect', x, y, w, h }); },
    createLinearGradient: (x0, y0, x1, y1) => ({
      addColorStop: (stop, color) => { calls.push({ type: 'addColorStop', stop, color }); }
    }),
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    stroke: () => {},
    fill: () => {},
    strokeText: () => {},
    fillText: () => {},
    translate: () => {},
    rotate: () => {},
    arc: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    rect: () => {},
    roundRect: () => {}
  };
}

describe('Board Tile Subtle Player Color Tint Wash', () => {
  beforeEach(() => {
    gameState.players = [
      { id: 0, name: 'Player 1', colorHex: '#ef4444', charColor: 0xef4444 },
      { id: 1, name: 'Player 2', colorHex: '#3b82f6', charColor: 0x3b82f6 }
    ];
  });

  it('converts hex strings to valid RGB values', () => {
    assert.deepStrictEqual(hexToRgb('#ef4444'), { r: 239, g: 68, b: 68 });
    assert.deepStrictEqual(hexToRgb('#3b82f6'), { r: 59, g: 130, b: 246 });
    assert.deepStrictEqual(hexToRgb('#22c55e'), { r: 34, g: 197, b: 94 });
    assert.deepStrictEqual(hexToRgb(''), { r: 59, g: 130, b: 246 }); // fallback
  });

  it('verifies drawTileToCanvas applies gradient fill for owned city tile', () => {
    const calls = [];
    const mockCtx = createMockCtx(calls);
    const mockCanvas = { getContext: () => mockCtx };

    const tile = { id: 1, name: 'SEOUL', type: 'city', group: 'brown', price: 120000 };
    const propState = { owner: 0, level: 1 };

    drawTileToCanvas(mockCanvas, tile, propState);

    // Verify gradient was created with player color stops
    const colorStops = calls.filter(c => c.type === 'addColorStop');
    assert.ok(colorStops.length > 0, 'Should create gradient color stops for owned tile');
    const tintRect = calls.find(c => c.type === 'fillRect' && c.y === 76 && c.h === 404);
    assert.ok(tintRect, 'Should render player color wash rect (29, 76, 454, 404)');
  });

  it('verifies drawTileToCanvas does NOT apply player tint on unowned tiles', () => {
    const calls = [];
    const mockCtx = createMockCtx(calls);
    const mockCanvas = { getContext: () => mockCtx };

    const tile = { id: 1, name: 'SEOUL', type: 'city', group: 'brown', price: 120000 };
    const propState = { owner: null, level: 0 };

    drawTileToCanvas(mockCanvas, tile, propState);

    const tintRect = calls.find(c => c.type === 'fillRect' && c.y === 76 && c.h === 404);
    assert.strictEqual(tintRect, undefined, 'Unowned tile should not have player tint rect');
  });

  it('renders expanded top district band and bottom district footer bar on owned city tiles', () => {
    const calls = [];
    const mockCtx = createMockCtx(calls);
    const mockCanvas = { getContext: () => mockCtx };

    const tile = { id: 1, name: 'SEOUL', type: 'city', group: 'brown', price: 120000 };
    const propState = { owner: 0, level: 1 };

    drawTileToCanvas(mockCanvas, tile, propState);

    const topBand = calls.find(c => c.type === 'fillRect' && c.x === 28 && c.y === 28 && c.w === 456 && c.h === 80);
    const bottomFooter = calls.find(c => c.type === 'fillRect' && c.x === 28 && c.y === 464 && c.w === 456 && c.h === 18);
    assert.ok(topBand, 'Should render expanded top district color band clear of 26px owner border');
    assert.ok(bottomFooter, 'Should render bottom district color footer bar for 360° visibility');
  });
});
