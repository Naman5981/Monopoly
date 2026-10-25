import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from './setup.js';
setupBrowserMocks();

import {
  parseSemver,
  compareSemver,
  isUpdateAvailable,
  checkGameVersion,
  showUpdateAlertModal,
  closeUpdateAlertModal,
  updateVersionPillUI,
} from '../src/game/versionCheck.js';

describe('Version Check & Update Alert Suite (/better-interface)', () => {
  let modalEl;
  let pillBtn;
  let pillTxt;
  let pillDot;
  let clientVerEl;
  let remoteVerEl;
  let downloadBtn;

  beforeEach(() => {
    modalEl = document.getElementById('modal-update-alert');
    modalEl.classList.add('hidden');
    modalEl.classList.remove('flex');

    pillBtn = document.getElementById('btn-version-pill');
    pillTxt = document.getElementById('version-pill-text');
    pillDot = document.getElementById('version-pill-dot');
    clientVerEl = document.getElementById('update-client-version');
    remoteVerEl = document.getElementById('update-remote-version');
    downloadBtn = document.getElementById('btn-update-download');
  });

  afterEach(() => {
    closeUpdateAlertModal();
  });

  describe('Semver Parsing & Comparison', () => {
    it('parses standard semantic version strings correctly', () => {
      assert.deepEqual(parseSemver('1.0.0'), [1, 0, 0]);
      assert.deepEqual(parseSemver('v1.2.3'), [1, 2, 3]);
      assert.deepEqual(parseSemver('v2.10.45'), [2, 10, 45]);
      assert.deepEqual(parseSemver('1.5'), [1, 5, 0]);
      assert.deepEqual(parseSemver('null'), [0, 0, 0]);
      assert.deepEqual(parseSemver(null), [0, 0, 0]);
    });

    it('compares semantic versions accurately', () => {
      assert.equal(compareSemver('1.0.1', '1.0.0'), 1);
      assert.equal(compareSemver('1.1.0', '1.0.9'), 1);
      assert.equal(compareSemver('2.0.0', '1.99.99'), 1);
      assert.equal(compareSemver('1.0.0', '1.0.1'), -1);
      assert.equal(compareSemver('1.0.0', '1.0.0'), 0);
      assert.equal(compareSemver('v1.0.0', '1.0.0'), 0);
    });

    it('identifies update availability based on comparison', () => {
      assert.equal(isUpdateAvailable('1.0.1', '1.0.0'), true);
      assert.equal(isUpdateAvailable('1.0.0', '1.0.0'), false);
      assert.equal(isUpdateAvailable('0.9.9', '1.0.0'), false);
      assert.equal(isUpdateAvailable(null, '1.0.0'), false);
    });
  });

  describe('GitHub Remote Version Check', () => {
    it('detects update available when remote package.json has higher version', async () => {
      const mockFetch = async () => ({
        ok: true,
        json: async () => ({ version: '1.2.0' }),
      });

      const res = await checkGameVersion({
        fetchFn: mockFetch,
        clientVersion: '1.0.0',
      });

      assert.equal(res.checked, true);
      assert.equal(res.hasUpdate, true);
      assert.equal(res.clientVersion, '1.0.0');
      assert.equal(res.remoteVersion, '1.2.0');
      assert.match(res.releaseUrl, /github\.com.*releases/);
    });

    it('reports no update when remote package.json is same or lower', async () => {
      const mockFetch = async () => ({
        ok: true,
        json: async () => ({ version: '1.0.0' }),
      });

      const res = await checkGameVersion({
        fetchFn: mockFetch,
        clientVersion: '1.0.0',
      });

      assert.equal(res.checked, true);
      assert.equal(res.hasUpdate, false);
      assert.equal(res.remoteVersion, '1.0.0');
    });

    it('handles offline or network failure gracefully without throwing', async () => {
      const mockFetch = async () => {
        throw new Error('Network unreachable');
      };

      const res = await checkGameVersion({
        fetchFn: mockFetch,
        clientVersion: '1.0.0',
      });

      assert.equal(res.checked, false);
      assert.equal(res.hasUpdate, false);
      assert.equal(res.remoteVersion, null);
    });
  });

  describe('UI & Accessibility Behaviors (/better-interface)', () => {
    it('updates version pill styling when update is available', () => {
      updateVersionPillUI({
        hasUpdate: true,
        clientVersion: '1.0.0',
        remoteVersion: '1.1.0',
      });

      assert.match(pillTxt.textContent, /Update Ready/);
      assert.ok(pillBtn.classList.contains('ring-emerald-400/40') || pillBtn.classList.contains('!border-emerald-400'));
    });

    it('opens and populates update alert modal with proper version details', () => {
      showUpdateAlertModal({
        clientVersion: '1.0.0',
        remoteVersion: '1.1.5',
        releaseUrl: 'https://github.com/Naman5981/Monopoly/releases/latest',
      });

      assert.equal(modalEl.classList.contains('hidden'), false);
      assert.equal(clientVerEl.textContent, 'v1.0.0');
      assert.equal(remoteVerEl.textContent, 'v1.1.5');
      assert.equal(downloadBtn.getAttribute('href'), 'https://github.com/Naman5981/Monopoly/releases/latest');
    });

    it('closes modal and hides overlay when closeUpdateAlertModal is called', () => {
      showUpdateAlertModal({
        clientVersion: '1.0.0',
        remoteVersion: '1.1.5',
      });
      assert.equal(modalEl.classList.contains('hidden'), false);

      closeUpdateAlertModal();
      assert.equal(modalEl.classList.contains('hidden'), true);
    });

    it('dismisses modal on Escape key press for keyboard accessibility', () => {
      showUpdateAlertModal({
        clientVersion: '1.0.0',
        remoteVersion: '1.1.5',
      });
      assert.equal(modalEl.classList.contains('hidden'), false);

      const escEvent = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      window.dispatchEvent(escEvent);

      assert.equal(modalEl.classList.contains('hidden'), true);
    });
  });
});
