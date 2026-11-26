<script>
  import { modalStore } from '../stores/modalStore.js';
  import { hudStore } from '../stores/hudStore.js';

  let state = $state({});
  let hud = $state({});
  let isSubmitting = $state(false);
  modalStore.subscribe(val => { state = val.auction || {}; });
  hudStore.subscribe(val => { hud = val || {}; });

  const isDarkTheme = $derived(hud.lightingMode === 'Night' || hud.boardStyle === 'cyberpunk');

  function onBid(amt) {
    if (isSubmitting) return;
    if (typeof window !== 'undefined' && typeof window.placeAuctionBid === 'function') {
      isSubmitting = true;
      window.placeAuctionBid(amt);
      setTimeout(() => { isSubmitting = false; }, 400);
    }
  }

  function onPass() {
    if (isSubmitting || state.hasPassed) return;
    if (typeof window !== 'undefined' && typeof window.passAuctionBid === 'function') {
      isSubmitting = true;
      window.passAuctionBid();
      setTimeout(() => { isSubmitting = false; }, 400);
    }
  }
</script>

<div
  id="modal-auction"
  class="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[1000] items-center justify-center p-2 w-full max-w-lg overscroll-contain pointer-events-none {state.visible ? 'flex' : 'hidden'}"
>
  <div
    id="modal-auction-card"
    class="w-full rounded-3xl p-3.5 sm:p-4 shadow-2xl flex flex-col gap-2.5 select-none font-ui pointer-events-auto backdrop-blur-xs border-2 {isDarkTheme ? 'bg-slate-950/95 border-amber-500/80 text-white' : 'bg-white border-amber-300 text-slate-900'}"
  >
    <!-- Header with Amber Gradient Ramp -->
    <div class="flex items-center justify-between gap-2 border-b pb-2 {isDarkTheme ? 'border-white/10' : 'border-slate-100'}">
      <div class="flex items-center gap-2 truncate">
        <div class="w-7 h-7 rounded-xl bg-gradient-to-r from-amber-500 to-amber-700 flex items-center justify-center text-xs shadow-inner shrink-0">
          <i class="fa-solid fa-gavel text-white drop-shadow"></i>
        </div>
        <div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full shrink-0" style="background-color: {state.groupColor || '#0284c7'};"></span>
            <h3 id="auction-city-name" class="font-display font-black text-sm sm:text-base tracking-wide truncate {isDarkTheme ? 'text-white' : 'text-slate-900'}">
              {state.cityName || 'CITY'}
            </h3>
            <span class="text-xs font-mono font-black px-1.5 py-0.5 rounded-full border shrink-0 {isDarkTheme ? 'bg-amber-500/20 text-amber-300 border-amber-400/30' : 'bg-amber-50 text-amber-800 border-amber-200'}">
              {state.queueProgress || 'AUCTION'}
            </span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 text-right shrink-0">
        <span class="text-xs font-semibold {isDarkTheme ? 'text-slate-400' : 'text-slate-500'}">Value:</span>
        <span id="auction-base-val" class="font-mono font-black text-xs {isDarkTheme ? 'text-amber-300' : 'text-amber-700'}">{state.baseValFormatted || '$0'}</span>
      </div>
    </div>

    <!-- Live Highest Bid & 5s Countdown Bar -->
    <div class="rounded-2xl p-2.5 sm:p-3 border flex flex-col gap-2 {isDarkTheme ? 'bg-slate-900/90 border-white/10' : 'bg-slate-50 border-slate-200'}">
      <div class="flex items-center justify-between gap-2">
        <div class="flex flex-col">
          <span class="text-xs font-mono font-bold uppercase tracking-wider {isDarkTheme ? 'text-slate-400' : 'text-slate-500'}">Current High Bid</span>
          <div class="flex items-center gap-2">
            <span id="auction-high-bid" class="font-display font-black text-xl sm:text-2xl leading-none {isDarkTheme ? 'text-amber-400' : 'text-amber-600'}">
              {state.currentBidFormatted || '$0'}
            </span>
            <span id="auction-high-bidder" class="text-xs font-mono font-black px-2 py-0.5 rounded-full border shadow-2xs {state.isLeading ? (isDarkTheme ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 animate-pulse' : 'bg-emerald-50 text-emerald-800 border-emerald-200 animate-pulse') : (isDarkTheme ? 'bg-slate-800 text-slate-300 border-white/10' : 'bg-white text-slate-700 border-slate-200')}">
              {state.isLeading ? 'Leading: YOU' : (state.hasBids ? `Leading: ${state.highBidderName}` : 'Opening Reserve')}
            </span>
          </div>
        </div>

        <!-- 5-Second Timer Pill -->
        <div class="flex flex-col items-end">
          <span class="text-xs font-mono font-bold uppercase tracking-wider {isDarkTheme ? 'text-slate-400' : 'text-slate-500'}">Countdown</span>
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border font-mono font-black text-xs {isDarkTheme ? 'bg-slate-950 border-amber-500/30 text-amber-300' : 'bg-white border-amber-300 text-amber-700'}">
            <i class="fa-solid fa-stopwatch text-[10px] {state.secondsLeft <= 2 ? 'text-rose-500 animate-ping' : 'text-amber-500'}"></i>
            <span class="{state.secondsLeft <= 2 ? 'text-rose-500 font-black' : ''}">
              {typeof state.secondsLeft === 'number' ? state.secondsLeft.toFixed(1) : '5.0'}s
            </span>
          </div>
        </div>
      </div>

      <!-- Animated Countdown Progress Bar -->
      <div class="w-full h-1.5 rounded-full overflow-hidden border {isDarkTheme ? 'bg-slate-950 border-white/5' : 'bg-slate-200 border-slate-200'}">
        <div
          class="h-full rounded-full transition-all duration-100 ease-linear {state.secondsLeft <= 2 ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-400 to-yellow-400'}"
          style="width: {state.timerPercent || 100}%;"
        ></div>
      </div>
    </div>

    <!-- 3 Dynamic Bidding Increase Options & Pass Button -->
    <div class="grid grid-cols-4 gap-1.5 pt-0.5">
      {#if state.bidOptions && state.bidOptions.length === 3}
        {@const d0 = !state.optionsAffordable?.[0] || state.isLeading || state.isSeller || state.hasPassed || isSubmitting}
        {@const d1 = !state.optionsAffordable?.[1] || state.isLeading || state.isSeller || state.hasPassed || isSubmitting}
        {@const d2 = !state.optionsAffordable?.[2] || state.isLeading || state.isSeller || state.hasPassed || isSubmitting}
        <!-- Option 1: Minimum / Tactical Increment -->
        <button
          onclick={() => onBid(state.bidOptions[0])}
          disabled={d0}
          class="py-2 px-1 text-center flex flex-col items-center justify-center rounded-2xl shadow-xs transition-all duration-150 {d0 ? (isDarkTheme ? 'bg-slate-800/80 border border-white/10 text-slate-400 cursor-not-allowed' : 'bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed') : 'game-btn game-btn-green cursor-pointer hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-95'}"
          title="Raise by {state.incrementsFormatted?.[0] || ''}"
        >
          <span class="text-[11px] sm:text-xs font-black">{state.incrementsFormatted?.[0] || '+10K'}</span>
          <span class="text-[10px] font-mono leading-tight {d0 ? 'opacity-80' : 'text-emerald-100'}">({state.bidOptionsFormatted?.[0] || '$0'})</span>
        </button>

        <!-- Option 2: Standard Increment -->
        <button
          onclick={() => onBid(state.bidOptions[1])}
          disabled={d1}
          class="py-2 px-1 text-center flex flex-col items-center justify-center rounded-2xl shadow-xs transition-all duration-150 {d1 ? (isDarkTheme ? 'bg-slate-800/80 border border-white/10 text-slate-400 cursor-not-allowed' : 'bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed') : 'game-btn game-btn-green cursor-pointer hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-95'}"
          title="Raise by {state.incrementsFormatted?.[1] || ''}"
        >
          <span class="text-[11px] sm:text-xs font-black">{state.incrementsFormatted?.[1] || '+25K'}</span>
          <span class="text-[10px] font-mono leading-tight {d1 ? 'opacity-80' : 'text-emerald-100'}">({state.bidOptionsFormatted?.[1] || '$0'})</span>
        </button>

        <!-- Option 3: Aggressive Power Bid Increment -->
        <button
          onclick={() => onBid(state.bidOptions[2])}
          disabled={d2}
          class="py-2 px-1 text-center flex flex-col items-center justify-center rounded-2xl shadow-xs transition-all duration-150 {d2 ? (isDarkTheme ? 'bg-slate-800/80 border border-white/10 text-slate-400 cursor-not-allowed' : 'bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed') : 'game-btn game-btn-amber cursor-pointer hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-95'}"
          title="Raise by {state.incrementsFormatted?.[2] || ''}"
        >
          <span class="text-[11px] sm:text-xs font-black">{state.incrementsFormatted?.[2] || '+50K'}</span>
          <span class="text-[10px] font-mono leading-tight {d2 ? 'opacity-80' : 'text-amber-100'}">({state.bidOptionsFormatted?.[2] || '$0'})</span>
        </button>
      {/if}

      <!-- Pass Button -->
      <button
        onclick={onPass}
        disabled={state.isLeading || state.hasPassed || isSubmitting}
        class="game-btn {state.hasPassed ? (isDarkTheme ? 'bg-slate-900 border-white/10 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400') : 'game-btn-slate'} py-2 px-2 text-center flex flex-col items-center justify-center rounded-2xl shadow-xs cursor-pointer transition-all duration-150 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:hover:brightness-100 disabled:hover:translate-y-0 disabled:opacity-35 disabled:cursor-not-allowed"
        title={state.hasPassed ? 'You have passed on this property auction' : 'Pass on this property auction'}
      >
        <span class="text-[11px] sm:text-xs font-black {state.hasPassed ? 'text-slate-400' : (isDarkTheme ? 'text-slate-200' : 'text-slate-800')}">{state.hasPassed ? 'PASSED' : 'PASS'}</span>
        <span class="text-[10px] {isDarkTheme ? 'text-slate-400' : 'text-slate-500'} leading-tight">✕</span>
      </button>
    </div>

    {#if state.isSeller}
      <p class="text-xs text-center font-bold flex items-center justify-center gap-1.5 {isDarkTheme ? 'text-rose-300/80' : 'text-rose-700'}">
        <i class="fa-solid fa-triangle-exclamation text-rose-500" aria-hidden="true"></i>
        <span>You liquidated this property to pay rent debt. You cannot bid.</span>
      </p>
    {:else if state.isLeading}
      <p class="text-xs text-center font-bold animate-pulse flex items-center justify-center gap-1.5 {isDarkTheme ? 'text-emerald-300/90' : 'text-emerald-700'}">
        <i class="fa-solid fa-crown text-amber-500" aria-hidden="true"></i>
        <span>You currently hold the highest bid! Property is yours if timer expires.</span>
      </p>
    {:else if state.hasPassed}
      <p class="text-xs text-center font-bold flex items-center justify-center gap-1.5 {isDarkTheme ? 'text-slate-400' : 'text-slate-600'}">
        <i class="fa-solid fa-ban text-slate-500" aria-hidden="true"></i>
        <span>You passed on this property. Waiting for other bidders...</span>
      </p>
    {/if}
  </div>
</div>
