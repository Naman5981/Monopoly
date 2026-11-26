<script>
  import { modalStore } from '../stores/modalStore.js';
  import { hudStore } from '../stores/hudStore.js';

  let state = $state({});
  let hud = $state({});
  modalStore.subscribe(val => { state = val.disconnectNotice || {}; });
  hudStore.subscribe(val => { hud = val || {}; });

  const isDarkTheme = $derived(hud.lightingMode === 'Night' || hud.boardStyle === 'cyberpunk');

  function onReturnToLobby() {
    if (typeof window !== 'undefined' && typeof window.returnToLobbyFromDisconnect === 'function') {
      window.returnToLobbyFromDisconnect();
    }
  }
</script>

<div
  id="modal-disconnect-notice"
  role="alertdialog"
  aria-modal="true"
  class="fixed inset-0 z-[1000] items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overscroll-contain select-none text-center {state.visible ? 'flex' : 'hidden'}"
>
  <div class="relative w-full max-w-sm border-2 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-4 font-ui {isDarkTheme ? 'bg-slate-950/95 border-rose-500/40 text-white' : 'bg-white border-rose-200 text-slate-900'}">
    <div class="w-12 h-12 rounded-2xl border flex items-center justify-center text-xl {isDarkTheme ? 'bg-rose-500/20 border-rose-400/40 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-600'}">
      <i class="fa-solid fa-triangle-exclamation"></i>
    </div>
    <div class="space-y-1.5">
      <h2 class="font-display font-black text-xl tracking-tight {isDarkTheme ? 'text-white' : 'text-slate-900'}">
        Disconnected
      </h2>
      <p id="disconnect-notice-text" class="text-xs sm:text-sm font-semibold leading-snug {isDarkTheme ? 'text-slate-300' : 'text-slate-600'}">
        {state.message || 'Player disconnected. Returning to lobby.'}
      </p>
    </div>
    <button
      onclick={onReturnToLobby}
      class="game-btn game-btn-blue w-full py-2.5 text-xs sm:text-sm font-black flex items-center justify-center gap-2 cursor-pointer"
    >
      <i class="fa-solid fa-door-open"></i>
      <span>Return to Lobby</span>
    </button>
  </div>
</div>
