<script>
  import { modalStore } from '../stores/modalStore.js';

  let state = $state({});
  modalStore.subscribe(val => { state = val.upgradeCity || {}; });

  function onConfirmUpgrade() {
    window.confirmUpgradeFromModal?.();
  }

  function onConfirmUpgradeTwo() {
    window.confirmUpgradeTwoLevelsFromModal?.();
  }

  function onClose() {
    window.closeUpgradeCityModal?.();
  }
</script>

<div id="modal-upgrade-city" class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 items-center justify-center p-4 overscroll-contain {state.visible ? 'flex' : 'hidden'}">
  <div id="modal-upgrade-city-card" class="game-modal-shell modal-shell-emerald max-w-md w-full">
    <!-- Header with group color banner, country/status pill, 3D rotating model canvas, and city name -->
    <div id="upgrade-modal-header" class="game-modal-header h-36 p-4 flex flex-col justify-between items-center text-center text-white relative shadow-md" style="background: {state.colorHex || '#10b981'};">
      <!-- Floating Watermark Icons -->
      <svg class="ui-watermark absolute -right-2 -top-2 w-20 h-20 text-white opacity-15" aria-hidden="true"><use href="#icon-city"></use></svg>
      <svg class="ui-watermark absolute -left-2 -bottom-2 w-20 h-20 text-white opacity-15" aria-hidden="true"><use href="#icon-sparkle"></use></svg>

      <div class="relative z-10 flex items-center gap-2">
        <span id="upgrade-modal-country" class="modal-badge-pill">
          <i class="fa-solid fa-crown text-amber-300"></i> {state.countryName || 'YOUR ESTATE'}
        </span>
        <span id="upgrade-modal-level-pill" class="text-xs font-black px-3 py-1 rounded-full bg-white/25 border border-white/40 shadow-xs">
          {state.levelLabel || 'Level 1'}
        </span>
      </div>
      <canvas id="upgrade-city-3d-canvas" width="220" height="110" class="w-[180px] h-[90px] -my-2 relative z-10 pointer-events-none drop-shadow-xl"></canvas>
      <h3 id="upgrade-modal-name" class="modal-city-title">{state.cityName || 'TOKYO'}</h3>
    </div>

    <div class="p-5 space-y-3.5 bg-gradient-to-b from-white to-slate-50/70">
      <!-- High-Visibility Player Treasury & Upgrade Cost Card (/better-layout) -->
      <div class="p-3.5 bg-slate-900 rounded-2xl border-2 border-slate-700/80 shadow-md flex items-center justify-between text-white">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl bg-emerald-500/20 border-2 border-emerald-400/50 flex items-center justify-center text-xl text-emerald-300 shadow-inner shrink-0">
            <i class="fa-solid fa-wallet"></i>
          </div>
          <div>
            <div class="text-[10px] font-black uppercase text-slate-400 tracking-wider">YOUR TREASURY</div>
            <div id="upgrade-modal-player-cash" class="text-base sm:text-lg font-black text-emerald-300 tracking-tight">
              {state.playerCashFormatted || '$0'}
            </div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-[10px] font-black uppercase text-slate-400 tracking-wider">UPGRADE COST</div>
          <div id="upgrade-modal-cost" class="text-base sm:text-lg font-black text-amber-300 tracking-tight">
            {state.costOneFormatted || '$0'}
          </div>
        </div>
      </div>

      <!-- Rent Progression: Current vs Upgraded Rent -->
      <div class="grid grid-cols-2 gap-3">
        <div class="game-stat-card stat-card-slate">
          <span class="stat-card-badge">
            <i class="fa-solid fa-coins text-slate-400"></i> CURRENT RENT
          </span>
          <div id="upgrade-modal-current-rent" class="stat-card-value text-slate-800">{state.currentRentFormatted || '$0'}</div>
        </div>
        <div class="game-stat-card stat-card-emerald">
          <span class="stat-card-badge">
            <i class="fa-solid fa-arrow-trend-up text-emerald-500"></i> UPGRADED RENT
          </span>
          <div id="upgrade-modal-next-rent" class="stat-card-value text-emerald-700">{state.nextRentFormatted || '$0'}</div>
        </div>
      </div>

      <!-- Rent Tiers Breakdown with active tier marked -->
      <div class="game-tiers-tray">
        <div class="tiers-tray-header">
          <span class="flex items-center gap-1.5 font-display font-black text-[11px] uppercase tracking-wider text-slate-500">
            <i class="fa-solid fa-layer-group text-emerald-500"></i> Estate Rent Hierarchy
          </span>
          <span id="upgrade-modal-balance-remain" class="font-display font-bold text-[11px] text-slate-600 bg-white/90 px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
            After: {state.remainingCashFormatted || '$0'}
          </span>
        </div>
        <div id="upgrade-modal-tiers" class="space-y-1.5 pt-0.5">
          {#if state.tiers && state.tiers.length > 0}
            {#each state.tiers as tier}
              <div class="game-tier-card {tier.isCurrent ? 'tier-card-current' : (tier.isSkyscraper ? 'tier-card-skyscraper' : '')} py-1.5 px-2.5 flex items-center justify-between">
                <span class="font-display font-bold text-xs text-slate-800">{tier.label}</span>
                <span class="tier-val-pill text-xs py-1 px-2.5 font-black">{tier.rent}</span>
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <!-- Decisive Action Buttons -->
      <div class="space-y-2 pt-1">
        <div class="flex gap-2.5">
          <button id="btn-confirm-upgrade" onclick={onConfirmUpgrade} disabled={!state.canUpgrade} class="game-btn game-btn-green flex-1 py-3.5 px-3 text-xs sm:text-sm font-black flex flex-col items-center justify-center gap-0.5 leading-snug {!state.canUpgrade ? 'opacity-50 cursor-not-allowed' : ''}">
            <span class="flex items-center justify-center gap-1.5"><i class="fa-solid fa-arrow-up-right-dots"></i> UPGRADE +1 LEVEL</span>
            <span class="text-xs font-bold opacity-90">({state.costOneFormatted || '$0'})</span>
          </button>
          {#if state.canUpgradeTwo}
            <button id="btn-confirm-upgrade-2" onclick={onConfirmUpgradeTwo} class="game-btn game-btn-blue flex-1 py-3.5 px-3 text-xs sm:text-sm font-black flex flex-col items-center justify-center gap-0.5 leading-snug">
              <span class="flex items-center justify-center gap-1.5"><i class="fa-solid fa-angles-up"></i> +2 LEVELS</span>
              <span class="text-xs font-bold opacity-90">({state.costTwoFormatted || '$0'})</span>
            </button>
          {/if}
        </div>
        <button id="btn-close-upgrade-modal" onclick={onClose} class="game-btn game-btn-slate w-full py-3.5 text-xs sm:text-sm font-black">
          PASS / KEEP CURRENT LEVEL
        </button>
      </div>
    </div>
  </div>
</div>
