<script>
  import { modalStore } from '../stores/modalStore.js';
  import ActionChipShell from '../components/ActionChipShell.svelte';

  let state = $state({});
  modalStore.subscribe(val => { state = val.trade || {}; });

  let selectedOfferIds = $state(new Set());
  let selectedReqIds = $state(new Set());

  $effect(() => {
    if (state.visible) {
      if (state.selectedOfferIds && state.selectedOfferIds.length > 0) {
        selectedOfferIds = new Set(state.selectedOfferIds);
      } else {
        selectedOfferIds = new Set();
      }
      if (state.selectedReqIds && state.selectedReqIds.length > 0) {
        selectedReqIds = new Set(state.selectedReqIds);
      } else {
        selectedReqIds = new Set();
      }
    } else {
      selectedOfferIds = new Set();
      selectedReqIds = new Set();
    }
  });

  function toggleOfferProp(id, checked) {
    const next = new Set(selectedOfferIds);
    if (checked) next.add(id);
    else next.delete(id);
    selectedOfferIds = next;
  }

  function toggleReqProp(id, checked) {
    const next = new Set(selectedReqIds);
    if (checked) next.add(id);
    else next.delete(id);
    selectedReqIds = next;
  }

  // Calculate live value totals
  let totalOfferVal = $derived(
    (state.myProperties || [])
      .filter(p => selectedOfferIds.has(p.id))
      .reduce((sum, p) => sum + (p.price || 0), 0)
  );

  let totalReqVal = $derived(
    (state.partnerProperties || [])
      .filter(p => selectedReqIds.has(p.id))
      .reduce((sum, p) => sum + (p.price || 0), 0)
  );

  let valDelta = $derived(totalReqVal - totalOfferVal);

  function fmtVal(amt) {
    if (Math.abs(amt) >= 1000000) return `${(amt / 1000000).toFixed(1)}M`;
    if (Math.abs(amt) >= 1000) return `${Math.round(amt / 1000)}K`;
    return `${amt}`;
  }

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

  function handleWindowKeydown(e) {
    if (!state.visible) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<!-- Propose Trade / Counter-Offer Modal (/anti-ui-slop /better-interface) -->
<div id="modal-trade" class="fixed inset-0 bg-slate-950/65 backdrop-blur-xs z-50 items-center justify-center p-3 sm:p-4 overscroll-contain {state.visible ? 'flex' : 'hidden'}">
  <div id="modal-trade-card" class="w-full max-w-xl max-h-[86vh] bg-slate-950/95 border-2 border-emerald-500/80 rounded-3xl text-white shadow-2xl flex flex-col overflow-hidden select-none font-ui pointer-events-auto" style="background-color: rgba(2, 6, 23, 0.96) !important;">
    <!-- Header -->
    <div id="trade-header" class="bg-gradient-to-r from-emerald-600 via-teal-700 to-indigo-900 p-4 sm:p-4.5 text-white relative overflow-hidden flex items-center justify-between border-b border-white/10 shadow-md">
      <div class="relative z-10 flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-lg shadow-inner text-white shrink-0">
          <i class="fa-solid fa-handshake text-white" aria-hidden="true"></i>
        </div>
        <div>
          <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/25 text-xs font-black uppercase tracking-wider text-emerald-200 border border-white/15 mb-0.5">
            {#if state.counterMode}
              <i class="fa-solid fa-bolt text-amber-300 mr-1" aria-hidden="true"></i> DIPLOMATIC COUNTER-PROPOSAL
            {:else}
              GLOBAL DIPLOMACY
            {/if}
          </div>
          <h3 class="font-display font-black text-lg sm:text-xl text-white tracking-wide leading-tight drop-shadow">
            {state.counterMode ? `COUNTER-OFFER: ${state.counterPartnerName?.toUpperCase() || 'PARTNER'}` : 'PROPOSE CITY TRADE'}
          </h3>
          <p class="text-xs font-bold text-emerald-100/80 truncate">
            {state.counterMode ? 'Adjust properties to propose revised counter-terms' : 'Strategic mutual exchange of metropolitan property deeds'}
          </p>
        </div>
      </div>

      <button onclick={onClose} class="relative z-10 w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 active:scale-95 text-white/80 hover:text-white flex items-center justify-center cursor-pointer transition border border-white/20 text-sm focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none" title="Close trade [Esc]">
        ✕
      </button>
    </div>

    <!-- Body: Two Dark Glass Property Columns -->
    <div class="p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto flex-1 bg-slate-950/40">
      <!-- Left: Your Offer -->
      <div class="bg-slate-900/90 p-3 sm:p-3.5 rounded-2xl border border-sky-500/30 flex flex-col shadow-inner">
        <div class="flex items-center justify-between mb-2 pb-1.5 border-b border-white/10">
          <span class="font-display font-black text-xs sm:text-sm text-sky-300 flex items-center gap-1.5 tracking-wide">
            YOUR OFFER
          </span>
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-black uppercase text-sky-200 bg-sky-500/20 px-2 py-0.5 rounded-full border border-sky-400/40">YOU</span>
            <span id="trade-my-wallet" class="text-xs font-extrabold uppercase text-sky-300 bg-slate-800 px-2 py-0.5 rounded-full border border-sky-500/30">Wallet: {state.myWallet || '$0'}</span>
          </div>
        </div>
        <div class="text-xs font-bold text-slate-400 mb-1.5">Select cities to give:</div>
        <div id="trade-offer-props" class="space-y-1.5 max-h-56 overflow-y-auto flex-1 pr-1.5 pb-6 overscroll-contain">
          {#each state.myProperties || [] as prop}
            <label class="flex items-center justify-between p-2 rounded-xl border border-slate-700/60 bg-slate-800/70 hover:bg-slate-700/80 cursor-pointer transition-all duration-150 hover:-translate-y-0.5 select-none group {selectedOfferIds.has(prop.id) ? '!border-sky-400/80 !bg-sky-950/40' : ''}">
              <div class="flex items-center gap-2 min-w-0">
                <input type="checkbox" class="trade-my-prop accent-sky-400 w-4 h-4 rounded cursor-pointer shrink-0" value={prop.id} checked={selectedOfferIds.has(prop.id)} onchange={(e) => toggleOfferProp(prop.id, e.currentTarget.checked)} />
                <span class="w-2.5 h-2.5 rounded-full shrink-0 border border-black/30" style="background-color: {prop.color};"></span>
                <span class="font-bold text-xs text-slate-100 truncate group-hover:text-white">{prop.name}</span>
              </div>
              <span class="text-xs font-extrabold font-mono text-sky-400 shrink-0">{prop.rentFormatted}</span>
            </label>
          {/each}
          {#if !state.myProperties?.length}
            <div class="text-xs font-bold text-slate-500 py-6 text-center">No cities owned</div>
          {/if}
        </div>
      </div>

      <!-- Right: Partner Request -->
      <div class="bg-slate-900/90 p-3 sm:p-3.5 rounded-2xl border border-amber-500/30 flex flex-col shadow-inner">
        <div class="flex items-center justify-between mb-2 pb-1.5 border-b border-white/10">
          <span class="font-display font-black text-xs sm:text-sm text-amber-300 flex items-center gap-1.5 tracking-wide">
            YOU REQUEST
          </span>
          <div class="flex items-center gap-1.5">
            <span id="trade-partner-wallet" class="text-xs font-extrabold uppercase text-amber-300 bg-slate-800 px-2 py-0.5 rounded-full border border-amber-500/30">Wallet: {state.partnerWallet || '$0'}</span>
            <select id="trade-partner-select" onchange={onPartnerChange} disabled={state.counterMode} class="text-xs font-bold bg-slate-800 border border-amber-400/50 rounded-lg px-2 py-0.5 text-amber-200 cursor-pointer shadow-xs focus:outline-none {state.counterMode ? 'opacity-80 cursor-default' : ''}">
              {#if !state.partners?.length}<option value="">No partners</option>{/if}
              {#each state.partners || [] as p}
                <option value={p.id} selected={state.selectedPartnerIdx === p.id}>{p.name}</option>
              {/each}
            </select>
          </div>
        </div>
        <div class="text-xs font-bold text-slate-400 mb-1.5">Select partner cities to receive:</div>
        <div id="trade-req-props" class="space-y-1.5 max-h-56 overflow-y-auto flex-1 pr-1.5 pb-6 overscroll-contain">
          {#each state.partnerProperties || [] as prop}
            <label class="flex items-center justify-between p-2 rounded-xl border border-slate-700/60 bg-slate-800/70 hover:bg-slate-700/80 cursor-pointer transition-all duration-150 hover:-translate-y-0.5 select-none group {selectedReqIds.has(prop.id) ? '!border-amber-400/80 !bg-amber-950/40' : ''}">
              <div class="flex items-center gap-2 min-w-0">
                <input type="checkbox" class="trade-their-prop accent-amber-400 w-4 h-4 rounded cursor-pointer shrink-0" value={prop.id} checked={selectedReqIds.has(prop.id)} onchange={(e) => toggleReqProp(prop.id, e.currentTarget.checked)} />
                <span class="w-2.5 h-2.5 rounded-full shrink-0 border border-black/30" style="background-color: {prop.color};"></span>
                <span class="font-bold text-xs text-slate-100 truncate group-hover:text-white">{prop.name}</span>
              </div>
              <span class="text-[11px] font-extrabold font-mono text-amber-400 shrink-0">{prop.rentFormatted}</span>
            </label>
          {/each}
          {#if !state.partnerProperties?.length}
            <div class="text-xs font-bold text-slate-500 py-6 text-center">No partner cities</div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Live Trade Value Delta Capsule -->
    <div class="mx-3.5 sm:mx-4 my-1 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-white/10 flex items-center justify-between text-xs font-bold">
      <div class="flex items-center gap-1.5 text-slate-300">
        <span class="text-xs uppercase text-slate-400 font-extrabold">Value Balance:</span>
        <span class="font-mono text-sky-300">${fmtVal(totalOfferVal)}</span>
        <span class="text-slate-500">⇄</span>
        <span class="font-mono text-amber-300">${fmtVal(totalReqVal)}</span>
      </div>
      <div class="text-xs font-black font-mono">
        {#if valDelta > 0}
          <span class="text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-md">+{fmtVal(valDelta)} In Your Favor</span>
        {:else if valDelta < 0}
          <span class="text-rose-400 bg-rose-950/60 border border-rose-500/40 px-2 py-0.5 rounded-md">-{fmtVal(Math.abs(valDelta))} Deficit</span>
        {:else}
          <span class="text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">Equal Value</span>
        {/if}
      </div>
    </div>

    <!-- Counter banner if active -->
    <div id="trade-counter-banner" class="hidden mx-3.5 sm:mx-4 mb-2 p-3 bg-gradient-to-r from-amber-950/90 to-yellow-950/90 border border-amber-400/60 rounded-2xl shadow-inner text-center space-y-1.5">
      <div class="flex items-center justify-center gap-1.5 font-black text-xs text-amber-300 uppercase tracking-wide">
        <span id="counter-offer-title">⚡ Partner Counter-Offer</span>
      </div>
      <div id="counter-offer-desc" class="text-xs text-amber-100 font-semibold leading-relaxed"></div>
      <div class="flex gap-2 pt-0.5 max-w-xs mx-auto">
        <button onclick={() => window.acceptTradeCounterOffer?.()} class="game-btn game-btn-green flex-1 py-1.5 text-xs font-black shadow-md">
          Accept Counter
        </button>
        <button onclick={() => window.rejectTradeCounterOffer?.()} class="game-btn game-btn-slate flex-1 py-1.5 text-xs font-black shadow-md">
          Decline
        </button>
      </div>
    </div>

    <!-- Status banner -->
    <div id="trade-status-msg" class="mx-3.5 sm:mx-4 p-2 rounded-xl bg-slate-900 border border-amber-400/40 text-xs font-bold text-amber-300 text-center {state.statusMessage ? '' : 'hidden'}">
      {state.statusMessage || ''}
    </div>

    <!-- Footer -->
    <div class="p-3.5 sm:p-4 bg-slate-900/95 border-t border-white/10 flex items-center justify-between">
      <button onclick={onClose} class="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer">
        Cancel
      </button>
      <button id="btn-send-trade-offer" onclick={onSendOffer} disabled={state.isWaiting} class="game-btn game-btn-green py-2 px-5 text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-lg {state.isWaiting ? 'opacity-50 cursor-not-allowed' : ''}">
        <i class="fa-solid fa-handshake"></i>
        <span>{state.isWaiting ? 'Waiting for Response...' : (state.counterMode ? 'Send Counter-Offer' : 'Send Trade Offer')}</span>
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
