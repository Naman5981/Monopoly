/**
 * game/utils.js
 * Pure utility helpers used across the codebase.
 */

/** Format a monetary value to "1.5M", "600K", etc. */
export function fmtMoney(val) {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    const m = (abs / 1_000_000).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    return `${sign}${m}M`;
  }
  if (abs >= 1000) return `${sign}${Math.round(abs / 1000)}K`;
  return `${sign}${abs}`;
}
