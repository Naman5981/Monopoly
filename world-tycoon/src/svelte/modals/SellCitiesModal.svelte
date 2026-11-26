<script>
  import { modalStore } from '../stores/modalStore.js';
  import { hudStore } from '../stores/hudStore.js';

  let state = $state({});
  let hud = $state({});
  modalStore.subscribe(val => { state = val.sellCities || {}; });
  hudStore.subscribe(val => { hud = val || {}; });

  const isDarkTheme = $derived(hud.lightingMode === 'Night' || hud.boardStyle === 'cyberpunk');

  function onAutoSell() {
    window.autoSellCheapestForRent?.();
  }

  function onSell(id) {
    window.sellPropertyForRent?.(id);
  }
</script>

<!-- Spatial Non-Blocking Bottom Liquidation Dock (/anti-ui-slop /better-interface) -->
<div
  id="modal-sell-cities"
  class="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-[1050] w-full max-w-xl px-3 sm:px-4 pointer-events-none items-end justify-center {state.visible ? 'flex' : 'hidden'}"
>
  <div
    id="modal-sell-cities-card"
    class="w-full backdrop-blur-xs border-2 rounded-3xl shadow-2xl flex flex-col max-h-[64vh] sm:max-h-[58vh] select-none font-ui pointer-events-auto overflow-hidden {isDarkTheme ? 'bg-slate-950/92 border-rose-500/80 text-white' : 'bg-white border-rose-300 text-slate-900'}"
  >
    <!-- Compact Urgency Header -->
    <div class="bg-gradient-to-r from-rose-600 via-rose-600 to-rose-700 px-4 py-3 border-b border-white/15 flex items-center justify-between gap-3 shrink-0 text-white">
      <div class="flex items-center gap-2.5 truncate">
        <div class="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-base shadow-inner border border-white/30 shrink-0">
          <i class="fa-solid fa-hand-holding-dollar text-white drop-shadow"></i>
        </div>
        <div class="truncate">
          <h3 class="font-display font-black text-sm sm:text-base tracking-wide text-white drop-shadow truncate">
            LIQUIDATE PROPERTIES
          </h3>
          <p id="sell-cities-creditor-subtitle" class="text-xs font-bold text-rose-100 truncate">
            {state.creditorSubtitle || 'Insufficient cash to pay rent'}
          </p>
        </div>
      </div>
      <span class="px-2.5 py-1 rounded-full bg-black/25 text-white border border-white/30 text-[10px] sm:text-xs font-black tracking-wider uppercase shrink-0">
        RENT EMERGENCY
      </span>
    </div>

    <!-- Financial Status Summary Bar -->
    <div class="p-3 sm:p-3.5 border-b shrink-0 space-y-2.5 {isDarkTheme ? 'bg-slate-900/80 border-white/10' : 'bg-slate-50 border-slate-200'}">
      <div class="grid grid-cols-3 gap-2 text-center">
        <div class="rounded-2xl p-2 flex flex-col border {isDarkTheme ? 'bg-rose-950/70 border-rose-500/40' : 'bg-rose-50 border-rose-200'}">
          <span class="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider {isDarkTheme ? 'text-rose-300' : 'text-rose-700'}">RENT DUE</span>
          <div id="sell-cities-rent-due" class="text-sm sm:text-base font-black font-mono mt-0.5 {isDarkTheme ? 'text-white' : 'text-rose-950'}">
            {state.rentDueFormatted || '$0'}
          </div>
        </div>
        <div class="rounded-2xl p-2 flex flex-col border {isDarkTheme ? 'bg-sky-950/70 border-sky-500/40' : 'bg-sky-50 border-sky-200'}">
          <span class="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider {isDarkTheme ? 'text-sky-300' : 'text-sky-700'}">YOUR CASH</span>
          <div id="sell-cities-current-cash" class="text-sm sm:text-base font-black font-mono mt-0.5 {isDarkTheme ? 'text-white' : 'text-sky-950'}">
            {state.currentCashFormatted || '$0'}
          </div>
        </div>
        <div class="rounded-2xl p-2 flex flex-col border {isDarkTheme ? 'bg-amber-950/70 border-amber-500/40' : 'bg-amber-50 border-amber-200'}">
          <span class="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider {isDarkTheme ? 'text-amber-300' : 'text-amber-700'}">DEFICIT</span>
          <div id="sell-cities-deficit" class="text-sm sm:text-base font-black font-mono mt-0.5 {isDarkTheme ? 'text-amber-400' : 'text-amber-700'}">
            {state.deficitFormatted || '$0'}
          </div>
        </div>
      </div>

      <!-- Quick Action: Auto-sell cheapest -->
      <button
        id="btn-auto-sell-cheapest"
        onclick={onAutoSell}
        class="w-full py-2 px-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all duration-150 hover:brightness-105 active:scale-[0.99]"
      >
        <i class="fa-solid fa-bolt-lightning text-slate-950"></i>
        <span>AUTO-SELL CHEAPEST TO COVER RENT</span>
      </button>
    </div>

    <!-- Scrollable Properties List -->
    <div
      class="p-3 overflow-y-auto flex-1 space-y-2 max-h-48 sm:max-h-56 {isDarkTheme ? 'bg-slate-950/60' : 'bg-white'}"
      id="sell-cities-card-grid"
    >
      {#if state.ownedProperties && state.ownedProperties.length > 0}
        {#each state.ownedProperties as prop}
          <div
            onclick={() => onSell(prop.id)}
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSell(prop.id); } }}
            tabindex="0"
            role="button"
            data-tile-id="{prop.id}"
            aria-label="Sell {prop.name} for {prop.saleValFormatted}"
            class="group border active:scale-[0.99] rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-3 transition-all duration-150 cursor-pointer select-none {isDarkTheme ? 'bg-slate-900/90 border-white/10 hover:border-rose-500/80 hover:bg-rose-950/30' : 'bg-slate-50 border-slate-200 hover:border-rose-400 hover:bg-rose-50/60'}"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <span
                class="w-3.5 h-3.5 rounded-full shrink-0"
                style="background:{prop.color}"
              ></span>
              <div class="truncate">
                <div class="font-black text-xs sm:text-sm transition-colors truncate {isDarkTheme ? 'text-white group-hover:text-rose-200' : 'text-slate-900 group-hover:text-rose-700'}">
                  {prop.name}
                </div>
                <div class="text-[11px] font-bold {isDarkTheme ? 'text-slate-400' : 'text-slate-500'}">
                  {prop.levelDesc}
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2.5 shrink-0">
              <div class="text-right">
                <div class="text-[10px] font-mono font-bold uppercase {isDarkTheme ? 'text-slate-400' : 'text-slate-500'}">SALE VALUE</div>
                <div class="text-xs sm:text-sm font-black font-mono {isDarkTheme ? 'text-emerald-400' : 'text-emerald-700'}">+{prop.saleValFormatted}</div>
              </div>
              <button
                type="button"
                onclick={(e) => { e.stopPropagation(); onSell(prop.id); }}
                class="py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-black text-xs shadow-sm cursor-pointer transition-all duration-150"
              >
                <i class="fa-solid fa-tag mr-1 text-[10px]"></i> SELL
              </button>
            </div>
          </div>
        {/each}
      {:else}
        <div class="text-center py-6 font-bold text-xs {isDarkTheme ? 'text-slate-400' : 'text-slate-600'}">
          <i class="fa-solid fa-triangle-exclamation text-amber-400 text-base mb-1 block"></i>
          No properties left to sell.
        </div>
      {/if}
    </div>
  </div>
</div>
