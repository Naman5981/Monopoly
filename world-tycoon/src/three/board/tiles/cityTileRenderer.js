/**
 * three/board/tiles/cityTileRenderer.js
 * 2D Canvas rendering for City and Resort real-estate tiles.
 */

import { GROUP_META } from '../../../game/data.js';
import { fmtMoney } from '../../../game/utils.js';
import { calculateTileRent } from '../../../game/rules.js';
import { drawCadastralGrid, drawWhiteNeonText, drawCrispNeonPrice } from './canvasUtils.js';

export function drawCityTile(ctx, tile, propState, isOwned, isNight, isSunset, isCyber) {
  const groupColor = (tile.group && GROUP_META[tile.group]) ? GROUP_META[tile.group].hex : '#38bdf8';

  drawCadastralGrid(ctx, isCyber);

  // Top Group Color Strip
  ctx.fillStyle = groupColor;
  ctx.fillRect(16, 16, 480, 58);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.40)';
  ctx.fillRect(16, 16, 480, 7);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(16, 74, 480, 4);

  const nameLen = tile.name.length;
  const nameFontSize = nameLen <= 6 ? 84 : (nameLen <= 9 ? 70 : (nameLen <= 11 ? 58 : 48));
  const nameFont = `900 ${nameFontSize}px Rubik, system-ui, sans-serif`;

  let valStr;
  if (isOwned) {
    const rentAmt = calculateTileRent(tile.id);
    valStr = fmtMoney(rentAmt);
  } else {
    valStr = fmtMoney(tile.price);
  }

  const valLen = valStr.length;
  const valFontSize = valLen <= 4 ? 126 : (valLen <= 5 ? 114 : (valLen <= 6 ? 102 : 90));
  const valFont = `900 ${valFontSize}px Rubik, system-ui, sans-serif`;

  const nameY = 265;
  const valY = 415;

  if (isOwned) {
    if (isNight || isSunset) {
      drawWhiteNeonText(ctx, tile.name, 256, nameY, nameFont);
      drawCrispNeonPrice(ctx, valStr, 256, valY, valFont, '#f43f5e');
    } else {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = isCyber ? '#020617' : '#ffffff';
      ctx.lineWidth = isCyber ? 10 : 12;
      ctx.font = nameFont;
      ctx.strokeText(tile.name, 256, nameY);
      ctx.fillStyle = isCyber ? '#ffffff' : '#0f172a';
      ctx.fillText(tile.name, 256, nameY);

      ctx.strokeStyle = isCyber ? '#020617' : '#ffffff';
      ctx.lineWidth = isCyber ? 12 : 14;
      ctx.font = valFont;
      ctx.strokeText(valStr, 256, valY);
      ctx.fillStyle = isCyber ? '#f43f5e' : '#b91c1c';
      ctx.fillText(valStr, 256, valY);
    }
  } else {
    if (isNight || isSunset) {
      drawWhiteNeonText(ctx, tile.name, 256, nameY, nameFont);
      drawCrispNeonPrice(ctx, valStr, 256, valY, valFont, isCyber ? '#38bdf8' : '#34d399');
    } else {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = isCyber ? '#020617' : '#ffffff';
      ctx.lineWidth = isCyber ? 10 : 12;
      ctx.font = nameFont;
      ctx.strokeText(tile.name, 256, nameY);
      ctx.fillStyle = isCyber ? '#ffffff' : '#0f172a';
      ctx.fillText(tile.name, 256, nameY);

      ctx.strokeStyle = isCyber ? '#020617' : '#ffffff';
      ctx.lineWidth = isCyber ? 12 : 14;
      ctx.font = valFont;
      ctx.strokeText(valStr, 256, valY);
      ctx.fillStyle = isCyber ? '#38bdf8' : '#047857';
      ctx.fillText(valStr, 256, valY);
    }
  }
}

export function drawResortTile(ctx, tile, propState, isOwned, isNight, isSunset, isCyber) {
  const resortColor = '#0ea5e9';

  drawCadastralGrid(ctx, isCyber);

  // Top Resort Header Strip
  ctx.fillStyle = resortColor;
  ctx.fillRect(16, 16, 480, 58);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.40)';
  ctx.fillRect(16, 16, 480, 7);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(16, 74, 480, 4);

  // Header Title
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 30px Rubik, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('RESORT', 256, 45);

  const nameLen = tile.name.length;
  const nameFontSize = nameLen <= 6 ? 84 : (nameLen <= 9 ? 70 : (nameLen <= 11 ? 58 : 48));
  const nameFont = `900 ${nameFontSize}px Rubik, system-ui, sans-serif`;

  let valStr;
  if (isOwned) {
    const rentAmt = calculateTileRent(tile.id);
    valStr = fmtMoney(rentAmt);
  } else {
    valStr = fmtMoney(tile.price);
  }

  const valLen = valStr.length;
  const valFontSize = valLen <= 4 ? 126 : (valLen <= 5 ? 114 : (valLen <= 6 ? 102 : 90));
  const valFont = `900 ${valFontSize}px Rubik, system-ui, sans-serif`;

  const nameY = 265;
  const valY = 415;

  if (isOwned) {
    if (isNight || isSunset) {
      drawWhiteNeonText(ctx, tile.name, 256, nameY, nameFont);
      drawCrispNeonPrice(ctx, valStr, 256, valY, valFont, '#f43f5e');
    } else {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = isCyber ? '#020617' : '#ffffff';
      ctx.lineWidth = isCyber ? 10 : 12;
      ctx.font = nameFont;
      ctx.strokeText(tile.name, 256, nameY);
      ctx.fillStyle = isCyber ? '#ffffff' : '#0f172a';
      ctx.fillText(tile.name, 256, nameY);

      ctx.strokeStyle = isCyber ? '#020617' : '#ffffff';
      ctx.lineWidth = isCyber ? 12 : 14;
      ctx.font = valFont;
      ctx.strokeText(valStr, 256, valY);
      ctx.fillStyle = isCyber ? '#f43f5e' : '#b91c1c';
      ctx.fillText(valStr, 256, valY);
    }
  } else {
    if (isNight || isSunset) {
      drawWhiteNeonText(ctx, tile.name, 256, nameY, nameFont);
      drawCrispNeonPrice(ctx, valStr, 256, valY, valFont, isCyber ? '#38bdf8' : '#34d399');
    } else {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = isCyber ? '#020617' : '#ffffff';
      ctx.lineWidth = isCyber ? 10 : 12;
      ctx.font = nameFont;
      ctx.strokeText(tile.name, 256, nameY);
      ctx.fillStyle = isCyber ? '#ffffff' : '#0f172a';
      ctx.fillText(tile.name, 256, nameY);

      ctx.strokeStyle = isCyber ? '#020617' : '#ffffff';
      ctx.lineWidth = isCyber ? 12 : 14;
      ctx.font = valFont;
      ctx.strokeText(valStr, 256, valY);
      ctx.fillStyle = isCyber ? '#38bdf8' : '#047857';
      ctx.fillText(valStr, 256, valY);
    }
  }
}
