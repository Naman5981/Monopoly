/**
 * ui/modals/chanceCanvas.js
 * High-resolution HTML5 Canvas 2D renderer for the Chance Wheel, golden carnival bulbs,
 * 3D wedge gradients, spoke dividers, and tactile prize cards.
 */

import { CHANCE_WHEEL_PRIZES } from '../../game/data.js';

const createPath2D = (d) => (typeof Path2D !== 'undefined' ? new Path2D(d) : null);

export const WHEEL_VECTOR_ICONS = {
  money: createPath2D('M2 6h20v12H2V6zm2 2v8h16V8H4zm8 1a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm-6 2h1v2H6v-2zm11 0h1v2h-1v-2z'),
  gem: createPath2D('M6 2 2 8l10 14L22 8l-4-6H6zm1.8 2h8.4l2.7 4H5.1l2.7-4z'),
  warning: createPath2D('M12 2 1 21h22L12 2zm0 4.5 7.5 13h-15L12 6.5zM11 11h2v4h-2v-4zm0 5h2v2h-2v-2z'),
  palm: createPath2D('M13 13c1.5-2.5 4.5-4 8-4-1 2.5-2.5 4.5-5 5.5l5 2.5c-3 .5-5.5-.5-7.5-2 1.5 2.5 2 5.5 1 8.5-1.5-2.5-2.5-5-2.5-8-1 3-3 5.5-6 6.5 1-3 2.5-5 4.5-6.5-2.5 1-5.5 1-8-0.5 3-1 5.5-1 7.5 0.5-2-1.5-3.5-3.5-4.5-6 3.5 0 6.5 1.5 8 4l-1 9h2l-1-9z'),
  start: createPath2D('M12 2 15 9l7 3-7 3-3 7-3-7-7-3 7-3 3-7zm0 4.8L10.3 10.3 6.8 12l3.5 1.7L12 17.2l1.7-3.5 3.5-1.7-3.5-1.7L12 6.8z'),
  plane: createPath2D('M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z'),
  gift: createPath2D('M20 6h-2.18c.11-.31.18-.65.18-1a3 3 0 0 0-3-3c-1.4 0-2.56.96-2.88 2.27L12 4.57l-.12-.3C11.56 2.96 10.4 2 9 2a3 3 0 0 0-3 3c0 .35.07.69.18 1H4a2 2 0 0 0-2 2v3h2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V11h2V8a2 2 0 0 0-2-2zM9 4a1 1 0 0 1 1 1c0 .55-.45 1-1 1s-1-.45-1-1a1 1 0 0 1 1-1zm6 0a1 1 0 0 1 1 1c0 .55-.45 1-1 1s-1-.45-1-1a1 1 0 0 1 1-1z'),
  star: createPath2D('M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z')
};

