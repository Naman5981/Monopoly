<script>
  import { modalStore } from '../stores/modalStore.js';
  import { hudStore } from '../stores/hudStore.js';

  let state = $state({});
  let hud = $state({});
  modalStore.subscribe(val => { state = val.festivalBoost || {}; });
  hudStore.subscribe(val => { hud = val || {}; });

  const isDarkTheme = $derived(hud.lightingMode === 'Night' || hud.boardStyle === 'cyberpunk');

  function onClose() {
    window.closeFestivalBoostModal?.();
  }

  function onSelectCity(id) {
    window.chooseFestivalBoostCity?.(id);
  }

  function onCloseNoProps() {
    window.closeFestivalNoPropertiesModal?.();
  }

  function handleWindowKeydown(e) {
    if (e.key !== 'Escape') return;
    if (state.visible) {
      e.preventDefault();
      onClose();
    } else if (state.noPropertiesVisible) {
      e.preventDefault();
      onCloseNoProps();
    }
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<!-- 1. World Festival City Selection Modal -->
<div id="modal-festival-boost" class="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 items-center justify-center p-4 overscroll-contain {state.visible ? 'flex' : 'hidden'}">
  <div id="modal-festival-boost-card" class="game-modal-shell modal-shell-emerald max-w-lg w-full flex flex-col overflow-hidden shadow-2xl max-h-[90vh]">
    <!-- Header -->
    <div class="game-modal-header h-28 p-3 flex flex-col justify-between items-center text-center text-white relative shadow-md shrink-0 bg-gradient-to-r from-emerald-600 to-teal-700">
      <span class="modal-badge-pill bg-black/25 border border-white/30 text-emerald-100 flex items-center gap-1.5">
        WORLD FESTIVAL CELEBRATION
      </span>
      <h3 class="modal-city-title text-xl sm:text-2xl tracking-wide font-black drop-shadow-sm">HOST THE FESTIVAL</h3>
      <span class="text-[11px] font-black uppercase text-emerald-100 tracking-wider">Select a city to receive the exclusive 2× World Festival Rent Boost!</span>
      <button onclick={onClose} class="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white flex items-center justify-center cursor-pointer transition-colors z-10" title="Close">
        ✕
      </button>
    </div>

    <!-- Player context strip -->
    <div class="px-5 py-2.5 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between text-xs shrink-0">
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span class="font-extrabold text-slate-700">Host:</span>
        <span id="festival-boost-player-name" class="font-black text-emerald-950">{state.playerName || 'Player'}</span>
      </div>
      <span id="festival-boost-count" class="px-2.5 py-0.5 rounded-full bg-white text-emerald-800 font-black text-xs border border-emerald-200 shadow-2xs">
        {state.ownedProperties?.length || 0} Properties Owned
      </span>
    </div>

    <!-- Properties list / Grid -->
    <div id="festival-boost-grid" class="p-4 sm:p-5 overflow-y-auto space-y-3 max-h-[50vh] {isDarkTheme ? 'bg-slate-950/95' : 'bg-gradient-to-b from-white to-slate-50/70'}">
      {#each state.ownedProperties || [] as prop}
        <div onclick={() => onSelectCity(prop.id)} class="p-3 rounded-2xl border-2 cursor-pointer transition-all duration-150 hover:brightness-105 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-between shadow-2xs {isDarkTheme ? 'border-emerald-500/40 bg-slate-900 text-white hover:bg-emerald-950/40' : 'border-emerald-200 bg-white text-slate-800 hover:bg-emerald-50'}">
          <div class="flex items-center gap-2.5">
            <span class="w-4 h-4 rounded-full border border-black/20" style="background-color: {prop.color};"></span>
            <div>
              <div class="font-black text-sm {isDarkTheme ? 'text-white' : 'text-slate-800'}">{prop.name}</div>
              <div class="text-xs font-bold {isDarkTheme ? 'text-slate-400' : 'text-slate-500'}">Tier: {prop.level || 0}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-xs font-black {isDarkTheme ? 'text-emerald-400' : 'text-emerald-600'}">Rent: {prop.rentFormatted}</div>
            <div class="text-xs font-bold {isDarkTheme ? 'text-amber-400' : 'text-amber-600'}">Boosts to 2×!</div>
          </div>
        </div>
      {/each}
    </div>

    <div class="p-3 border-t flex items-center justify-between gap-2 shrink-0 {isDarkTheme ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-100'}">
      <button onclick={onClose} class="w-full py-2.5 rounded-xl text-xs font-black text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-150 hover:brightness-105 hover:-translate-y-0.5 active:translate-y-0">
        Or Click Directly on the 3D Board
      </button>
    </div>
  </div>
</div>

<!-- 2. World Festival No Properties Alert Modal -->
<div id="modal-festival-no-properties" role="alertdialog" aria-modal="true" class="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 items-center justify-center p-4 overscroll-contain {state.noPropertiesVisible ? 'flex' : 'hidden'}">
  <div id="modal-festival-no-properties-card" class="game-modal-shell modal-shell-amber relative w-full max-w-sm overflow-hidden flex flex-col shadow-2xl border-4 !border-amber-400" tabindex="-1">
    <div class="game-modal-header bg-gradient-to-r from-amber-500 to-amber-700 p-5 text-white relative overflow-hidden flex items-center gap-3.5 shadow-md">
      <div class="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs border border-white/30 flex items-center justify-center text-xl shadow-inner text-white relative z-10 shrink-0">
        <i class="fa-solid fa-masks-theater text-white" aria-hidden="true"></i>
      </div>
      <div class="relative z-10 flex-1">
        <div class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/20 backdrop-blur-xs text-xs font-black uppercase tracking-widest text-amber-100 shadow-xs mb-1 border border-white/20">
          WORLD FESTIVAL
        </div>
        <h2 id="festival-no-props-title" class="font-rounded font-black text-xl text-white tracking-wide drop-shadow">NO PROPERTIES OWNED</h2>
        <p class="text-xs font-bold text-amber-100 drop-shadow mt-0.5">Cannot increase rent yet</p>
      </div>
    </div>

    <div class="p-5 space-y-4 {isDarkTheme ? 'bg-slate-950/95' : 'bg-gradient-to-b from-white to-slate-50/70'}">
      <div class="border-2 rounded-2xl p-3.5 flex items-start gap-3 shadow-xs {isDarkTheme ? 'bg-amber-950/40 border-amber-500/40' : 'bg-amber-50/90 border-amber-200/90'}">
        <p id="festival-no-props-desc" class="text-xs font-bold leading-relaxed {isDarkTheme ? 'text-amber-100' : 'text-amber-950'}">
          You visited the <strong class="{isDarkTheme ? 'text-amber-300' : 'text-amber-900'}">World Festival</strong>! However, you currently do not own any cities or resorts to host the festival and receive a <strong class="{isDarkTheme ? 'text-emerald-300' : 'text-emerald-700'}">2× Rent Boost</strong>.
        </p>
      </div>

      <button id="btn-festival-no-props-ok" onclick={onCloseNoProps} class="game-btn game-btn-blue w-full py-3 text-xs sm:text-sm font-black shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]">
        <span>Continue Turn</span>
      </button>
    </div>
  </div>
</div>
