<script>
  import { modalStore } from '../stores/modalStore.js';
  import { hudStore } from '../stores/hudStore.js';
  import ActionChipShell from '../components/ActionChipShell.svelte';

  let state = $state({});
  let hud = $state({});
  modalStore.subscribe(val => { state = val.upgradeCity || {}; });
  hudStore.subscribe(val => { hud = val || {}; });

  const isDarkTheme = $derived(hud.lightingMode === 'Night' || hud.boardStyle === 'cyberpunk');

  function onConfirmUpgrade() {
    window.confirmUpgradeFromModal?.();
  }

  function onConfirmUpgradeTwo() {
    window.confirmUpgradeTwoLevelsFromModal?.();
  }

  function onClose() {
    window.closeUpgradeCityModal?.();
  }

  function handleWindowKeydown(e) {
    if (!state.visible) return;
    if (e.target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable)) return;
    if (e.key === 'Enter') {
      if (state.canUpgrade) {
        e.preventDefault();
        onConfirmUpgrade();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<ActionChipShell modalId="modal-upgrade-city" cardId="modal-upgrade-city-card" visible={state.visible} themeAware={true}>
  <!-- Top Summary Line -->
  <div class="flex items-center justify-between gap-3 border-b pb-2 {isDarkTheme ? 'border-white/10' : 'border-slate-100'}">
    <!-- City Identity & Level -->
    <div class="flex items-center gap-2 truncate min-w-0">
      <span class="w-3.5 h-3.5 rounded-full shrink-0" style="background-color: {state.colorHex || '#10b981'};"></span>
      <h3 id="upgrade-modal-name" class="font-display font-black text-sm sm:text-base tracking-wide truncate {isDarkTheme ? 'text-white' : 'text-slate-900'}">
        {state.cityName || 'CITY'}
      </h3>
      {#if state.isAlly}
        <span id="upgrade-modal-ally-badge" class="text-xs font-black px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 border {isDarkTheme ? 'bg-blue-500/20 text-blue-300 border-blue-400/40' : 'bg-blue-50 text-blue-800 border-blue-200'}">
          <i class="fa-solid fa-handshake text-[10px]" aria-hidden="true"></i>
          <span>{state.ownerName || 'Ally'}'s City</span>
        </span>
      {/if}
      <span id="upgrade-modal-level-pill" class="text-xs font-black px-2 py-0.5 rounded-full shrink-0 border {isDarkTheme ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}">
        {state.levelLabel || 'Lvl 1'}
      </span>
    </div>

    <!-- High-Contrast Rent Progression Capsule -->
    <div class="flex items-center gap-2 rounded-xl px-2.5 sm:px-3 py-1 shrink-0 border {isDarkTheme ? 'bg-emerald-950/80 border-emerald-400/60' : 'bg-emerald-50 border-emerald-200'}">
      <div class="flex flex-col items-end leading-none">
        <span class="text-xs font-black uppercase tracking-wider {isDarkTheme ? 'text-emerald-400' : 'text-emerald-700'}">New Rent</span>
        <div class="flex items-center gap-1.5 mt-0.5">
          <span id="upgrade-modal-current-rent" class="line-through text-xs font-bold tabular-nums {isDarkTheme ? 'text-slate-400' : 'text-slate-500'}">
            {state.currentRentFormatted || '$0'}
          </span>
          <span class="text-xs font-black {isDarkTheme ? 'text-emerald-400' : 'text-emerald-600'}">→</span>
          <span id="upgrade-modal-next-rent" class="font-black text-base sm:text-lg tabular-nums {isDarkTheme ? 'text-emerald-300' : 'text-emerald-700'}">
            {state.nextRentFormatted || '$0'}
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- Hidden compatibility cost + visible player cash -->
  <span id="upgrade-modal-cost" class="hidden">{state.costOneFormatted || '$0'}</span>
  <div class="flex items-center justify-between text-[11px] font-bold px-1 {isDarkTheme ? 'text-slate-300' : 'text-slate-600'}">
    <span class="uppercase tracking-wider">Available Cash</span>
    <span id="upgrade-modal-player-cash" class="font-mono font-black tabular-nums {isDarkTheme ? 'text-emerald-300' : 'text-emerald-700'}">{state.playerCashFormatted || '$0'}</span>
  </div>

  <!-- Action Buttons Row -->
  <div class="flex items-center gap-2 pt-0.5">
    <button id="btn-confirm-upgrade" onclick={onConfirmUpgrade} disabled={!state.canUpgrade} class="game-btn game-btn-green flex-1 py-2.5 px-3 text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-[transform,filter] duration-150 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:hover:brightness-100 disabled:hover:translate-y-0 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none {!state.canUpgrade ? 'opacity-50 cursor-not-allowed' : ''}">
      <i class="fa-solid fa-arrow-up-right-dots"></i>
      <span>{state.isAlly ? 'UPGRADE ALLY +1' : 'UPGRADE +1'}</span>
      <span class="text-xs font-bold opacity-90 tabular-nums">({state.costOneFormatted || '$0'})</span>
    </button>

    {#if state.canUpgradeTwo}
      <button id="btn-confirm-upgrade-2" onclick={onConfirmUpgradeTwo} class="game-btn game-btn-blue flex-1 py-2.5 px-3 text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-[transform,filter] duration-150 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none">
        <i class="fa-solid fa-angles-up"></i>
        <span>{state.isAlly ? 'ALLY +2 LEVELS' : '+2 LEVELS'}</span>
        <span class="text-xs font-bold opacity-90 tabular-nums">({state.costTwoFormatted || '$0'})</span>
      </button>
    {/if}

    <button id="btn-close-upgrade-modal" onclick={onClose} class="game-btn game-btn-slate py-2.5 px-4 text-xs font-black shrink-0 cursor-pointer transition-[transform,filter] duration-150 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none">
      PASS ✕
    </button>
  </div>
</ActionChipShell>