export function drawChanceWheelCanvas() {
  const c = document.getElementById('chance-wheel-canvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  const cx = 320, cy = 320, outerR = 312;
  const rimWidth = 24;
  const innerR = outerR - rimWidth;
  const N = CHANCE_WHEEL_PRIZES.length;
  const slice = (Math.PI * 2) / N;

  ctx.clearRect(0, 0, 640, 640);

  // 1. Casino Gold Outer Rim
  const rimGrad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
  rimGrad.addColorStop(0, '#d97706');
  rimGrad.addColorStop(0.25, '#fef08a');
  rimGrad.addColorStop(0.6, '#f59e0b');
  rimGrad.addColorStop(1, '#78350f');
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.fillStyle = rimGrad;
  ctx.fill();

  // Draw 24 golden carnival bulbs around the rim
  const bulbCount = 24;
  const bulbR = innerR + rimWidth / 2;
  for (let b = 0; b < bulbCount; b++) {
    const angle = (b * Math.PI * 2) / bulbCount;
    const bx = cx + Math.cos(angle) * bulbR;
    const by = cy + Math.sin(angle) * bulbR;
    ctx.beginPath();
    ctx.arc(bx, by, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = b % 2 === 0 ? '#ffffff' : '#fef08a';
    ctx.fill();
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  const hubR = 50;

  // 2. Wheel Slices (Centered with Slice 0 at 12 o'clock)
  CHANCE_WHEEL_PRIZES.forEach((p, i) => {
    const midAngle = -Math.PI / 2 + (i * slice);
    const startAngle = midAngle - slice / 2;
    const endAngle = midAngle + slice / 2;

    // Draw wedge
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, innerR, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = p.color;
    ctx.fill();

    // Subtle inner depth gradient for 3D wedge feel
    const wedgeGrad = ctx.createRadialGradient(cx, cy, hubR, cx, cy, innerR);
    wedgeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
    wedgeGrad.addColorStop(0.65, 'rgba(255, 255, 255, 0)');
    wedgeGrad.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, innerR, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = wedgeGrad;
    ctx.fill();

    // Spoke divider with metallic chrome highlight
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // 3. Tactile 3D White Badge Card (Tangential Orientation)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(midAngle);
    ctx.translate(165, 0);
    ctx.rotate(Math.PI / 2);

    // Determine slice vector icon & readable label
    let iconPath = WHEEL_VECTOR_ICONS.gift;
    let mainLabel = p.label;
    let subLabel = '';
    let themeColor = '#0f172a';

    if (p.type === 'cash') {
      if (p.amount >= 300000) {
        iconPath = WHEEL_VECTOR_ICONS.money;
        mainLabel = '+400K';
        subLabel = 'GRANT';
        themeColor = '#047857'; // emerald
      } else {
        iconPath = WHEEL_VECTOR_ICONS.gem;
        mainLabel = '+250K';
        subLabel = 'BONUS';
        themeColor = '#b45309'; // amber
      }
    } else if (p.type === 'tax') {
      iconPath = WHEEL_VECTOR_ICONS.warning;
      mainLabel = '-200K';
      subLabel = 'FINE';
      themeColor = '#be123c'; // rose red
    } else if (p.type === 'island') {
      iconPath = WHEEL_VECTOR_ICONS.palm;
      mainLabel = 'ISLAND';
      subLabel = 'JAIL';
      themeColor = '#c2410c'; // orange
    } else if (p.type === 'move') {
      if (p.target === 0) {
        iconPath = WHEEL_VECTOR_ICONS.start;
        mainLabel = 'START';
        subLabel = '+300K';
        themeColor = '#0369a1'; // sky blue
      } else {
        iconPath = WHEEL_VECTOR_ICONS.plane;
        mainLabel = 'TOUR';
        subLabel = 'AIRPORT';
        themeColor = '#6b21a8'; // purple
      }
    }

    // Draw White Tactile Card Plate
    const cw = 112;
    const ch = 64;
    const cr = 14;

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-cw / 2, -ch / 2, cw, ch, cr);
    } else {
      ctx.rect(-cw / 2, -ch / 2, cw, ch);
    }
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(15, 23, 42, 0.28)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fill();

    // Card border
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Top Row: Big Centered Vector Icon
    ctx.save();
    ctx.translate(0, -16);
    ctx.scale(0.85, 0.85);
    ctx.translate(-12, -12);
    ctx.fillStyle = themeColor;
    if (iconPath) {
      ctx.fill(iconPath);
    }
    ctx.restore();

    // Middle Row: Big Bold Colored Main Amount/Action
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 16px Inter, sans-serif';
    ctx.fillStyle = themeColor;
    ctx.fillText(mainLabel, 0, 7);

    // Bottom Row: Subtitle pill/text
    ctx.font = '900 10px Inter, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(subLabel, 0, 22);

    ctx.restore();
  });

  // 4. Center Golden Casino Jewel / Hub
  const hubGrad = ctx.createRadialGradient(cx - 8, cy - 8, 4, cx, cy, hubR);
  hubGrad.addColorStop(0, '#fef08a');
  hubGrad.addColorStop(0.4, '#f59e0b');
  hubGrad.addColorStop(0.85, '#d97706');
  hubGrad.addColorStop(1, '#92400e');
  ctx.beginPath();
  ctx.arc(cx, cy, hubR, 0, Math.PI * 2);
  ctx.fillStyle = hubGrad;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Inner center ruby badge
  ctx.beginPath();
  ctx.arc(cx, cy, hubR - 14, 0, Math.PI * 2);
  ctx.fillStyle = '#b45309';
  ctx.fill();
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Center vector star
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1.2, 1.2);
  ctx.translate(-12, -12);
  ctx.fillStyle = '#ffffff';
  if (WHEEL_VECTOR_ICONS.star) {
    ctx.fill(WHEEL_VECTOR_ICONS.star);
  }
  ctx.restore();
}
