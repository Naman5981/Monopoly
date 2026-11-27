<script>
  /**
   * svelte/hud/EventLogDrawer.svelte
   * Declarative floating event log drawer and bottom-left toggle pill.
   */
  import { hudStore, updateHudState } from '../stores/hudStore.js';
  import { modalStore } from '../stores/modalStore.js';

  let isOpen = $state(false);
  let isDarkTheme = $state(false);
  let isLeaderboardOpen = $state(false);
  let localRank = $state(1);
  let totalPlayers = $state('2');
  let localNetWorth = $state('$0');

  hudStore.subscribe(val => {
    isOpen = Boolean(val?.isEventLogOpen);
    isDarkTheme = val?.lightingMode === 'Night' || val?.boardStyle === 'cyberpunk';
    localRank = val?.localRank || 1;
    totalPlayers = String(val?.playerCount || '2/2').split('/')[1] || '2';
    localNetWorth = val?.localNetWorthFormatted || '$0';
  });
  modalStore.subscribe(val => {
    isLeaderboardOpen = Boolean(val?.leaderboard?.visible);
  });

  export function toggle() {
    if (typeof window.toggleEventLogDrawer === 'function') {
      window.toggleEventLogDrawer();
    } else {
      isOpen = !isOpen;
      updateHudState({ isEventLogOpen: isOpen });
    }
  }

  function onLeaderboard() {
    window.toggleLeaderboardModal?.();
  }

  function onClose() {
    if (isOpen) {
      toggle();
    }
  }

  function handleWindowKeydown(e) {
    if (isOpen && e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<!-- Bottom-Left Event Log Layer -->
<div
  id="hud-bottom-left-container"
  class="fixed bottom-3 sm:bottom-4 left-3 sm:left-4 z-40 hidden flex flex-col items-start gap-2 pointer-events-none select-none max-w-[calc(100vw-1.5rem)]"
>
  <!-- Event Log Drawer (opens above button in bottom-left corner) -->
  <div
    id="event-log-drawer"
    role="region"
    aria-label="Live Event Log"
    class="{isOpen ? 'flex' : 'hidden'} w-72 sm:w-80 max-h-60 sm:max-h-72 backdrop-blur-xs border rounded-2xl shadow-2xl p-3 flex-col pointer-events-auto overscroll-contain transition-[transform,opacity] duration-200 {isDarkTheme ? 'bg-slate-900/95 border-white/15 text-slate-100' : 'bg-white/95 border-slate-200/90 text-slate-900'}"
  >
    <div class="flex items-center justify-between border-b pb-2 mb-2 {isDarkTheme ? 'border-white/10' : 'border-slate-100'}">
      <span class="font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 {isDarkTheme ? 'text-slate-100' : 'text-slate-800'}">
        <i class="fa-solid fa-list-ul {isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'}"></i> Live Event Log
      </span>
      <button
        onclick={onClose}
        class="text-xs p-1 cursor-pointer transition-colors {isDarkTheme ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'}"
        title="Close Event Log"
        aria-label="Close Event Log"
      >
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
    <div
      id="activity-log"
      role="log"
      aria-live="polite"
      class="flex-1 overflow-y-auto space-y-1.5 text-xs font-medium pr-1 max-h-44 sm:max-h-56 {isDarkTheme ? 'text-slate-200' : 'text-slate-800'}"
    ></div>
  </div>

  <!-- Bottom-Left Utility Pills (Event Log + Local Standing Leaderboard) -->
  <div class="flex items-center gap-2 pointer-events-auto">
    <button
      id="btn-hud-event-log"
      onclick={toggle}
      class="hud-pill flex items-center gap-2 text-xs font-bold shadow-md transition-[transform,background-color,color,border-color] duration-150 ease-out hover:scale-[1.02] active:scale-[0.96] cursor-pointer {isOpen ? '!bg-indigo-600 !text-white !border-indigo-700 shadow-indigo-500/20' : ''}"
      title="Toggle Match Event Log"
      aria-label="Toggle Match Event Log"
      aria-expanded={isOpen}
    >
      <i class="fa-solid fa-list-ul text-xs {isOpen ? 'text-white' : 'text-indigo-600'}"></i>
      <span>Event Log</span>
    </button>

    <button
      id="btn-hud-leaderboard"
      onclick={onLeaderboard}
      class="hud-pill flex items-center gap-1.5 text-xs font-bold shadow-md transition-[transform,background-color,color,border-color,box-shadow] duration-150 ease-out hover:scale-[1.02] active:scale-[0.96] cursor-pointer {isLeaderboardOpen ? '!bg-amber-400 !text-slate-950 !border-amber-300 ring-2 ring-amber-300' : ''}"
      title="View Empire Standings"
      aria-label="View Net Worth Leaderboard"
      aria-expanded={isLeaderboardOpen}
    >
      <i class="fa-solid fa-trophy text-xs {isLeaderboardOpen ? 'text-slate-950' : 'text-amber-500'}"></i>
      <span class="tabular-nums font-black">#{localRank} of {totalPlayers}</span>
      <span class="opacity-40" aria-hidden="true">•</span>
      <span class="tabular-nums font-mono font-black">{localNetWorth}</span>
    </button>
  </div>
</div>
