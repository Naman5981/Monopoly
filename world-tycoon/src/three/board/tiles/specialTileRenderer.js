/**
 * three/board/tiles/specialTileRenderer.js
 * 2D Canvas rendering for Special tiles (Start, Jail, Festival, Airport, Chance, Tax).
 */

import { fmtMoney } from '../../../game/utils.js';
import { ICON_PATHS, fillRoundRect } from './canvasUtils.js';

export function drawChanceTile(ctx, isCyber) {
  const cx = 256;
  const cy = 175;
  const tw = 160;
  const th = 220;

  // 1. Radiant Gold / Cyber Aura behind the card
  const aura = ctx.createRadialGradient(cx, cy, 35, cx, cy, 145);
  aura.addColorStop(0, isCyber ? 'rgba(0, 245, 255, 0.4)' : 'rgba(245, 158, 11, 0.35)');
  aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.beginPath();
  ctx.arc(cx, cy, 145, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  // 2. Card Body Drop Shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 12;

  // 3. Card Body Surface (Deep Cosmic Slate or Cyber Black)
  ctx.fillStyle = isCyber ? '#030712' : '#090d16';
  fillRoundRect(ctx, cx - tw / 2, cy - th / 2, tw, th, 16, true, false);
  ctx.restore();

  // 4. Outer Metallic Bezel
  ctx.strokeStyle = isCyber ? '#00f5ff' : '#f59e0b';
  ctx.lineWidth = 4;
  fillRoundRect(ctx, cx - tw / 2, cy - th / 2, tw, th, 16, false, true);

  // 5. Inner Gilded Arch Frame
  ctx.strokeStyle = isCyber ? '#a855f7' : '#fde047';
  ctx.lineWidth = 2;
  fillRoundRect(ctx, cx - tw / 2 + 8, cy - th / 2 + 8, tw - 16, th - 16, 12, false, true);

  // 6. Starry Constellation Dots
  ctx.fillStyle = isCyber ? '#00f5ff' : '#fef08a';
  [[-40, -60], [45, -55], [-50, 60], [48, 65], [-55, 0], [55, 5]].forEach(([ox, oy]) => {
    ctx.beginPath();
    ctx.arc(cx + ox, cy + oy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // 7. Central Golden 3D Mystery Crest "?"
  ctx.fillStyle = isCyber ? '#00f5ff' : '#fde047';
  ctx.font = '900 68px Rubik, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = isCyber ? 'rgba(0, 245, 255, 0.8)' : 'rgba(245, 158, 11, 0.75)';
  ctx.shadowBlur = 14;
  ctx.fillText('?', cx, cy - 6);
  ctx.shadowColor = 'transparent';

  // 8. Card Top/Bottom Labels
  ctx.font = '900 12px Rubik, monospace';
  ctx.fillStyle = isCyber ? '#38bdf8' : '#fef08a';
  ctx.fillText('FORTUNE', cx, cy - th / 2 + 22);
  ctx.fillText('• DECK •', cx, cy + th / 2 - 22);

  // 9. Chance Header Pill (Deep Slate with Gold / Neon Border)
  ctx.fillStyle = isCyber ? '#0f172a' : '#0f172a';
  ctx.strokeStyle = isCyber ? '#00f5ff' : '#f59e0b';
  ctx.lineWidth = 3.5;
  fillRoundRect(ctx, 36, 348, 440, 74, 20, true, true);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 46px Rubik, system-ui, sans-serif';
  ctx.fillText('CHANCE', 256, 385);

  // 10. Subtitle
  ctx.fillStyle = isCyber ? '#94a3b8' : '#64748b';
  ctx.font = '800 22px Rubik, system-ui, sans-serif';
  ctx.fillText('6 FORTUNE CARDS', 256, 468);
}

export function drawTaxTile(ctx, tile, isCyber) {
  const taxAmount = tile.amount || 150000;

  // Vault Box
  ctx.fillStyle = isCyber ? '#111827' : '#f1f5f9';
  ctx.strokeStyle = isCyber ? '#ec4899' : '#64748b';
  ctx.lineWidth = 6;
  fillRoundRect(ctx, 166, 60, 180, 190, 24, true, true);

  ctx.fillStyle = '#dc2626';
  ctx.font = '900 100px Rubik, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('%', 256, 155);

  // Title
  ctx.fillStyle = isCyber ? '#ffffff' : '#0f172a';
  ctx.font = '900 56px Rubik, system-ui, sans-serif';
  const taxTitle = tile.name && tile.name !== 'TAX' ? tile.name : 'WORLD TAX';
  ctx.fillText(taxTitle, 256, 340);

  // Amount Pill
  ctx.fillStyle = '#fef2f2';
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 3;
  fillRoundRect(ctx, 36, 386, 440, 68, 18, true, true);

  ctx.fillStyle = '#dc2626';
  ctx.font = '900 46px Rubik, system-ui, sans-serif';
  ctx.fillText(`-${fmtMoney(taxAmount)}`, 256, 420);

  // Subtitle
  ctx.fillStyle = isCyber ? '#94a3b8' : '#64748b';
  ctx.font = '800 20px Rubik, system-ui, sans-serif';
  ctx.fillText((tile.subtitle || 'FEES FUND THE FESTIVAL POOL').toUpperCase(), 256, 488);
}

export function drawCornerTile(ctx, tile, isCyber) {
  const tileId = tile.id;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (tileId === 0) {
    // START
    ctx.save();
    ctx.beginPath();
    ctx.arc(256, 175, 92, 0, Math.PI * 2);
    ctx.fillStyle = '#059669';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.translate(256 - 48, 175 - 48);
    ctx.scale(4.0, 4.0);
    ctx.fillStyle = '#fef08a';
    ctx.fill(new Path2D(ICON_PATHS.compass));
    ctx.restore();

    ctx.fillStyle = '#047857';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    fillRoundRect(ctx, 36, 310, 440, 74, 20, true, true);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 52px Rubik, system-ui, sans-serif';
    ctx.fillText('START', 256, 347);

    ctx.fillStyle = '#ecfdf5';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    fillRoundRect(ctx, 36, 404, 440, 66, 18, true, true);

    ctx.fillStyle = '#065f46';
    ctx.font = '900 24px Rubik, system-ui, sans-serif';
    ctx.fillText(tile.subtitle ? tile.subtitle.toUpperCase() : 'PASS: +250K • LAND: +350K', 256, 437);
    return;
  }

  if (tileId === 8) {
    // ISLAND JAIL / DESERT JAIL
    const isDesert = tile.name === 'DESERT JAIL' || tile.name === 'DESERT RETREAT';
    const jailTitle = isDesert ? 'DESERT JAIL' : 'ISLAND JAIL';
    const jailIconPath = isDesert ? (ICON_PATHS.fort || ICON_PATHS.palm) : ICON_PATHS.palm;

    ctx.save();
    ctx.beginPath();
    ctx.arc(256, 175, 92, 0, Math.PI * 2);
    ctx.fillStyle = isDesert ? '#b45309' : '#d97706';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.translate(256 - 36, 175 - 36);
    ctx.scale(3.0, 3.0);
    ctx.fillStyle = '#fef3c7';
    ctx.fill(new Path2D(jailIconPath));
    ctx.restore();

    ctx.fillStyle = isDesert ? '#92400e' : '#b45309';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    fillRoundRect(ctx, 36, 310, 440, 74, 20, true, true);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 46px Rubik, system-ui, sans-serif';
    ctx.fillText(jailTitle, 256, 347);

    ctx.fillStyle = '#fffbeb';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    fillRoundRect(ctx, 36, 404, 440, 66, 18, true, true);

    ctx.fillStyle = '#92400e';
    ctx.font = '900 24px Rubik, system-ui, sans-serif';
    ctx.fillText(tile.subtitle ? tile.subtitle.toUpperCase() : 'ROLL DOUBLES OR 150K BAIL', 256, 437);
    return;
  }

  if (tileId === 16) {
    // FESTIVAL / PUSHKAR FAIR
    const festTitle = tile.name === 'PUSHKAR FAIR' ? 'PUSHKAR FAIR' : 'FESTIVAL';

    ctx.save();
    ctx.beginPath();
    ctx.arc(256, 175, 92, 0, Math.PI * 2);
    ctx.fillStyle = '#7c3aed';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.translate(256 - 40, 175 - 40);
    ctx.scale(3.4, 3.4);
    ctx.fillStyle = '#fbcfe8';
    ctx.fill(new Path2D(ICON_PATHS.sparkle));
    ctx.restore();

    ctx.fillStyle = '#6d28d9';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    fillRoundRect(ctx, 36, 310, 440, 74, 20, true, true);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 46px Rubik, system-ui, sans-serif';
    ctx.fillText(festTitle, 256, 347);

    ctx.fillStyle = '#faf5ff';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.5;
    fillRoundRect(ctx, 36, 404, 440, 66, 18, true, true);

    ctx.fillStyle = '#581c87';
    ctx.font = '900 24px Rubik, system-ui, sans-serif';
    ctx.fillText(tile.subtitle ? tile.subtitle.toUpperCase() : '2X CITY RENT & TAX JACKPOT', 256, 437);
    return;
  }

  if (tileId === 24) {
    // WORLD TOUR / ROYAL EXPRESS
    const isRoyal = tile.name === 'ROYAL EXPRESS';
    const tourTitle = isRoyal ? 'ROYAL EXPRESS' : 'WORLD TOUR';
    const tourIconPath = isRoyal ? (ICON_PATHS.train || ICON_PATHS.airplane) : ICON_PATHS.airplane;

    ctx.save();
    ctx.beginPath();
    ctx.arc(256, 175, 92, 0, Math.PI * 2);
    ctx.fillStyle = isRoyal ? '#b45309' : '#0284c7';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.translate(256 - (isRoyal ? 40 : 44), 175 - (isRoyal ? 40 : 44));
    ctx.scale(isRoyal ? 3.4 : 3.6, isRoyal ? 3.4 : 3.6);
    ctx.fillStyle = '#ffffff';
    ctx.fill(new Path2D(tourIconPath));
    ctx.restore();

    ctx.fillStyle = isRoyal ? '#92400e' : '#0369a1';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    fillRoundRect(ctx, 36, 310, 440, 74, 20, true, true);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 46px Rubik, system-ui, sans-serif';
    ctx.fillText(tourTitle, 256, 347);

    ctx.fillStyle = '#f0f9ff';
    ctx.strokeStyle = isRoyal ? '#f59e0b' : '#0ea5e9';
    ctx.lineWidth = 2.5;
    fillRoundRect(ctx, 36, 404, 440, 66, 18, true, true);

    ctx.fillStyle = isRoyal ? '#78350f' : '#075985';
    ctx.font = '900 23px Rubik, system-ui, sans-serif';
    ctx.fillText(isRoyal ? 'PALACE ON WHEELS • ANY TILE' : 'DIRECT FLIGHT TO ANY TILE', 256, 437);
    return;
  }

  // Fallback
  ctx.fillStyle = isCyber ? '#ffffff' : '#0f172a';
  ctx.font = '900 52px Rubik, system-ui, sans-serif';
  ctx.fillText(tile.name, 256, 395);
  ctx.fillStyle = isCyber ? '#94a3b8' : '#64748b';
  ctx.font = '800 32px Rubik, system-ui, sans-serif';
  ctx.fillText(tile.subtitle || '', 256, 452);
}
