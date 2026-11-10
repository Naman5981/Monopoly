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
      <!-- 2 Stat Tiles: Current Rent and Upgrade Cost -->
      <div class="grid grid-cols-2 gap-3">
        <div class="game-stat-card stat-card-emerald">
          <span class="stat-card-badge">
            <i class="fa-solid fa-coins text-emerald-500"></i> CURRENT RENT
          </span>
          <div id="upgrade-modal-current-rent" class="stat-card-value text-emerald-950">{state.currentRentFormatted || '180K'}</div>
        </div>
        <div class="game-stat-card stat-card-sky">
          <span class="stat-card-badge">
            <i class="fa-solid fa-arrow-up text-sky-500"></i> UPGRADE COST
          </span>
          <div id="upgrade-modal-cost" class="stat-card-value text-sky-950">{state.upgradeCostFormatted || '200K'}</div>
        </div>
      </div>

      <!-- Rent Tiers Breakdown with active tier marked -->
      <div class="game-tiers-tray">
        <div class="tiers-tray-header">
          <span class="flex items-center gap-1.5 font-display font-black text-[11px] uppercase tracking-wider text-slate-500">
            <i class="fa-solid fa-layer-group text-emerald-500"></i> Estate Rent Hierarchy
          </span>
          <span id="upgrade-modal-balance" class="font-display font-bold text-[11px] text-slate-500 bg-white/80 px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-2xs">{state.balanceFormatted || 'Balance: 1.2M'}</span>
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

      <!-- Status Notice if applicable (e.g. Limit Reached or Max Level) -->
      <div id="upgrade-modal-notice" class="{state.noticeText ? '' : 'hidden'} text-xs sm:text-sm font-black text-center py-2.5 px-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-xs text-amber-950">
        {state.noticeText || ''}
      </div>

      <!-- Action Buttons -->
      <div class="space-y-2 pt-1">
        <div class="flex gap-2.5">
          <button id="btn-confirm-upgrade" onclick={onConfirmUpgrade} disabled={!state.canUpgrade} class="game-btn game-btn-green flex-1 py-3.5 px-3 text-xs sm:text-sm font-black flex flex-col items-center justify-center gap-0.5 leading-snug {!state.canUpgrade ? 'opacity-50 cursor-not-allowed' : ''}">
            <span class="flex items-center justify-center gap-1.5"><i class="fa-solid fa-arrow-up-right-dots"></i> +1 LEVEL</span>
            <span class="text-xs font-bold opacity-90">({state.costOneFormatted || '160K'})</span>
          </button>
          <button id="btn-confirm-upgrade-2" onclick={onConfirmUpgradeTwo} disabled={!state.canUpgradeTwo} class="game-btn game-btn-blue flex-1 py-3.5 px-3 text-xs sm:text-sm font-black flex flex-col items-center justify-center gap-0.5 leading-snug {state.canUpgradeTwo ? '' : 'hidden'}">
            <span class="flex items-center justify-center gap-1.5"><i class="fa-solid fa-angles-up"></i> +2 LEVELS</span>
            <span class="text-xs font-bold opacity-90">({state.costTwoFormatted || '320K'})</span>
          </button>
        </div>
        <button id="btn-close-upgrade-modal" onclick={onClose} class="game-btn game-btn-slate w-full py-3.5 text-xs sm:text-sm font-black">
          CONTINUE
        </button>
      </div>
    </div>
  </div>
</div>
