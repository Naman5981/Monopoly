<script>
  import { modalStore } from '../stores/modalStore.js';

  let state = $state({});
  modalStore.subscribe(val => { state = val.confirmExitLobby || {}; });

  function onCancel() {
    if (typeof window !== 'undefined' && typeof window.closeConfirmExitLobbyModal === 'function') {
      window.closeConfirmExitLobbyModal();
    }
  }

  function onConfirm() {
    if (typeof window !== 'undefined' && typeof window.confirmExitToLobbyAction === 'function') {
      window.confirmExitToLobbyAction();
    }
  }

  function onBackdropClick(e) {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  id="modal-confirm-exit-lobby"
  onclick={onBackdropClick}
  class="fixed inset-0 z-[1000] items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl overscroll-contain overflow-y-auto select-none text-center {state.visible ? 'flex' : 'hidden'}"
>
  <div
    class="relative w-full max-w-sm bg-slate-950/95 border border-rose-500/40 rounded-3xl p-0 text-white shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden font-ui pointer-events-auto my-auto transition-all duration-200"
    style="box-shadow: 0 25px 60px -15px rgba(0,0,0,0.9), 0 0 35px rgba(244,63,94,0.2);"
  >
    <!-- Header with Atmospheric Rose Halo -->
    <div
      class="relative p-5 text-white overflow-hidden flex flex-col items-center gap-2 shadow-md"
      style="background: radial-gradient(circle at 50% 20%, rgba(244,63,94,0.38) 0%, rgba(2,6,23,0.95) 85%); border-bottom: 1px solid rgba(244,63,94,0.35);"
    >
      <div class="w-12 h-12 rounded-2xl bg-rose-500/20 backdrop-blur-md border border-rose-400/40 flex items-center justify-center text-2xl text-rose-300 shadow-inner mb-1">
        <i class="fa-solid fa-door-open"></i>
      </div>
      <div class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-500/15 backdrop-blur-md text-[10px] font-mono font-bold uppercase tracking-widest text-rose-300 border border-rose-400/30">
        <i class="fa-solid fa-arrow-right-from-bracket"></i>
        <span>QUIT MATCH</span>
      </div>
      <h2 id="confirm-exit-lobby-title" class="font-display font-black text-2xl text-white tracking-wide drop-shadow">
        {state.title || 'EXIT TO LOBBY?'}
      </h2>
    </div>

    <!-- Body Section -->
    <div class="p-5 space-y-4 bg-slate-950/70">
      <p id="confirm-exit-lobby-desc" class="text-xs sm:text-sm font-semibold text-slate-300 leading-relaxed">
        {state.description || 'End current game session and return to lobby? Unsaved progress will be lost.'}
      </p>

      <div class="flex gap-2.5 pt-1">
        <button
          type="button"
          onclick={onCancel}
          class="game-btn game-btn-slate flex-1 py-3 text-xs sm:text-sm font-black cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onclick={onConfirm}
          class="game-btn game-btn-red flex-1 py-3 text-xs sm:text-sm font-black shadow-lg shadow-rose-950/50 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <i class="fa-solid fa-door-open"></i>
          <span>End Game</span>
        </button>
      </div>
    </div>
  </div>
</div>
