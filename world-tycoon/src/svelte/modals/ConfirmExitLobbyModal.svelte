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

  function handleWindowKeydown(e) {
    if (!state.visible) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  id="modal-confirm-exit-lobby"
  role="dialog"
  aria-modal="true"
  aria-labelledby="confirm-exit-lobby-title"
  onclick={onBackdropClick}
  class="fixed inset-0 z-[1000] items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overscroll-contain overflow-y-auto select-none text-center {state.visible ? 'flex' : 'hidden'}"
>
  <div class="relative w-full max-w-sm bg-white border-2 border-slate-200 rounded-3xl p-6 text-slate-900 shadow-2xl flex flex-col items-center gap-4 font-ui pointer-events-auto my-auto">
    <div class="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-lg text-rose-600">
      <i class="fa-solid fa-door-open"></i>
    </div>

    <div class="space-y-1.5">
      <h2 id="confirm-exit-lobby-title" class="font-display font-black text-xl text-slate-900 tracking-tight">
        {state.title || 'Exit to Lobby?'}
      </h2>
      <p id="confirm-exit-lobby-desc" class="text-xs sm:text-sm font-semibold text-slate-600 leading-snug">
        {state.description || 'Current match progress will be lost.'}
      </p>
    </div>

    <div class="flex gap-2.5 w-full pt-1">
      <button
        type="button"
        onclick={onCancel}
        class="game-btn game-btn-slate flex-1 py-2.5 text-xs sm:text-sm font-black cursor-pointer"
      >
        Keep Playing
      </button>
      <button
        type="button"
        onclick={onConfirm}
        class="game-btn game-btn-red flex-1 py-2.5 text-xs sm:text-sm font-black cursor-pointer"
      >
        Exit Match
      </button>
    </div>
  </div>
</div>
