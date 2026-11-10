<script>
  import { modalStore } from '../stores/modalStore.js';

  let state = $state({});
  modalStore.subscribe(val => { state = val.trade || {}; });

  function onClose() {
    window.closeTradeModal?.();
  }

  function onSendOffer() {
    window.executeTradeOffer?.();
  }

  function onPartnerChange(e) {
    const sel = document.getElementById('trade-partner-select');
    if (sel) {
      sel.value = e.target.value;
      window.populateTradePartnerProps?.();
    }
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
                <input type="checkbox" class="trade-my-prop" value={prop.id} checked={state.selectedMyProps?.includes(prop.id)} />
                <span class="w-3 h-3 rounded-full" style="background-color: {prop.color};"></span>
                <span class="font-bold text-xs text-slate-800">{prop.name}</span>
              </div>
              <span class="text-[11px] font-black text-slate-500">{prop.rentFormatted}</span>
            </label>
          {/each}
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
              {#each state.partners || [] as p}
                <option value={p.id}>{p.name}</option>
              {/each}
            </select>
          </div>
        </div>
        <div class="text-xs font-black text-slate-700 mb-1.5">Partner Cities to Receive:</div>
        <div id="trade-req-props" class="space-y-1.5 max-h-56 overflow-y-auto flex-1 pr-1 overscroll-contain">
          {#each state.partnerProperties || [] as prop}
            <label class="flex items-center justify-between p-2 rounded-xl border border-slate-200 bg-white hover:bg-amber-50 cursor-pointer transition">
              <div class="flex items-center gap-2">
                <input type="checkbox" class="trade-their-prop" value={prop.id} checked={state.selectedPartnerProps?.includes(prop.id)} />
                <span class="w-3 h-3 rounded-full" style="background-color: {prop.color};"></span>
                <span class="font-bold text-xs text-slate-800">{prop.name}</span>
              </div>
              <span class="text-[11px] font-black text-slate-500">{prop.rentFormatted}</span>
            </label>
          {/each}
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

<!-- Incoming Proactive Bot Trade Proposal Modal -->
<div id="modal-incoming-trade" class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 items-center justify-center p-4 overscroll-contain {state.incomingTrade?.visible ? 'flex' : 'hidden'}">
  <div class="game-modal-shell modal-shell-indigo max-w-lg w-full flex flex-col overflow-hidden shadow-2xl">
    <div class="game-modal-header bg-gradient-to-r from-sky-600 via-indigo-600 to-indigo-700 p-5 text-white relative overflow-hidden flex items-center justify-between shadow-md">
      <div class="relative z-10 flex items-center gap-3.5">
        <div class="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-2xl shadow-inner text-white">
          🤝
        </div>
        <div>
          <div class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-indigo-100 shadow-xs mb-1 border border-white/20">
            DIPLOMATIC PROPOSAL
          </div>
          <h3 class="font-rounded font-black text-xl sm:text-2xl text-white tracking-wide drop-shadow-md flex items-center gap-2">
            <span id="incoming-trade-bot-name">{state.incomingTrade?.botName || 'OPPONENT'}</span>
            <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-xs">OFFER</span>
          </h3>
          <p class="text-xs font-bold text-sky-100 drop-shadow mt-0.5">
            Strategic real estate exchange proposal
          </p>
        </div>
      </div>

      <button onclick={onDeclineIncoming} class="relative z-10 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition shadow-xs border border-white/30" title="Decline trade">
        ✕
      </button>
    </div>

    <div class="p-5 space-y-4 bg-gradient-to-b from-white to-slate-50/70 flex-1 overflow-y-auto">
      <div class="grid grid-cols-2 gap-3 text-xs">
        <div class="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 flex-col items-start text-left">
          <span class="text-[10px] font-black tracking-wider uppercase text-emerald-950 flex items-center gap-1.5">
            THEY OFFER
          </span>
          <div id="incoming-they-offer-props" class="w-full space-y-1 pt-1 font-bold text-slate-800">
            {#each state.incomingTrade?.theyOfferProps || [] as prop}
              <div class="text-xs font-black text-emerald-800">{prop.name}</div>
            {/each}
          </div>
        </div>

        <div class="p-3.5 rounded-2xl bg-sky-50 border-2 border-sky-300 flex-col items-start text-left">
          <span class="text-[10px] font-black tracking-wider uppercase text-sky-950 flex items-center gap-1.5">
            THEY REQUEST
          </span>
          <div id="incoming-they-req-props" class="w-full space-y-1 pt-1 font-bold text-slate-800">
            {#each state.incomingTrade?.theyReqProps || [] as prop}
              <div class="text-xs font-black text-sky-800">{prop.name}</div>
            {/each}
          </div>
        </div>
      </div>

      <div id="incoming-trade-rationale" class="text-xs text-slate-700 font-semibold bg-white p-3.5 rounded-2xl border-2 border-slate-200/80 shadow-xs text-center">
        {state.incomingTrade?.rationale || 'Fair economic property exchange proposed based on current board positions.'}
      </div>

      <div class="flex gap-2.5 pt-1">
        <button onclick={onAcceptIncoming} class="game-btn game-btn-green flex-1 py-3 text-xs sm:text-sm font-black shadow-xs">
          Accept Deal
        </button>
        <button onclick={onCounterIncoming} class="game-btn game-btn-orange flex-1 py-3 text-xs sm:text-sm font-black shadow-xs">
          Counter-Offer
        </button>
        <button onclick={onDeclineIncoming} class="game-btn game-btn-slate px-4 py-3 text-xs sm:text-sm font-black">
          Decline
        </button>
      </div>
    </div>
  </div>
</div>
