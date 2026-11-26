<script>
  /**
   * svelte/hud/EventLogDrawer.svelte
   * Declarative floating event log drawer and bottom-left toggle pill.
   */
  import { hudStore, updateHudState } from '../stores/hudStore.js';

  let isOpen = $state(false);
  let isDarkTheme = $state(false);
  hudStore.subscribe(val => {
    isOpen = Boolean(val?.isEventLogOpen);
    isDarkTheme = val?.lightingMode === 'Night' || val?.boardStyle === 'cyberpunk';
  });

  export function toggle() {
    if (typeof window.toggleEventLogDrawer === 'function') {
      window.toggleEventLogDrawer();
    } else {
      isOpen = !isOpen;
      updateHudState({ isEventLogOpen: isOpen });
    }
  }

  function onClose() {
    if (isOpen) {
      toggle();
    }
  }
</script>

<!-- Bottom-Left Event Log Layer -->
<div
  id="hud-bottom-left-container"
  class="fixed bottom-3 sm:bottom-4 left-3 sm:left-4 z-40 hidden flex flex-col items-start gap-2 pointer-events-none select-none max-w-[calc(100vw-1.5rem)]"
>
  <!-- Event Log Drawer (opens above button in bottom-left corner) -->
  <div
    id="event-log-drawer"
    class="{isOpen ? 'flex' : 'hidden'} w-72 sm:w-80 max-h-60 sm:max-h-72 backdrop-blur-xs border rounded-2xl shadow-2xl p-3 flex-col pointer-events-auto overscroll-contain transition-all duration-200 {isDarkTheme ? 'bg-slate-900/95 border-white/15 text-slate-100' : 'bg-white/95 border-slate-200/90 text-slate-900'}"
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
      class="flex-1 overflow-y-auto space-y-1.5 text-xs font-medium pr-1 max-h-44 sm:max-h-56 {isDarkTheme ? 'text-slate-200' : 'text-slate-800'}"
    ></div>
  </div>

  <!-- Bottom-Left Event Log Toggle Button -->
  <button
    id="btn-hud-event-log"
    onclick={toggle}
    class="hud-pill pointer-events-auto flex items-center gap-2 text-xs font-bold shadow-md transition-all duration-150 ease-out hover:scale-[1.02] active:scale-[0.96] cursor-pointer {isOpen ? '!bg-indigo-600 !text-white !border-indigo-700 shadow-indigo-500/20' : ''}"
    title="Toggle Match Event Log"
    aria-label="Toggle Match Event Log"
    aria-expanded={isOpen}
  >
    <i class="fa-solid fa-list-ul text-xs {isOpen ? 'text-white' : 'text-indigo-600'}"></i>
    <span>Event Log</span>
  </button>
</div>
