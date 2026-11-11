<script>
  import { modalStore } from '../stores/modalStore.js';

  let state = $state({});
  modalStore.subscribe(val => { state = val.auction || {}; });

  function onBid(amt) {
    if (typeof window !== 'undefined' && typeof window.placeAuctionBid === 'function') {
      window.placeAuctionBid(amt);
    }
  }

  function onPass() {
    if (typeof window !== 'undefined' && typeof window.passAuctionBid === 'function') {
      window.passAuctionBid();
    }
  }
</script>

<div
  id="modal-auction"
  class="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[1000] items-center justify-center p-2 w-full max-w-lg overscroll-contain pointer-events-none {state.visible ? 'flex' : 'hidden'}"
>
  <div
    id="modal-auction-card"
    class="w-full bg-slate-950/95 border-2 border-amber-500/80 rounded-3xl p-3.5 sm:p-4 text-white shadow-2xl flex flex-col gap-2.5 select-none font-ui pointer-events-auto backdrop-blur-md"
    style="box-shadow: 0 20px 40px -10px rgba(0,0,0,0.85), 0 0 30px rgba(245,158,11,0.25);"
  >
    <!-- Header with Amber Gradient Ramp (from-amber-500 to-amber-700) -->
    <div class="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
      <div class="flex items-center gap-2 truncate">
        <div class="w-7 h-7 rounded-xl bg-gradient-to-r from-amber-500 to-amber-700 flex items-center justify-center text-xs shadow-inner shrink-0">
          <i class="fa-solid fa-gavel text-white drop-shadow"></i>
        </div>
        <div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full border border-white/40 shrink-0" style="background-color: {state.groupColor || '#0284c7'};"></span>
            <h3 id="auction-city-name" class="font-display font-black text-sm sm:text-base tracking-wide text-white truncate">
              {state.cityName || 'CITY'}
            </h3>
            <span class="text-[9px] font-mono font-black px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 shrink-0">
              {state.queueProgress || 'AUCTION'}
            </span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 text-right shrink-0">
        <span class="text-[11px] text-slate-400 font-semibold">Value:</span>
        <span id="auction-base-val" class="font-mono font-black text-xs text-amber-300">{state.baseValFormatted || '$0'}</span>
      </div>
    </div>

    <!-- Live Highest Bid & 5s Countdown Bar -->
    <div class="bg-slate-900/90 rounded-2xl p-2.5 sm:p-3 border border-white/10 flex flex-col gap-2">
      <div class="flex items-center justify-between gap-2">
        <div class="flex flex-col">
          <span class="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">Current High Bid</span>
          <div class="flex items-center gap-2">
            <span id="auction-high-bid" class="font-display font-black text-xl sm:text-2xl text-amber-400 leading-none">
              {state.currentBidFormatted || '$0'}
            </span>
            <span id="auction-high-bidder" class="text-[10px] font-mono font-black px-2 py-0.5 rounded-full border shadow-2xs {state.isLeading ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 animate-pulse' : 'bg-slate-800 text-slate-300 border-white/10'}">
              {state.isLeading ? 'Leading: YOU' : (state.hasBids ? `Leading: ${state.highBidderName}` : 'Opening Reserve')}
            </span>
          </div>
        </div>

        <!-- 5-Second Timer Pill -->
        <div class="flex flex-col items-end">
          <span class="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">Countdown</span>
          <div class="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-amber-500/30 text-amber-300 font-mono font-black text-xs">
            <i class="fa-solid fa-stopwatch text-[10px] {state.secondsLeft <= 2 ? 'text-rose-400 animate-ping' : 'text-amber-400'}"></i>
            <span class="{state.secondsLeft <= 2 ? 'text-rose-400 font-black' : ''}">
              {typeof state.secondsLeft === 'number' ? state.secondsLeft.toFixed(1) : '5.0'}s
            </span>
          </div>
        </div>
      </div>

      <!-- Animated Countdown Progress Bar -->
      <div class="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/5">
        <div
          class="h-full rounded-full transition-all duration-100 ease-linear {state.secondsLeft <= 2 ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-400 to-yellow-400'}"
          style="width: {state.timerPercent || 100}%;"
        ></div>
      </div>
    </div>

    <!-- 3 Dynamic Bidding Increase Options & Pass Button -->
    <div class="grid grid-cols-4 gap-1.5 pt-0.5">
      {#if state.bidOptions && state.bidOptions.length === 3}
        <!-- Option 1: Minimum / Tactical Increment -->
        <button
          onclick={() => onBid(state.bidOptions[0])}
          disabled={!state.optionsAffordable?.[0] || state.isLeading || state.isSeller}
          class="game-btn game-btn-green py-2 px-1 text-center flex flex-col items-center justify-center rounded-2xl shadow-xs transition-transform active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed disabled:grayscale"
          title="Raise by {state.incrementsFormatted?.[0] || ''}"
        >
          <span class="text-[11px] sm:text-xs font-black">{state.incrementsFormatted?.[0] || '+10K'}</span>
          <span class="text-[9px] font-mono text-emerald-200/90 leading-tight">({state.bidOptionsFormatted?.[0] || '$0'})</span>
        </button>

        <!-- Option 2: Standard Increment -->
        <button
          onclick={() => onBid(state.bidOptions[1])}
          disabled={!state.optionsAffordable?.[1] || state.isLeading || state.isSeller}
          class="game-btn game-btn-green py-2 px-1 text-center flex flex-col items-center justify-center rounded-2xl shadow-xs transition-transform active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed disabled:grayscale"
          title="Raise by {state.incrementsFormatted?.[1] || ''}"
        >
          <span class="text-[11px] sm:text-xs font-black">{state.incrementsFormatted?.[1] || '+25K'}</span>
          <span class="text-[9px] font-mono text-emerald-200/90 leading-tight">({state.bidOptionsFormatted?.[1] || '$0'})</span>
        </button>

        <!-- Option 3: Aggressive Power Bid Increment -->
        <button
          onclick={() => onBid(state.bidOptions[2])}
          disabled={!state.optionsAffordable?.[2] || state.isLeading || state.isSeller}
          class="game-btn game-btn-amber py-2 px-1 text-center flex flex-col items-center justify-center rounded-2xl shadow-xs transition-transform active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed disabled:grayscale"
          title="Raise by {state.incrementsFormatted?.[2] || ''}"
        >
          <span class="text-[11px] sm:text-xs font-black">{state.incrementsFormatted?.[2] || '+50K'}</span>
          <span class="text-[9px] font-mono text-amber-100/90 leading-tight">({state.bidOptionsFormatted?.[2] || '$0'})</span>
        </button>
      {/if}

      <!-- Pass Button -->
      <button
        onclick={onPass}
        disabled={state.isLeading}
        class="game-btn game-btn-slate py-2 px-2 text-center flex flex-col items-center justify-center rounded-2xl shadow-xs hover:bg-slate-800 transition active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed"
        title="Pass on this property auction"
      >
        <span class="text-[11px] sm:text-xs font-black text-slate-300">PASS</span>
        <span class="text-[9px] text-slate-400 leading-tight">✕</span>
      </button>
    </div>

    {#if state.isSeller}
      <p class="text-[10px] text-rose-300/80 text-center font-bold">
        ⚠️ You liquidated this property to pay rent debt. You cannot bid.
      </p>
    {:else if state.isLeading}
      <p class="text-[10px] text-emerald-300/90 text-center font-bold animate-pulse">
        👑 You currently hold the highest bid! Property is yours if timer expires.
      </p>
    {/if}
  </div>
</div>
