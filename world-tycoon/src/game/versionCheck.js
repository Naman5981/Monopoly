/**
 * game/versionCheck.js
 * GitHub repository version checker and update alert suite for World Tycoon: Global Edition.
 * Complies with better-interface guidelines (WCAG 2.2 accessibility, responsive layout, clear UX copy).
 */

import { BUILD_CONFIG } from './buildConfig.js';

let previousActiveElement = null;
let keydownListenerAttached = false;
let cachedVersionCheckResult = null;

/**
 * Parses a semantic version string (e.g. "v1.2.3", "1.0.0", "1.2") into a 3-part integer tuple.
 * @param {string} ver
 * @returns {[number, number, number]}
 */
export function parseSemver(ver) {
  if (!ver || typeof ver !== 'string') return [0, 0, 0];
  const cleaned = ver.trim().replace(/^v/i, '');
  const parts = cleaned.split('.').map(p => {
    const num = parseInt(p, 10);
    return isNaN(num) ? 0 : num;
  });
  while (parts.length < 3) parts.push(0);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

/**
 * Compares two semantic version strings.
 * @param {string} v1
 * @param {string} v2
 * @returns {number} 1 if v1 > v2, -1 if v1 < v2, 0 if v1 === v2
 */
export function compareSemver(v1, v2) {
  const [maj1, min1, pat1] = parseSemver(v1);
  const [maj2, min2, pat2] = parseSemver(v2);

  if (maj1 !== maj2) return maj1 > maj2 ? 1 : -1;
  if (min1 !== min2) return min1 > min2 ? 1 : -1;
  if (pat1 !== pat2) return pat1 > pat2 ? 1 : -1;
  return 0;
}

/**
 * Determines whether a remote version is newer than the client version.
 * @param {string} remoteVersion
 * @param {string} [clientVersion]
 * @returns {boolean}
 */
export function isUpdateAvailable(remoteVersion, clientVersion = BUILD_CONFIG.VERSION) {
  if (!remoteVersion) return false;
  return compareSemver(remoteVersion, clientVersion) > 0;
}

/**
 * Fetches the latest published version from the GitHub repository.
 * Defaults to fetching raw package.json (no rate limits & CORS enabled).
 * Falls back to GitHub Releases API if needed.
 *
 * @param {Object} [options]
 * @param {Function} [options.fetchFn]
 * @param {number} [options.timeoutMs]
 * @returns {Promise<{ version: string, source: string } | null>}
 */
export async function fetchLatestRepoVersion(options = {}) {
  const fetchFn = options.fetchFn || (typeof window !== 'undefined' ? window.fetch : globalThis.fetch);
  const timeoutMs = options.timeoutMs || 4000;

  if (typeof fetchFn !== 'function') return null;

  // 1. Try raw package.json (most reliable, rate-limit immune)
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    const res = await fetchFn(BUILD_CONFIG.RAW_PACKAGE_URL, {
      signal: controller?.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data?.version && typeof data.version === 'string') {
        return { version: data.version.trim(), source: 'raw_package' };
      }
    }
  } catch (err) {
    // Silently proceed to fallback
  }

  // 2. Try GitHub Releases API fallback
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    const res = await fetchFn(BUILD_CONFIG.API_RELEASE_URL, {
      signal: controller?.signal,
      headers: { Accept: 'application/vnd.github.v3+json' },
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const tag = data?.tag_name || data?.name;
      if (tag && typeof tag === 'string') {
        return { version: tag.trim().replace(/^v/i, ''), source: 'github_release' };
      }
    }
  } catch (err) {
    // Offline or network error
  }

  return null;
}

/**
 * Checks client game version against GitHub remote version.
 * @param {Object} [options]
 * @returns {Promise<{ checked: boolean, hasUpdate: boolean, clientVersion: string, remoteVersion: string|null, releaseUrl: string }>}
 */
export async function checkGameVersion(options = {}) {
  const clientVersion = options.clientVersion || BUILD_CONFIG.VERSION || '1.0.0';
  const remoteResult = await fetchLatestRepoVersion(options);

  if (!remoteResult?.version) {
    return {
      checked: false,
      hasUpdate: false,
      clientVersion,
      remoteVersion: null,
      releaseUrl: BUILD_CONFIG.RELEASE_URL,
    };
  }

  const remoteVersion = remoteResult.version;
  const hasUpdate = isUpdateAvailable(remoteVersion, clientVersion);

  cachedVersionCheckResult = {
    checked: true,
    hasUpdate,
    clientVersion,
    remoteVersion,
    releaseUrl: BUILD_CONFIG.RELEASE_URL,
  };

  return cachedVersionCheckResult;
}

/**
 * Updates the Title Screen version indicator pill badge with state info.
 * @param {{ hasUpdate: boolean, clientVersion: string, remoteVersion?: string }} versionInfo
 */
