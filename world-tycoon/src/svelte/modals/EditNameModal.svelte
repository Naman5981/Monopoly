<script>
  /**
   * svelte/modals/EditNameModal.svelte
   * Sleek luxury dialog for changing Tycoon Name.
   * Replaces native browser window.prompt with an AAA animated Svelte dialog.
   */
  import { modalStore, closeEditNameModal } from '../stores/modalStore.js';

  let state = $state({});
  let inputVal = $state('');
  let inputEl = $state(null);

  modalStore.subscribe(val => {
    state = val.editName || {};
  });

  $effect(() => {
    if (state.visible) {
      inputVal = state.currentName || '';
      // Focus after microtask / animation frame
      setTimeout(() => {
        if (inputEl) {
          inputEl.focus();
          inputEl.select();
        }
      }, 50);
    }
  });

  function onSave() {
    const trimmed = (inputVal || '').trim().slice(0, 14);
    if (trimmed) {
      window.setPlayerSetupName?.(state.playerIdx ?? 0, trimmed);
      window.dismissNameHeadsUp?.(true);
    }
    closeEditNameModal();
  }

  function onCancel() {
    closeEditNameModal();
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
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

{#if state.visible}
  <!-- ═══════════════════════════════════════════════════════════════════
       TYCOON NAME MODAL: Luxury Glassmorphic Dialog
       ═══════════════════════════════════════════════════════════════════ -->
  <div
    id="modal-edit-name"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm select-none transition-opacity duration-200"
    onclick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    onkeydown={onKeyDown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="edit-name-title"
    tabindex="-1"
  >
    <div
      class="relative w-full max-w-sm sm:max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-400/50 rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-150"
    >
      <!-- Top Decorative Glow -->
      <div class="absolute -top-10 inset-x-0 h-20 bg-amber-500/15 blur-2xl pointer-events-none rounded-full"></div>

      <!-- Header Icon Badge -->
      <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/25 border-2 border-white/60 mb-3.5">
        <i class="fa-solid fa-crown text-slate-950"></i>
      </div>

      <!-- Title & Subtitle -->
      <h2 id="edit-name-title" class="text-lg sm:text-xl font-black text-white uppercase tracking-wider drop-shadow">
        YOUR TYCOON NAME
      </h2>
      <p class="text-xs font-semibold text-slate-400 mt-1 mb-5">
        Choose your official tycoon identity for leaderboards &amp; multiplayer
      </p>

      <!-- Input Card Container -->
      <div class="w-full relative mb-5">
        <div class="relative flex items-center">
          <input
            bind:this={inputEl}
            bind:value={inputVal}
            type="text"
            maxlength="14"
            placeholder="ENTER NAME..."
            id="tycoon-name-modal-input"
            class="w-full px-4 py-3 sm:py-3.5 rounded-2xl bg-slate-800/90 border-2 border-amber-400/60 font-black text-base sm:text-lg text-amber-300 uppercase tracking-wider placeholder:text-slate-500 placeholder:normal-case placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-300 transition-all text-center"
          />
        </div>
        <div class="flex items-center justify-between px-2 mt-1.5 text-[11px] font-mono text-slate-400">
          <span>Max 14 characters</span>
          <span class="font-bold {(inputVal || '').length >= 14 ? 'text-amber-400' : 'text-slate-500'}">
            {(inputVal || '').length} / 14
          </span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="w-full flex items-center gap-3">
        <button
          type="button"
          id="btn-edit-name-cancel"
          onclick={onCancel}
          class="flex-1 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 border border-slate-700 font-black text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-95"
        >
          Cancel
        </button>
        <button
          type="button"
          id="btn-edit-name-save"
          onclick={onSave}
          class="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 border border-white/50 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
        >
          <i class="fa-solid fa-check text-xs"></i>
          <span>Save Name</span>
        </button>
      </div>
    </div>
  </div>
{/if}
