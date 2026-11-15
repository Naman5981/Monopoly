/**
 * game/buildConfig.js
 * Build configuration flags for World Tycoon: Global Edition.
 *
 * NOTE:
 * - On the developer's local PC, DEBUG_ENABLED is true so the Debug & QA suite is accessible.
 * - In GitHub Actions CI releases and production distribution packages, this is toggled to false
 *   by scripts/set-debug-mode.ps1 so that released binaries and packages have debug mode stripped.
 */

export function isLocalDevEnvironment() {
  if (typeof window === 'undefined' || !window.location) return true; // Node.js test environment
  const host = (window.location.hostname || '').toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '';
}

export const BUILD_CONFIG = {
  _debugOverride: undefined,
  get DEBUG_ENABLED() {
    if (this._debugOverride !== undefined) return this._debugOverride;
    return isLocalDevEnvironment();
  },
  set DEBUG_ENABLED(val) {
    this._debugOverride = val;
  },
  VERSION: '2.0.1',
  REPO_OWNER: 'Naman5981',
  REPO_NAME: 'Monopoly',
  RELEASE_URL: 'https://github.com/Naman5981/Monopoly/releases/latest',
  RAW_PACKAGE_URL: 'https://raw.githubusercontent.com/Naman5981/Monopoly/main/world-tycoon/package.json',
  API_RELEASE_URL: 'https://api.github.com/repos/Naman5981/Monopoly/releases/latest',
};
