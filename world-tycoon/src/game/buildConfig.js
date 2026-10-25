/**
 * game/buildConfig.js
 * Build configuration flags for World Tycoon: Global Edition.
 *
 * NOTE:
 * - On the developer's local PC, DEBUG_ENABLED is true so the Debug & QA suite is accessible.
 * - In GitHub Actions CI releases and production distribution packages, this is toggled to false
 *   by scripts/set-debug-mode.ps1 so that released binaries and packages have debug mode stripped.
 */

export const BUILD_CONFIG = {
  DEBUG_ENABLED: true,
  VERSION: '1.0.0',
  REPO_OWNER: 'Naman5981',
  REPO_NAME: 'Monopoly',
  RELEASE_URL: 'https://github.com/Naman5981/Monopoly/releases/latest',
  RAW_PACKAGE_URL: 'https://raw.githubusercontent.com/Naman5981/Monopoly/main/world-tycoon/package.json',
  API_RELEASE_URL: 'https://api.github.com/repos/Naman5981/Monopoly/releases/latest',
};
