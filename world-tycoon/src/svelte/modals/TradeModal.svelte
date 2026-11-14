<script>
  import { modalStore } from '../stores/modalStore.js';
  import ActionChipShell from '../components/ActionChipShell.svelte';

  let state = $state({});
  modalStore.subscribe(val => { state = val.trade || {}; });

  function onClose() {
    window.closeTradeModal?.();
  }

  function onSendOffer() {
    window.executeTradeOffer?.();
  }

  function onPartnerChange(e) {
    window.populateTradePartnerProps?.(e.currentTarget.value);
  }

  function onAcceptIncoming() {
    window.acceptIncomingTrade?.();
  }

  function onCounterIncoming() {
    window.counterIncomingTrade?.();
  }

  function onDeclineIncoming() {
    window.declineIncomingTrade?.();
  }
</script>

<!-- Propose Trade Modal -->
<div id="modal-trade" class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 items-center justify-center p-4 overscroll-contain {state.visible ? 'flex' : 'hidden'}">
  <div id="modal-trade-card" class="game-modal-shell modal-shell-emerald max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
    <!-- Header -->
    <div id="trade-header" class="game-modal-header bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 p-5 text-white relative overflow-hidden flex items-center justify-between shadow-md">
      <div class="relative z-10 flex items-center gap-3.5">
        <div class="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-2xl shadow-inner text-white">
          🤝
        </div>
        <div>
          <div class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-emerald-100 shadow-xs mb-1 border border-white/20">
            GLOBAL DIPLOMACY
          </div>
          <h3 class="font-rounded font-black text-xl sm:text-2xl text-white tracking-wide drop-shadow-md">
            PROPOSE CITY TRADE
          </h3>
          <p class="text-xs font-bold text-emerald-100 drop-shadow mt-0.5">
            Strategic mutual exchange of metropolitan property deeds
          </p>
        </div>
      </div>

      <button onclick={onClose} class="relative z-10 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition shadow-xs border border-white/30" title="Close trade">
        ✕
      </button>
    </div>

    <!-- Body -->
    <div class="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto bg-gradient-to-b from-white to-slate-50/70 flex-1">
      <!-- Left: Your Offer -->
      <div class="bg-gradient-to-b from-sky-50/60 to-white p-4 rounded-2xl border-2 border-sky-300 shadow-xs flex flex-col">
        <div class="flex items-center justify-between mb-2.5 pb-1.5 border-b border-sky-200">
          <span class="font-rounded font-black text-sm text-sky-800 flex items-center gap-1.5">
            YOUR OFFER
          </span>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-black uppercase text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full border border-sky-200">YOU</span>
            <span id="trade-my-wallet" class="text-[10px] font-black uppercase text-sky-900 bg-sky-200/80 px-2 py-0.5 rounded-full border border-sky-300">Wallet: {state.myWallet || '$0'}</span>
          </div>
        </div>
        <div class="text-xs font-black text-slate-700 mb-1.5">Your Cities to Transfer:</div>
        <div id="trade-offer-props" class="space-y-1.5 max-h-56 overflow-y-auto flex-1 pr-1 overscroll-contain">
          {#each state.myProperties || [] as prop}
            <label class="flex items-center justify-between p-2 rounded-xl border border-slate-200 bg-white hover:bg-sky-50 cursor-pointer transition">
              <div class="flex items-center gap-2">
                <input type="checkbox" class="trade-my-prop" value={prop.id} />
                <span class="w-3 h-3 rounded-full" style="background-color: {prop.color};"></span>
                <span class="font-bold text-xs text-slate-800">{prop.name}</span>
              </div>
              <span class="text-[11px] font-black text-slate-500">{prop.rentFormatted}</span>
            </label>
          {/each}
          {#if !state.myProperties?.length}<div class="text-xs font-bold text-slate-500 py-2 text-center">No cities owned</div>{/if}
        </div>
      </div>

      <!-- Right: Partner Request -->
      <div class="bg-gradient-to-b from-amber-50/60 to-white p-4 rounded-2xl border-2 border-amber-300 shadow-xs flex flex-col">
        <div class="flex items-center justify-between mb-2.5 pb-1.5 border-b border-amber-200">
          <span class="font-rounded font-black text-sm text-amber-800 flex items-center gap-1.5">
            YOU REQUEST
          </span>
          <div class="flex items-center gap-1.5">
            <span id="trade-partner-wallet" class="text-[10px] font-black uppercase text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">Wallet: {state.partnerWallet || '$0'}</span>
            <select id="trade-partner-select" onchange={onPartnerChange} class="text-xs font-black bg-white border-2 border-amber-300 rounded-lg px-2 py-0.5 text-slate-800 cursor-pointer shadow-2xs">
              {#if !state.partners?.length}<option value="">No partners available</option>{/if}
              {#each state.partners || [] as p}
                <option value={p.id} selected={state.selectedPartnerIdx === p.id}>{p.name}</option>
              {/each}
            </select>
          </div>
        </div>
        <div class="text-xs font-black text-slate-700 mb-1.5">Partner Cities to Receive:</div>
        <div id="trade-req-props" class="space-y-1.5 max-h-56 overflow-y-auto flex-1 pr-1 overscroll-contain">
          {#each state.partnerProperties || [] as prop}
            <label class="flex items-center justify-between p-2 rounded-xl border border-slate-200 bg-white hover:bg-amber-50 cursor-pointer transition">
              <div class="flex items-center gap-2">
                <input type="checkbox" class="trade-their-prop" value={prop.id} />
                <span class="w-3 h-3 rounded-full" style="background-color: {prop.color};"></span>
                <span class="font-bold text-xs text-slate-800">{prop.name}</span>
              </div>
              <span class="text-[11px] font-black text-slate-500">{prop.rentFormatted}</span>
            </label>
          {/each}
          {#if !state.partnerProperties?.length}<div class="text-xs font-bold text-slate-500 py-2 text-center">No cities owned</div>{/if}
        </div>
      </div>
    </div>

    <!-- Counter banner if active -->
    <div id="trade-counter-banner" class="hidden mx-4 mb-2 p-3.5 bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-2xl shadow-xs text-center space-y-2">
      <div class="flex items-center justify-center gap-1.5 font-black text-xs text-amber-950 uppercase tracking-wide">
        <span id="counter-offer-title">Counter-Offer Proposed</span>
      </div>
      <div id="counter-offer-desc" class="text-xs text-slate-700 font-semibold leading-relaxed"></div>
      <div class="flex gap-2 pt-1 max-w-xs mx-auto">
        <button onclick={() => window.acceptTradeCounterOffer?.()} class="game-btn game-btn-green flex-1 py-2 text-xs font-black">
          Accept Counter
        </button>
        <button onclick={() => window.rejectTradeCounterOffer?.()} class="game-btn game-btn-slate flex-1 py-2 text-xs font-black">
          Decline
        </button>
      </div>
    </div>

    <!-- Status banner -->
    <div id="trade-status-msg" class="mx-4 my-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900 text-center {state.statusMessage ? '' : 'hidden'}">
      {state.statusMessage || ''}
    </div>

    <!-- Footer -->
    <div class="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
      <button onclick={onClose} class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer">
        Cancel
      </button>
      <button id="btn-send-trade-offer" onclick={onSendOffer} disabled={state.isWaiting} class="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md transition cursor-pointer {state.isWaiting ? 'opacity-50 cursor-not-allowed' : ''}">
        {state.isWaiting ? 'Waiting for Response...' : 'Send Trade Offer'}
      </button>
    </div>
  </div>
</div>

<!-- Incoming Proactive Trade Proposal Dock (/anti-ui-slop /better-interface) -->
<ActionChipShell modalId="modal-incoming-trade" cardId="modal-incoming-trade-card" visible={state.incomingTrade?.visible} borderColor="border-indigo-500/80">
  <!-- Top Summary Line -->
  <div class="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
    <div class="flex items-center gap-2 truncate min-w-0">
      <span class="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-800 text-white font-black shadow-sm shrink-0">
        🤝 TRADE OFFER
      </span>
      <div class="flex items-center gap-1.5 truncate">
        <span class="w-2.5 h-2.5 rounded-full border border-white/40 shrink-0" style="background-color: {state.incomingTrade?.botColor || '#6366f1'};"></span>
        <h3 id="incoming-trade-bot-name" class="font-display font-black text-sm sm:text-base tracking-wide text-white truncate">
          {state.incomingTrade?.botName || 'OPPONENT'}
        </h3>
      </div>
    </div>
    <button onclick={onDeclineIncoming} class="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center text-xs transition cursor-pointer shrink-0" title="Decline trade">
      ✕
    </button>
  </div>

  <!-- 2-Column Exchange Comparison Strip -->
  <div class="grid grid-cols-2 gap-2 sm:gap-3 items-stretch relative">
    <!-- Left: YOU RECEIVE -->
    <div class="bg-gradient-to-b from-emerald-950/70 to-emerald-900/40 border border-emerald-400/50 rounded-2xl p-2.5 flex flex-col justify-between shadow-xs">
      <div class="flex items-center justify-between pb-1 mb-1 border-b border-emerald-400/20 text-[10px] font-black uppercase tracking-wider text-emerald-400">
        <span>YOU RECEIVE</span>
        <span>🎁</span>
      </div>
      <div id="incoming-they-offer-props" class="space-y-1 py-0.5">
        {#each state.incomingTrade?.theyOfferProps || [] as prop}
          <div class="flex items-center justify-between text-xs font-black">
            <div class="flex items-center gap-1.5 truncate min-w-0">
              <span class="w-2.5 h-2.5 rounded-full shrink-0 border border-white/40" style="background-color: {prop.color || '#10b981'};"></span>
              <span class="text-white truncate">{prop.name}</span>
            </div>
            <span class="text-emerald-300 font-extrabold tabular-nums shrink-0 ml-1">{prop.priceFormatted}</span>
          </div>
        {/each}
        {#if !state.incomingTrade?.theyOfferProps?.length}
          <span class="text-xs text-slate-400 italic">No properties</span>
        {/if}
      </div>
    </div>

    <!-- Center Floating Swap Badge -->
    <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-slate-900 border-2 border-indigo-400 flex items-center justify-center text-xs text-indigo-300 shadow-md pointer-events-none">
      ⇄
    </div>

    <!-- Right: YOU GIVE -->
    <div class="bg-gradient-to-b from-sky-950/70 to-indigo-950/40 border border-sky-400/50 rounded-2xl p-2.5 flex flex-col justify-between shadow-xs">
      <div class="flex items-center justify-between pb-1 mb-1 border-b border-sky-400/20 text-[10px] font-black uppercase tracking-wider text-sky-400">
        <span>YOU GIVE</span>
        <span>🤝</span>
      </div>
      <div id="incoming-they-req-props" class="space-y-1 py-0.5">
        {#each state.incomingTrade?.theyReqProps || [] as prop}
          <div class="flex items-center justify-between text-xs font-black">
            <div class="flex items-center gap-1.5 truncate min-w-0">
              <span class="w-2.5 h-2.5 rounded-full shrink-0 border border-white/40" style="background-color: {prop.color || '#38bdf8'};"></span>
              <span class="text-white truncate">{prop.name}</span>
            </div>
            <span class="text-amber-300 font-extrabold tabular-nums shrink-0 ml-1">{prop.priceFormatted}</span>
          </div>
        {/each}
        {#if !state.incomingTrade?.theyReqProps?.length}
          <span class="text-xs text-slate-400 italic">No properties</span>
        {/if}
      </div>
    </div>
  </div>

  <!-- Hidden compatibility element for legacy scripts -->
  <span id="incoming-trade-rationale" class="hidden">{state.incomingTrade?.rationale || ''}</span>

  <!-- Action Buttons Row -->
  <div class="flex items-center gap-2 pt-0.5">
    <button id="btn-accept-trade" onclick={onAcceptIncoming} class="game-btn game-btn-green flex-1 py-2.5 px-3 text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-md">
      <i class="fa-solid fa-check text-sm"></i>
      <span>ACCEPT DEAL</span>
    </button>
    <button id="btn-counter-trade" onclick={onCounterIncoming} class="game-btn game-btn-orange py-2.5 px-3 text-xs font-black flex items-center justify-center gap-1 shadow-md shrink-0">
      <i class="fa-solid fa-arrows-rotate text-xs"></i>
      <span>COUNTER</span>
    </button>
    <button id="btn-decline-trade" onclick={onDeclineIncoming} class="game-btn game-btn-slate py-2.5 px-3 text-xs font-black shrink-0">
      DECLINE ✕
    </button>
  </div>
</ActionChipShell>