export function updateVersionPillUI(versionInfo) {
  if (typeof document === 'undefined') return;

  const btnPill = document.getElementById('btn-version-pill');
  const txtPill = document.getElementById('version-pill-text');
  const dotPill = document.getElementById('version-pill-dot');

  if (!btnPill || !txtPill) return;

  txtPill.textContent = `v${versionInfo.clientVersion}`;

  if (versionInfo.hasUpdate) {
    btnPill.classList.remove('!bg-slate-800/80', 'text-sky-300', 'border-sky-400/30');
    btnPill.classList.add(
      '!bg-emerald-950/80',
      '!text-emerald-300',
      '!border-emerald-400',
      'ring-2',
      'ring-emerald-400/40',
      'shadow-md'
    );
    txtPill.textContent = `v${versionInfo.clientVersion} (Update Ready!)`;
    btnPill.setAttribute('title', `New version v${versionInfo.remoteVersion} available! Click to update.`);
    if (dotPill) {
      dotPill.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
    }
  } else {
    btnPill.setAttribute('title', `World Tycoon v${versionInfo.clientVersion} (Up to date). Click to check updates.`);
    if (dotPill) {
      dotPill.className = 'w-1.5 h-1.5 rounded-full bg-slate-400';
    }
  }
}

/**
 * Handles Escape key press and modal focus trapping for accessibility.
 * @param {KeyboardEvent} e
 */
function handleModalKeydown(e) {
  const modal = document.getElementById('modal-update-alert');
  if (!modal || modal.classList.contains('hidden')) return;

  if (e.key === 'Escape') {
    e.preventDefault();
    closeUpdateAlertModal();
    return;
  }

  if (e.key === 'Tab') {
    const focusable = modal.querySelectorAll(
      'button:not([disabled]), a[href]:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable || focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

/**
 * Displays the accessible Update Game Alert Modal.
 * @param {Object} [info]
 */
export function showUpdateAlertModal(info = null) {
  if (typeof document === 'undefined') return;

  const versionInfo = info || cachedVersionCheckResult || {
    clientVersion: BUILD_CONFIG.VERSION,
    remoteVersion: 'Latest',
    releaseUrl: BUILD_CONFIG.RELEASE_URL,
  };

  const modal = document.getElementById('modal-update-alert');
  if (!modal) return;

  // Save current active element to restore on close
  previousActiveElement = document.activeElement;

  const clientEl = document.getElementById('update-client-version');
  const remoteEl = document.getElementById('update-remote-version');
  const downloadBtn = document.getElementById('btn-update-download');

  if (clientEl) clientEl.textContent = `v${versionInfo.clientVersion}`;
  if (remoteEl) remoteEl.textContent = `v${versionInfo.remoteVersion || 'Latest'}`;
  if (downloadBtn && versionInfo.releaseUrl) {
    downloadBtn.setAttribute('href', versionInfo.releaseUrl);
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  // Focus primary download action for immediate keyboard accessibility
  setTimeout(() => {
    downloadBtn?.focus();
  }, 50);

  // Attach accessible keyboard listener if not attached
  if (!keydownListenerAttached) {
    window.addEventListener('keydown', handleModalKeydown);
    keydownListenerAttached = true;
  }
}

/**
 * Closes and hides the Update Alert Modal smoothly.
 */
export function closeUpdateAlertModal() {
  if (typeof document === 'undefined') return;

  const modal = document.getElementById('modal-update-alert');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  if (keydownListenerAttached) {
    window.removeEventListener('keydown', handleModalKeydown);
    keydownListenerAttached = false;
  }

  // Restore previous focus
  if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
    try {
      previousActiveElement.focus();
    } catch {
      // Ignore
    }
  }
}

/**
 * Manual check triggered by user clicking the version pill.
 */
export async function checkGameUpdateManually() {
  const result = await checkGameVersion();
  updateVersionPillUI(result);

  if (result.hasUpdate) {
    showUpdateAlertModal(result);
  } else {
    // Show polite feedback that the game is on the latest version
    showUpToDateToast(`World Tycoon is up to date (v${result.clientVersion})!`);
  }
}

/**
 * Quick non-intrusive toast showing game is up to date.
 * @param {string} msg
 */
function showUpToDateToast(msg) {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById('version-up-to-date-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'version-up-to-date-toast';
  toast.className =
    'fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-emerald-300 border-2 border-emerald-400/60 shadow-2xl px-4 py-2.5 rounded-full text-xs font-black flex items-center gap-2 backdrop-blur-md transition-all duration-300';
  toast.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-400"></i><span>${msg}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translate(-50%, -10px)';
    setTimeout(() => toast.remove(), 350);
  }, 2400);
}

/**
 * Automatically initializes version checking on game startup.
 * Non-blocking and silent on failure.
 */
export async function initVersionChecker() {
  if (typeof window === 'undefined') return;

  // Initialize initial version pill display
  updateVersionPillUI({
    hasUpdate: false,
    clientVersion: BUILD_CONFIG.VERSION,
  });

  try {
    const result = await checkGameVersion();
    updateVersionPillUI(result);

    if (result.hasUpdate) {
      // Check if user already dismissed for this remote version in this session
      const dismissed = sessionStorage.getItem('wt_update_dismissed');
      if (dismissed !== result.remoteVersion) {
        // Show after a subtle delay so initial title animation finishes cleanly
        setTimeout(() => {
          showUpdateAlertModal(result);
          try {
            sessionStorage.setItem('wt_update_dismissed', result.remoteVersion);
          } catch {
            // sessionStorage unavailable
          }
        }, 800);
      }
    }
  } catch (err) {
    // Silently ignore network failures on startup
  }
}

// Expose handlers on window for HTML onclick and keyboard access
if (typeof window !== 'undefined') {
  window.showUpdateAlertModal = showUpdateAlertModal;
  window.closeUpdateAlertModal = closeUpdateAlertModal;
  window.checkGameUpdateManually = checkGameUpdateManually;
}
