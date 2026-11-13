<script>
  import { modalStore } from '../stores/modalStore.js';

  let state = $state({});
  modalStore.subscribe(val => { state = val.updateAlert || {}; });

  function onClose() {
    if (typeof window !== 'undefined' && typeof window.closeUpdateAlertModal === 'function') {
      window.closeUpdateAlertModal();
    }
  }

  function onBackdropClick(e) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  id="modal-update-alert"
  role="alertdialog"
  aria-modal="true"
  aria-labelledby="update-modal-title"
  aria-describedby="update-modal-desc"
  onclick={onBackdropClick}
  class="fixed inset-0 z-50 items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl overscroll-contain select-none {state.visible ? 'flex' : 'hidden'}"
>
  <div
    id="modal-update-card"
    class="relative w-full max-w-sm bg-slate-950/95 border border-emerald-500/40 rounded-3xl p-0 text-white shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden font-ui transition-all duration-200"
    style="box-shadow: 0 25px 60px -15px rgba(0,0,0,0.9), 0 0 35px rgba(16,185,129,0.25);"
  >
    <!-- Header with Dynamic Atmospheric Emerald Halo -->
    <div
      class="relative p-5 text-white overflow-hidden flex items-center gap-3.5 shadow-md"
      style="background: radial-gradient(circle at 50% 20%, rgba(16,185,129,0.38) 0%, rgba(2,6,23,0.95) 85%); border-bottom: 1px solid rgba(16,185,129,0.35);"
    >
      <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 backdrop-blur-md border border-emerald-400/40 flex items-center justify-center text-2xl text-emerald-300 shadow-inner shrink-0">
        <i class="fa-solid fa-bolt"></i>
      </div>
      <div class="relative z-10 flex-1">
        <div class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/15 backdrop-blur-md text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-300 shadow-xs mb-1 border border-emerald-400/30">
          <i class="fa-solid fa-sparkles text-emerald-400"></i>
          <span>NEW UPDATE READY</span>
        </div>
        <h2 id="update-modal-title" class="font-display font-black text-xl text-white tracking-wide drop-shadow">
          UPDATE AVAILABLE
        </h2>
        <p class="text-xs font-semibold text-emerald-200/90 drop-shadow mt-0.5">
          A newer version is ready on GitHub
        </p>
      </div>
      <button
        onclick={onClose}
        class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/80 hover:text-white flex items-center justify-center cursor-pointer transition border border-white/20 shrink-0 shadow-xs"
        title="Close alert [Esc]"
        aria-label="Close update alert"
      >
        <i class="fa-solid fa-xmark text-sm"></i>
      </button>
    </div>

    <!-- Body -->
    <div class="p-5 space-y-4 bg-slate-950/70">
      <!-- Version Comparison Pill -->
      <div class="bg-slate-900/80 p-3.5 rounded-2xl border border-white/10 shadow-xs flex items-center justify-between gap-2">
        <div class="flex flex-col">
          <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Your Version</span>
          <span id="update-client-version" class="font-mono font-black text-sm text-slate-200">{state.clientVersion || 'v2.0.0'}</span>
        </div>
        <div class="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 shadow-xs">
          <i class="fa-solid fa-arrow-right text-xs"></i>
        </div>
        <div class="flex flex-col items-end">
          <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">Latest Release</span>
          <span id="update-remote-version" class="font-mono font-black text-sm text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-400/40">
            {state.remoteVersion || 'v1.0.9'}
          </span>
        </div>
      </div>

      <p id="update-modal-desc" class="text-xs sm:text-sm font-semibold text-slate-300 leading-relaxed">
        A newer version of <strong class="text-white">World Tycoon: Global Edition</strong> is available on GitHub. Update to enjoy the latest features, multiplayer enhancements, and performance fixes.
      </p>

      <div class="space-y-2 pt-1">
        <a
          id="btn-update-download"
          href={state.downloadUrl || 'https://github.com/Naman5981/Monopoly/releases/latest'}
          target="_blank"
          rel="noopener noreferrer"
          class="game-btn game-btn-green w-full py-3 text-xs sm:text-sm font-black shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <i class="fa-solid fa-cloud-arrow-down text-sm"></i>
          <span>Download Update on GitHub</span>
          <i class="fa-solid fa-arrow-up-right-from-square text-xs opacity-75"></i>
        </a>
        <button
          id="btn-update-dismiss"
          onclick={onClose}
          class="w-full py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer transition-colors active:scale-95"
          aria-label="Dismiss update alert"
        >
          Remind Me Later
        </button>
      </div>
    </div>
  </div>
</div>
