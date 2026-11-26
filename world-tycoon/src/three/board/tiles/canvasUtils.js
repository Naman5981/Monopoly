export const BOARD_FONT_FAMILY = 'Fredoka, "Plus Jakarta Sans", system-ui, sans-serif';

export function hexToRgb(hex) {
  const clean = (hex || '#3b82f6').replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
  if (isNaN(num)) return { r: 59, g: 130, b: 246 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

/**
 * three/board/tiles/canvasUtils.js
 * Low-level vector paths, neon typography rendering, and cadastral grid utilities for 2D tile canvas.
 */

export const ICON_PATHS = {
  compass: 'M12 2 15 9l7 3-7 3-3 7-3-7-7-3 7-3 3-7zm0 4.8L10.3 10.3 6.8 12l3.5 1.7L12 17.2l1.7-3.5 3.5-1.7-3.5-1.7L12 6.8z',
  palm: 'M13 13c1.5-2.5 4.5-4 8-4-1 2.5-2.5 4.5-5 5.5l5 2.5c-3 .5-5.5-.5-7.5-2 1.5 2.5 2 5.5 1 8.5-1.5-2.5-2.5-5-2.5-8-1 3-3 5.5-6 6.5 1-3 2.5-5 4.5-6.5-2.5 1-5.5 1-8-0.5 3-1 5.5-1 7.5 0.5-2-1.5-3.5-3.5-4.5-6 3.5 0 6.5 1.5 8 4l-1 9h2l-1-9z',
  sparkle: 'M12 2c.5 4.5 4.5 8.5 9 9-4.5.5-8.5 4.5-9 9-.5-4.5-4.5-8.5-9-9 4.5-.5 8.5-4.5 9-9z',
  airplane: 'M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z',
  dice: 'M3 3h18v18H3V3zm4 4a1.5 1.5 0 1 0 0 .01V7zm10 0a1.5 1.5 0 1 0 0 .01V7zm-5 5a1.5 1.5 0 1 0 0 .01V12zm-5 5a1.5 1.5 0 1 0 0 .01V17zm10 0a1.5 1.5 0 1 0 0 .01V17z',
  lock: 'M17 9V7a5 5 0 0 0-10 0v2H5v13h14V9h-2zm-8-2a3 3 0 0 1 6 0v2H9V7zm3 8a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z',
  train: 'M4 15.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V5c0-3.5-3.58-4-8-4s-8 .5-8 4v10.5zm8 1.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6-7H6V5h12v5z',
  fort: 'M2 4v4h2v2h2V8h4v2h2V8h4v2h2V8h2V4h-2v2h-2V4h-4v2h-2V4H6v2H4V4H2zm3 8v9h14v-9H5zm5 4h4v5h-4v-5z'
};

export function fillRoundRect(ctx, x, y, w, h, r, doFill = true, doStroke = false) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  if (doFill) ctx.fill();
  if (doStroke) ctx.stroke();
}

export function drawCadastralGrid(ctx, isCyber) {
  ctx.save();
  ctx.strokeStyle = isCyber ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.04)';
  ctx.lineWidth = 1.5;

  [120, 216, 312, 408].forEach(x => {
    ctx.beginPath();
    ctx.moveTo(x, 78);
    ctx.lineTo(x, 488);
    ctx.stroke();
  });

  [160, 245, 330, 415].forEach(y => {
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(492, y);
    ctx.stroke();
  });

  ctx.restore();
}

export function drawWhiteNeonText(ctx, text, x, y, font) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 14;
  ctx.strokeText(text, x, y);

  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function drawCrispNeonPrice(ctx, text, x, y, font, colorHex = '#34d399') {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 14;
  ctx.strokeText(text, x, y);

  ctx.fillStyle = colorHex;
  ctx.fillText(text, x, y);
  ctx.restore();
}
