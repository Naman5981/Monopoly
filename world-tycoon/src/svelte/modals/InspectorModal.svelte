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

  function onDowngrade() {
    if (state.tile?.id !== undefined) {
      window.downgradeCityLevel?.(state.tile.id);
    }
  }
</script>

<div
  id="modal-tile-inspector"
  class="fixed bottom-4 right-4 max-sm:bottom-4 max-sm:right-3 max-sm:left-3 max-sm:w-auto z-40 pointer-events-none flex-col items-end {state.visible ? 'flex' : 'hidden'}"
>
  <div
    id="modal-tile-inspector-card"
    class="pointer-events-auto w-80 sm:w-92 max-w-[calc(100vw-24px)] bg-slate-950/95 border border-white/15 rounded-3xl p-0 text-white shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden font-ui select-none transition-all duration-200"
    style="box-shadow: 0 20px 50px -10px rgba(0,0,0,0.8), 0 0 25px {state.groupHex ? state.groupHex + '25' : 'rgba(255,255,255,0.05)'};"
  >
    <!-- Header with Dynamic Atmospheric District Glow & 3D Preview -->
    <div
      id="insp-header"
      class="relative p-3.5 flex flex-col justify-between items-center text-center text-white overflow-hidden transition-all duration-200"
      style="background: radial-gradient(circle at 50% 25%, {state.groupHex ? state.groupHex + '35' : 'rgba(59,130,246,0.25)'} 0%, rgba(2,6,23,0.92) 85%); border-bottom: 1px solid {state.groupHex ? state.groupHex + '40' : 'rgba(255,255,255,0.1)'};"
    >
      <!-- Close Button -->
      <button
        onclick={onClose}
        aria-label="Close property inspector"
        class="absolute top-3 right-3 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/25 active:scale-90 text-white/80 hover:text-white flex items-center justify-center cursor-pointer transition border border-white/20 backdrop-blur-md shadow-xs focus-visible:ring-2 focus-visible:ring-white/50"
      >
        ✕
      </button>

      <!-- District Category Badge -->
      <div
        id="insp-group"
        class="text-[10px] sm:text-[11px] px-3 py-0.5 rounded-full font-mono font-bold tracking-widest uppercase border border-white/20 bg-white/10 text-white/90 backdrop-blur-md shadow-xs"
        style="border-color: {state.groupHex ? state.groupHex + '60' : 'rgba(255,255,255,0.2)'};"
      >
        {state.groupName || 'PROPERTY DEED'}
      </div>

      <!-- 3D Diorama Canvas Preview -->
      <canvas
        id="insp-city-3d-canvas"
        width="220"
        height="110"
        class="w-[160px] h-[80px] my-1 relative z-10 pointer-events-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
      ></canvas>

      <!-- City / Property Title -->
      <h3
        id="insp-title"
        class="font-display font-black text-xl sm:text-2xl text-white tracking-wide leading-tight drop-shadow-md text-center"
      >
        {state.cityName || 'CITY'}
      </h3>
    </div>

    <!-- Body Section -->
    <div class="p-3.5 space-y-2.5 bg-slate-950/70">
      <!-- Owner / Pricing Status Strip -->
      <div id="insp-owner-pill">
        {#if state.isOwner}
          <div class="text-xs sm:text-sm font-display font-black py-2 px-3 rounded-2xl bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 shadow-xs flex items-center justify-between">
            <span class="flex items-center gap-1.5 text-white">
              <i class="fa-solid fa-crown text-amber-400"></i>
              <span>Your Estate</span>
            </span>
            <span class="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
              {state.levelLabel}
            </span>
          </div>
        {:else if state.isOwned}
          <div class="text-xs sm:text-sm font-display font-black py-2 px-3 rounded-2xl bg-slate-900/80 text-slate-200 border border-white/10 shadow-xs flex items-center justify-between">
            <span class="flex items-center gap-2 truncate">
              <span class="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-xs" style="background-color: {state.ownerColorHex || '#f43f5e'};"></span>
              <span class="truncate">Owned by <strong class="text-white">{state.ownerName}</strong></span>
            </span>
            <span class="text-[11px] font-mono text-slate-400 shrink-0">
              {state.levelLabel}
            </span>
          </div>
        {:else if state.priceFormatted}
          <div class="text-xs sm:text-sm font-display font-black py-2 px-3 rounded-2xl bg-slate-900/80 text-slate-300 border border-white/10 shadow-xs flex items-center justify-between">
            <span class="flex items-center gap-1.5 text-slate-400">
              <i class="fa-solid fa-tag text-emerald-400"></i>
              <span>Unowned</span>
            </span>
            <span class="font-mono text-emerald-300">
              Price: <strong class="text-white font-black">{state.priceFormatted}</strong>
            </span>
          </div>
        {:else}
          <div class="text-xs font-display font-bold text-center py-2 px-3 rounded-2xl bg-slate-900/80 text-slate-300 border border-white/10 shadow-xs">
            {state.subtitle || 'Special Tile'}
          </div>
        {/if}
      </div>

      <!-- Rent Schedule List -->
      <div id="insp-rent-list" class="space-y-1">
        {#if state.rentTiers && state.rentTiers.length > 0}
          {#each state.rentTiers as tier}
            {#if tier.isCurrent}
              <div class="flex items-center justify-between py-1.5 px-2.5 rounded-xl border-2 border-emerald-400 bg-emerald-500/15 shadow-[0_0_15px_rgba(16,185,129,0.25)] text-white transition-all">
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-[10px] shadow-xs">
                    <i class="fa-solid {tier.icon}"></i>
                  </span>
                  <div class="flex items-center gap-1.5">
                    <span class="font-display font-black text-xs text-white">{tier.label}</span>
                    <span class="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-black tracking-wider shadow-xs">ACTIVE</span>
                  </div>
                </div>
                <div class="text-xs font-mono font-black text-emerald-300 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded-lg shadow-xs">
                  {tier.rent}
                </div>
              </div>
            {:else if tier.isMax}
              <div class="flex items-center justify-between py-1.5 px-2.5 rounded-xl border border-amber-500/30 bg-amber-950/20 text-amber-200/90 transition-all hover:bg-amber-950/30">
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 font-black flex items-center justify-center text-[10px]">
                    <i class="fa-solid {tier.icon}"></i>
                  </span>
                  <div class="flex items-center gap-1.5">
                    <span class="font-display font-bold text-xs text-amber-200">{tier.label}</span>
                    <span class="text-[9px] uppercase px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">MAX</span>
                  </div>
                </div>
                <div class="text-xs font-mono font-bold text-amber-300 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  {tier.rent}
                </div>
              </div>
            {:else}
              <div class="flex items-center justify-between py-1.5 px-2.5 rounded-xl border border-white/5 bg-slate-900/40 hover:bg-slate-900/70 text-slate-300 transition-colors">
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 rounded-lg bg-white/5 text-slate-400 border border-white/10 font-bold flex items-center justify-center text-[10px]">
                    {tier.badgeText}
                  </span>
                  <span class="font-display font-medium text-xs text-slate-300">{tier.label}</span>
                </div>
                <div class="text-xs font-mono font-bold text-slate-300 px-2 py-0.5">
                  {tier.rent}
                </div>
              </div>
            {/if}
          {/each}
        {/if}
      </div>

      <!-- Financial Intel (House build cost & sell refund) -->
      {#if state.houseCostFormatted}
        <div class="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1 pt-1 border-t border-white/10">
          <span>House Build Cost:</span>
          <strong class="text-slate-200 font-mono">{state.houseCostFormatted}</strong>
        </div>
      {/if}

      <!-- Interactive Actions -->
      <div id="insp-actions" class="space-y-1.5 pt-0.5">
        {#if state.isOwner}
          {#if !state.isStandingOnTile}
            <div class="py-2 px-3 rounded-xl bg-slate-900/60 border border-white/10 text-slate-400 font-bold text-xs text-center flex items-center justify-center gap-1.5 shadow-2xs">
              <i class="fa-solid fa-location-dot text-slate-500"></i>
              <span>Land here to build upgrades</span>
            </div>
          {:else if !state.isTurnActionable}
            <div class="w-full py-2 px-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 font-black text-xs text-center flex items-center justify-center gap-1.5 shadow-xs">
              <i class="fa-solid fa-lock text-amber-400"></i>
              <span>Wait for your turn to build upgrades</span>
            </div>
          {:else}
            <div class="grid grid-cols-2 gap-2">
              <button
                onclick={onUpgrade}
                disabled={!state.canUpgrade}
                class="game-btn {state.canUpgrade ? 'game-btn-green' : 'game-btn-slate opacity-50 cursor-not-allowed'} py-2 text-xs font-black flex items-center justify-center gap-1"
              >
                <i class="fa-solid fa-arrow-up"></i>
                <span>Upgrade ({state.houseCostFormatted})</span>
              </button>
              <button
                onclick={onDowngrade}
                disabled={!state.canDowngrade}
                class="game-btn {state.canDowngrade ? 'game-btn-orange' : 'game-btn-slate opacity-50 cursor-not-allowed'} py-2 text-xs font-black flex items-center justify-center gap-1"
              >
                <i class="fa-solid fa-arrow-down"></i>
                <span>Sell (+{state.downgradeRefundFormatted})</span>
              </button>
            </div>
          {/if}
        {:else if state.isOwned && state.currentRentFormatted}
          <div class="py-1.5 px-3 rounded-xl bg-slate-900/40 border border-white/5 text-slate-400 font-medium text-[11px] text-center">
            Rent payable upon landing: <strong class="text-rose-400 font-mono font-bold">{state.currentRentFormatted}</strong>
          </div>
        {:else if !state.isOwned && state.priceFormatted}
          <div class="py-1.5 px-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 font-medium text-[11px] text-center">
            Land here to purchase for <strong class="text-white font-mono font-bold">{state.priceFormatted}</strong>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
