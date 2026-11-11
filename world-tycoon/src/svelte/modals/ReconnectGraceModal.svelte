<script>
  import { modalStore } from '../stores/modalStore.js';

  let state = $state({});
  modalStore.subscribe(val => { state = val.reconnectGrace || {}; });

  function onSoloTakeover() {
    if (typeof window !== 'undefined' && typeof window.convertRemotePlayersToBots === 'function') {
      window.convertRemotePlayersToBots();
    }
  }
</script>

<div
  id="modal-reconnect-grace"
  class="fixed inset-0 z-50 items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl overscroll-contain select-none text-center {state.visible ? 'flex' : 'hidden'}"
>
  <div
    class="relative w-full max-w-sm bg-slate-950/95 border border-amber-500/40 rounded-3xl p-0 text-white shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden font-ui transition-all duration-200"
    style="box-shadow: 0 25px 60px -15px rgba(0,0,0,0.9), 0 0 35px rgba(245,158,11,0.2);"
  >
    <!-- Header with Atmospheric Amber Halo -->
    <div
      class="relative p-5 text-white overflow-hidden flex flex-col items-center gap-2 shadow-md"
      style="background: radial-gradient(circle at 50% 20%, rgba(245,158,11,0.38) 0%, rgba(2,6,23,0.95) 85%); border-bottom: 1px solid rgba(245,158,11,0.35);"
    >
      <div class="w-12 h-12 rounded-2xl bg-amber-500/20 backdrop-blur-md border border-amber-400/40 flex items-center justify-center text-2xl text-amber-300 shadow-inner mb-1 animate-pulse">
        <i class="fa-solid fa-satellite-dish"></i>
      </div>
      <div class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/15 backdrop-blur-md text-[10px] font-mono font-bold uppercase tracking-widest text-amber-300 border border-amber-400/30">
        <i class="fa-solid fa-rotate fa-spin"></i>
        <span>RECONNECTING</span>
      </div>
      <h2 class="font-display font-black text-2xl text-white tracking-wide drop-shadow">
        HOST DISCONNECTED
      </h2>
    </div>

    <!-- Body Section -->
    <div class="p-5 space-y-4 bg-slate-950/70">
      <!-- Countdown Chip -->
      <div class="bg-slate-900/80 p-3 rounded-2xl border border-white/10 shadow-xs flex items-center justify-between">
        <span class="text-xs text-slate-400 font-bold">
          Room: <strong id="reconnect-room-code" class="text-white font-mono font-black">{state.roomCode || 'ROOM'}</strong>
        </span>
        <span class="text-xs text-slate-400 font-bold">
          Time left: <strong id="reconnect-timer-text" class="text-amber-400 font-mono font-black text-sm">{state.secondsRemaining ?? 30}s</strong>
        </span>
      </div>

      <p id="reconnect-status-desc" class="text-xs sm:text-sm font-semibold text-slate-300 leading-relaxed">
        {state.statusDesc || 'Host refreshed or disconnected. Attempting to re-link to room...'}
      </p>

      <!-- Actions -->
      <div class="space-y-2 pt-1">
        <button
          onclick={onSoloTakeover}
          class="game-btn game-btn-green w-full py-3 text-xs sm:text-sm font-black shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <i class="fa-solid fa-robot"></i>
          <span>Continue Solo (vs AI)</span>
        </button>
      </div>
    </div>
  </div>
</div>
