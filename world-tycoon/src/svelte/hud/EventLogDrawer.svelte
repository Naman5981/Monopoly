<script>
  /**
   * svelte/hud/EventLogDrawer.svelte
   * Declarative floating event log drawer for live match activity.
   */
  import { hudStore } from '../stores/hudStore.js';

  let visible = $state(false);

  export function toggle() {
    visible = !visible;
  }
</script>

<div
  id="event-log-drawer"
  class="{visible ? 'flex' : 'hidden'} fixed top-14 right-4 z-40 w-80 max-h-72 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl p-3.5 flex-col"
>
  <div class="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
    <span class="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
      <i class="fa-solid fa-list-ul text-indigo-600"></i> Live Event Log
    </span>
    <button
      onclick={() => (visible = false)}
      class="text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
      title="Close Event Log"
      aria-label="Close Event Log"
    >
      <i class="fa-solid fa-xmark"></i>
    </button>
  </div>
  <div id="activity-log" class="flex-1 overflow-y-auto space-y-1.5 text-xs text-slate-800 font-medium pr-1"></div>
</div>
