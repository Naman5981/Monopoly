<script>
  import { modalStore } from '../stores/modalStore.js';

  let state = $state({});
  modalStore.subscribe(val => { state = val.portfolio || {}; });

  function onClose() {
    window.closePortfolioModal?.();
  }

  function onBackdropClick(e) {
    window.handleModalBackdropClick?.(e, window.closePortfolioModal);
  }
</script>

<div id="modal-portfolio" class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 items-center justify-center p-4 overscroll-contain {state.visible ? 'flex' : 'hidden'}" onclick={onBackdropClick}>
  <div class="game-modal-shell modal-shell-emerald max-w-3xl w-full max-h-[86vh] flex flex-col overflow-hidden shadow-2xl">
    <!-- Grand Banner Header (Victory Style) -->
    <div class="game-modal-header bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white relative overflow-hidden flex items-center justify-between shadow-md">
      <!-- Floating Watermark Icons -->
      <svg class="ui-watermark absolute -right-3 -top-3 w-24 h-24 text-white opacity-15" aria-hidden="true"><use href="#icon-city"></use></svg>
      <svg class="ui-watermark absolute -left-3 -bottom-3 w-24 h-24 text-white opacity-15" aria-hidden="true"><use href="#icon-crown"></use></svg>

      <div class="relative z-10 flex items-center gap-3.5">
        <div class="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-2xl shadow-inner text-white">
          <svg class="ui-icon w-6 h-6 text-white" aria-hidden="true"><use href="#icon-city"></use></svg>
        </div>
        <div>
          <div class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-emerald-100 shadow-xs mb-1 border border-white/20">
            <svg class="ui-icon w-3 h-3 text-emerald-200" aria-hidden="true"><use href="#icon-building"></use></svg> REAL ESTATE PORTFOLIO
          </div>
          <h3 class="font-rounded font-black text-xl sm:text-2xl text-white tracking-wide drop-shadow-md">
            MANAGE YOUR GLOBAL CITIES
          </h3>
          <p class="text-xs font-bold text-emerald-100 drop-shadow mt-0.5">
            Upgrade with Houses &amp; Skyscrapers
          </p>
        </div>
      </div>

      <button onclick={onClose} class="relative z-10 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition shadow-xs border border-white/30" title="Close portfolio">
        <i class="fa-solid fa-xmark text-base"></i>
      </button>
    </div>

    <!-- Portfolio Summary Metrics Bar -->
    <div id="portfolio-summary-bar" class="px-5 py-2.5 bg-slate-900/90 border-b border-white/10 text-white flex items-center justify-between text-xs font-bold">
      <div class="flex items-center gap-1.5">
        <span class="text-slate-400 font-extrabold uppercase text-[10px]">Cities Owned:</span>
        <span class="text-emerald-400 font-black text-sm">{state.totalCities ?? 0}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="text-slate-400 font-extrabold uppercase text-[10px]">Total Rent Yield:</span>
        <span class="text-emerald-400 font-black text-sm">{state.totalRentFormatted || '$0'}</span>
      </div>
    </div>

    <!-- Scrollable Properties Grid -->
    <div id="portfolio-grid" class="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-gradient-to-b from-white to-slate-50/70">
      {#if state.properties && state.properties.length > 0}
        {#each state.properties as prop}
          <div class="p-3 bg-white rounded-2xl border-2 border-slate-200/90 shadow-2xs flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0" style="background:{prop.color}"></span>
              <div>
                <div class="font-black text-xs sm:text-sm text-slate-900">{prop.name}</div>
                <div class="text-[10px] font-bold text-slate-500">{prop.levelDesc}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-[9px] font-extrabold uppercase text-slate-400">RENT</div>
              <div class="text-xs sm:text-sm font-black text-emerald-600">{prop.rentFormatted}</div>
            </div>
          </div>
        {/each}
      {:else}
        <div class="col-span-2 text-center py-10 px-4 flex flex-col items-center justify-center space-y-3">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-sky-100 flex items-center justify-center text-3xl shadow-inner border border-indigo-200">
            🏙️
          </div>
          <div class="font-rounded font-black text-base text-slate-800">NO EMPIRE CITIES YET</div>
          <div class="text-xs font-semibold text-slate-500 max-w-sm">Roll the dice to travel the board, purchase world properties, and build houses and skyscrapers!</div>
        </div>
      {/if}
    </div>
  </div>
</div>
