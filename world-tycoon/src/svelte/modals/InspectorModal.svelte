<script>
  import { modalStore } from '../stores/modalStore.js';

  let state = $state({});
  modalStore.subscribe(val => { state = val.inspector || {}; });

  function onClose() {
    window.closeInspectorModal?.();
  }

  function onUpgrade() {
    if (state.tile?.id !== undefined) {
      window.upgradeCityLevel?.(state.tile.id);
    }
  }

  function onMortgage() {
    if (state.tile?.id !== undefined) {
      window.toggleCityMortgage?.(state.tile.id);
    }
  }
</script>

<div id="modal-tile-inspector" class="fixed bottom-4 right-4 z-40 pointer-events-none flex-col items-end {state.visible ? 'flex' : 'hidden'}">
  <div id="modal-tile-inspector-card" class="pointer-events-auto game-modal-shell w-92 max-w-[calc(100vw-32px)] overflow-hidden shadow-2xl">
    <!-- Header -->
    <div id="insp-header" class="game-modal-header min-h-[144px] p-3 flex flex-col justify-between items-center text-center text-white relative overflow-hidden" style="background: {state.tile?.color || '#3b82f6'};">
      <button onclick={onClose} class="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition shadow-xs border border-white/30" title="Close tile card">
        ✕
      </button>
      <div id="insp-group" class="modal-badge-pill">TITLE DEED</div>
      <canvas id="insp-city-3d-canvas" width="220" height="110" class="w-[150px] h-[75px] -my-1 relative z-10 pointer-events-none drop-shadow-xl"></canvas>
      <h3 id="insp-title" class="modal-city-title text-xl leading-tight pb-0.5">{state.tile?.name || 'CITY'}</h3>
    </div>

    <!-- Body -->
    <div class="p-3.5 space-y-2.5 bg-gradient-to-b from-white to-slate-50/70">
      <div id="insp-owner-pill" class="text-xs sm:text-sm font-display font-black text-center py-2 px-3 rounded-2xl bg-slate-100 text-slate-800 border-2 border-slate-200/80 shadow-2xs">
        {state.ownerName ? `Owned by ${state.ownerName}` : 'Unowned'}
      </div>

      <div id="insp-rent-list" class="game-tiers-tray space-y-1">
        {#if state.rentTiers}
          {#each state.rentTiers as tier}
            <div class="game-tier-card {tier.isCurrent ? 'tier-card-current' : ''} py-1.5 px-2.5 flex items-center justify-between">
              <span class="text-xs font-bold text-slate-800">{tier.label}</span>
              <span class="text-xs font-black text-emerald-700">{tier.rent}</span>
            </div>
          {/each}
        {/if}
      </div>

      <div id="insp-actions" class="space-y-2">
        {#if state.isOwner}
          <button onclick={onUpgrade} disabled={!state.canUpgrade} class="w-full py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer {!state.canUpgrade ? 'opacity-50 cursor-not-allowed' : ''}">
            Build Upgrade (+House)
          </button>
          <button onclick={onMortgage} class="w-full py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 transition cursor-pointer">
            {state.mortgaged ? 'Unmortgage City' : 'Mortgage City (Instant Cash)'}
          </button>
        {/if}
      </div>
    </div>
  </div>
</div>
