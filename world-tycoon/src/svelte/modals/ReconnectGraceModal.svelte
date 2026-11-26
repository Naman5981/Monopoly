<script>
  import { modalStore } from '../stores/modalStore.js';
  import { hudStore } from '../stores/hudStore.js';

  let state = $state({});
  let hud = $state({});
  modalStore.subscribe(val => { state = val.reconnectGrace || {}; });
  hudStore.subscribe(val => { hud = val || {}; });

  const isDarkTheme = $derived(hud.lightingMode === 'Night' || hud.boardStyle === 'cyberpunk');

  function onSoloTakeover() {
    if (typeof window !== 'undefined' && typeof window.convertRemotePlayersToBots === 'function') {
      window.convertRemotePlayersToBots();
    }
  }
</script>

<div
  id="modal-reconnect-grace"
  role="alertdialog"
  aria-modal="true"
  class="fixed inset-0 z-[1000] items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overscroll-contain select-none text-center {state.visible ? 'flex' : 'hidden'}"
>
  <div class="relative w-full max-w-sm border-2 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 font-ui {isDarkTheme ? 'bg-slate-950/95 border-amber-500/40 text-white' : 'bg-white border-amber-300 text-slate-900'}">
    <div class="flex flex-col items-center gap-2">
      <div class="w-12 h-12 rounded-2xl border flex items-center justify-center text-xl animate-pulse {isDarkTheme ? 'bg-amber-500/20 border-amber-400/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-600'}">
        <i class="fa-solid fa-satellite-dish"></i>
      </div>
      <h2 class="font-display font-black text-xl tracking-tight {isDarkTheme ? 'text-white' : 'text-slate-900'}">
        Host Disconnected
      </h2>
    </div>

    <!-- Countdown Chip -->
    <div class="p-3 rounded-2xl border flex items-center justify-between {isDarkTheme ? 'bg-slate-900/80 border-white/10' : 'bg-slate-50 border-slate-200'}">
      <span class="text-xs font-bold {isDarkTheme ? 'text-slate-400' : 'text-slate-600'}">
        Room: <strong id="reconnect-room-code" class="font-mono font-black {isDarkTheme ? 'text-white' : 'text-slate-900'}">{state.roomCode || 'ROOM'}</strong>
      </span>
      <span class="text-xs font-bold {isDarkTheme ? 'text-slate-400' : 'text-slate-600'}">
        Time left: <strong id="reconnect-timer-text" class="font-mono font-black text-sm {isDarkTheme ? 'text-amber-400' : 'text-amber-700'}">{state.secondsRemaining ?? 30}s</strong>
      </span>
    </div>

    <p id="reconnect-status-desc" class="text-xs sm:text-sm font-semibold leading-snug {isDarkTheme ? 'text-slate-300' : 'text-slate-600'}">
      {state.statusDesc || 'Host refreshed or disconnected. Attempting to re-link to room...'}
    </p>

    <button
      onclick={onSoloTakeover}
      class="game-btn game-btn-green w-full py-2.5 text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 cursor-pointer"
    >
      <i class="fa-solid fa-robot"></i>
      <span>Continue Solo (vs AI)</span>
    </button>
  </div>
</div>
