<script>
  import { modalStore } from '../stores/modalStore.js';
  import ActionChipShell from '../components/ActionChipShell.svelte';

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

<ActionChipShell modalId="modal-upgrade-city" cardId="modal-upgrade-city-card" visible={state.visible} borderColor="border-emerald-500/80">
  <!-- Top Summary Line -->
  <div class="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
    <div class="flex items-center gap-2 truncate">
      <span class="w-3.5 h-3.5 rounded-full border border-white/40 shrink-0" style="background-color: {state.colorHex || '#10b981'};"></span>
      <h3 id="upgrade-modal-name" class="font-display font-black text-sm sm:text-base tracking-wide text-white truncate">
        {state.cityName || 'CITY'}
      </h3>
      <span id="upgrade-modal-level-pill" class="text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shrink-0">
        {state.levelLabel || 'Lvl 1'}
      </span>
    </div>
    <div class="flex items-center gap-1.5 text-xs font-black text-right shrink-0">
      <span class="text-slate-400 hidden sm:inline">Rent:</span>
      <span id="upgrade-modal-current-rent" class="text-slate-400 line-through text-[11px]">{state.currentRentFormatted || '$0'}</span>
      <span class="text-emerald-400">→</span>
      <span id="upgrade-modal-next-rent" class="text-emerald-300 font-extrabold">{state.nextRentFormatted || '$0'}</span>
    </div>
  </div>

  <!-- Hidden compatibility elements for tests & controllers -->
  <span id="upgrade-modal-cost" class="hidden">{state.costOneFormatted || '$0'}</span>
  <span id="upgrade-modal-player-cash" class="hidden">{state.playerCashFormatted || '$0'}</span>

  <!-- Action Buttons Row -->
  <div class="flex items-center gap-2 pt-0.5">
    <button id="btn-confirm-upgrade" onclick={onConfirmUpgrade} disabled={!state.canUpgrade} class="game-btn game-btn-green flex-1 py-2.5 px-3 text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-md {!state.canUpgrade ? 'opacity-50 cursor-not-allowed' : ''}">
      <i class="fa-solid fa-arrow-up-right-dots"></i>
      <span>UPGRADE +1</span>
      <span class="text-xs font-bold opacity-90">({state.costOneFormatted || '$0'})</span>
    </button>

    {#if state.canUpgradeTwo}
      <button id="btn-confirm-upgrade-2" onclick={onConfirmUpgradeTwo} class="game-btn game-btn-blue flex-1 py-2.5 px-3 text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-md">
        <i class="fa-solid fa-angles-up"></i>
        <span>+2 LEVELS</span>
        <span class="text-xs font-bold opacity-90">({state.costTwoFormatted || '$0'})</span>
      </button>
    {/if}

    <button id="btn-close-upgrade-modal" onclick={onClose} class="game-btn game-btn-slate py-2.5 px-4 text-xs font-black shrink-0">
      PASS ✕
    </button>
  </div>
</ActionChipShell>
