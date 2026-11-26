<script>
  import { modalStore } from '../stores/modalStore.js';

  let state = $state({});
  modalStore.subscribe(val => { state = val.sellCities || {}; });

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
    class="w-full bg-slate-950/92 backdrop-blur-xs border-2 border-rose-500/80 rounded-3xl text-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(244,63,94,0.3)] flex flex-col max-h-[64vh] sm:max-h-[58vh] select-none font-ui pointer-events-auto overflow-hidden"
  >
    <!-- Compact Urgency Header -->
    <div class="bg-gradient-to-r from-rose-700 via-rose-600 to-slate-900 px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
      <div class="flex items-center gap-2.5 truncate">
        <div class="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-base shadow-inner border border-white/30 shrink-0">
          <i class="fa-solid fa-hand-holding-dollar text-white drop-shadow"></i>
        </div>
        <div class="truncate">
          <h3 class="font-display font-black text-sm sm:text-base tracking-wide text-white drop-shadow truncate">
            LIQUIDATE PROPERTIES
          </h3>
          <p id="sell-cities-creditor-subtitle" class="text-xs font-bold text-rose-200 truncate">
            {state.creditorSubtitle || 'Insufficient cash to pay rent'}
          </p>
        </div>
      </div>
      <span class="px-2.5 py-1 rounded-full bg-black/40 text-rose-300 border border-rose-400/40 text-[10px] sm:text-xs font-black tracking-wider uppercase shrink-0">
        RENT EMERGENCY
      </span>
    </div>

    <!-- Financial Status Summary Bar -->
    <div class="p-3 sm:p-3.5 bg-slate-900/80 border-b border-white/10 shrink-0 space-y-2.5">
      <div class="grid grid-cols-3 gap-2 text-center">
        <div class="bg-rose-950/70 border border-rose-500/40 rounded-2xl p-2 flex flex-col">
          <span class="text-[10px] sm:text-xs font-mono font-bold uppercase text-rose-300 tracking-wider">RENT DUE</span>
          <div id="sell-cities-rent-due" class="text-sm sm:text-base font-black text-white font-mono mt-0.5">
            {state.rentDueFormatted || '$0'}
          </div>
        </div>
        <div class="bg-sky-950/70 border border-sky-500/40 rounded-2xl p-2 flex flex-col">
          <span class="text-[10px] sm:text-xs font-mono font-bold uppercase text-sky-300 tracking-wider">YOUR CASH</span>
          <div id="sell-cities-current-cash" class="text-sm sm:text-base font-black text-white font-mono mt-0.5">
            {state.currentCashFormatted || '$0'}
          </div>
        </div>
        <div class="bg-amber-950/70 border border-amber-500/40 rounded-2xl p-2 flex flex-col">
          <span class="text-[10px] sm:text-xs font-mono font-bold uppercase text-amber-300 tracking-wider">DEFICIT</span>
          <div id="sell-cities-deficit" class="text-sm sm:text-base font-black text-amber-400 font-mono mt-0.5">
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
      class="p-3 overflow-y-auto flex-1 space-y-2 bg-slate-950/60 max-h-48 sm:max-h-56"
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
            class="group bg-slate-900/90 border border-white/10 hover:border-rose-500/80 hover:bg-rose-950/30 active:scale-[0.99] rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-3 transition-all duration-150 cursor-pointer select-none"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <span
                class="w-3.5 h-3.5 rounded-full border border-white/40 shrink-0"
                style="background:{prop.color}"
              ></span>
              <div class="truncate">
                <div class="font-black text-xs sm:text-sm text-white group-hover:text-rose-200 transition-colors truncate">
                  {prop.name}
                </div>
                <div class="text-[11px] font-bold text-slate-400">
                  {prop.levelDesc}
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2.5 shrink-0">
              <div class="text-right">
                <div class="text-[10px] font-mono font-bold uppercase text-slate-400">SALE VALUE</div>
                <div class="text-xs sm:text-sm font-black font-mono text-emerald-400">+{prop.saleValFormatted}</div>
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
        <div class="text-center py-6 text-slate-400 font-bold text-xs">
          <i class="fa-solid fa-triangle-exclamation text-amber-400 text-base mb-1 block"></i>
          No properties left to sell.
        </div>
      {/if}
    </div>
  </div>
</div>
