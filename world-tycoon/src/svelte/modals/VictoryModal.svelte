<script>
  import { modalStore } from '../stores/modalStore.js';

  let state = $state({});
  modalStore.subscribe(val => { state = val.victory || {}; });

  function onReturnLobby() {
    window.handleReturnToLobbyFromVictory?.();
  }

  function onPlayAgain() {
    window.handlePlayAgainAction?.();
  }

  function onOpenWardrobe() {
    window.openWardrobeModal?.();
  }
</script>

<div id="modal-victory" class="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[9999] items-center justify-center p-3 sm:p-5 overflow-y-auto overscroll-contain {state.visible ? 'flex' : 'hidden'}">
  <!-- Rotating Radiant Sunburst Background -->
  <div class="fixed inset-0 flex items-center justify-center pointer-events-none opacity-20">
    <div class="w-[640px] h-[640px] sm:w-[860px] sm:h-[860px] rounded-full victory-sunburst animate-spin-slow"></div>
  </div>

  <!-- Victory Celebration Card -->
  <div id="victory-card" class="relative bg-white/95 backdrop-blur-xl border-4 border-amber-400 rounded-3xl max-w-md w-full max-h-[92vh] overflow-hidden shadow-[0_0_60px_rgba(245,158,11,0.45)] transform flex flex-col z-10 victory-card-animate my-auto">
    <!-- Grand Banner Header (Clean & Vibrant, No Empty Void) -->
    <div class="relative px-5 py-4 text-center text-white overflow-hidden bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-500 shadow-sm flex-shrink-0">
      <!-- Watermark icons -->
      <svg class="ui-watermark -right-3 -top-3 w-24 h-24 text-white/10 pointer-events-none" aria-hidden="true"><use href="#icon-crown"></use></svg>
      <svg class="ui-watermark -left-3 -bottom-3 w-24 h-24 text-white/10 pointer-events-none" aria-hidden="true"><use href="#icon-sparkle"></use></svg>

      <!-- Trophy + Sparkles -->
      <div class="relative inline-block my-0.5">
        <span class="text-5xl sm:text-6xl block filter trophy-glow select-none animate-bounce">🏆</span>
        <span class="absolute -top-1 -right-2 text-xl animate-ping select-none">✨</span>
        <span class="absolute -bottom-1 -left-2 text-lg animate-pulse select-none">⭐</span>
      </div>

      <h2 id="victory-title" class="font-rounded font-black text-2xl sm:text-3xl text-white tracking-wide drop-shadow-md">
        {state.title || 'VICTORY!'}
      </h2>

      <!-- Victory Condition Pill -->
      <div class="inline-flex items-center gap-1.5 px-3 py-0.5 mt-1.5 rounded-full bg-black/25 backdrop-blur-sm text-[11px] font-black uppercase tracking-wider text-amber-100 border border-white/20 shadow-xs">
        <span>{state.accoladeIcon || '👑'}</span>
        <span>{state.accoladeTitle || 'GLOBAL CHAMPION'}</span>
      </div>
    </div>

    <!-- Body Container -->
    <div class="p-3.5 sm:p-4 space-y-3 overflow-y-auto flex-1">
      <!-- Winner 3-Column Bento Grid -->
      <div class="grid grid-cols-3 gap-2">
        <div class="bg-gradient-to-b from-amber-50/80 to-amber-100/60 border border-amber-300/80 rounded-2xl p-2.5 text-center shadow-2xs">
          <div class="text-[10px] font-black text-amber-900/70 uppercase tracking-wider">Net Worth</div>
          <div class="font-rounded font-black text-base sm:text-lg text-amber-700 mt-0.5 truncate">
            {state.winnerNetWorthFormatted || state.finalCashFormatted || '$0'}
          </div>
        </div>

        <div class="bg-gradient-to-b from-emerald-50/80 to-emerald-100/60 border border-emerald-300/80 rounded-2xl p-2.5 text-center shadow-2xs">
          <div class="text-[10px] font-black text-emerald-900/70 uppercase tracking-wider">Final Cash</div>
          <div class="font-rounded font-black text-base sm:text-lg text-emerald-600 mt-0.5 truncate">
            {state.finalCashFormatted || '$0'}
          </div>
        </div>

        <div class="bg-gradient-to-b from-indigo-50/80 to-indigo-100/60 border border-indigo-300/80 rounded-2xl p-2.5 text-center shadow-2xs">
          <div class="text-[10px] font-black text-indigo-900/70 uppercase tracking-wider">Empire</div>
          <div class="font-rounded font-black text-base sm:text-lg text-indigo-600 mt-0.5 truncate">
            {state.empireCitiesCount || '0 Cities'}
          </div>
        </div>
      </div>

      <!-- Match Standings Leaderboard -->
      <div class="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 shadow-2xs space-y-2">
        <div class="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center justify-between px-0.5">
          <span class="flex items-center gap-1.5">
            <i class="fa-solid fa-ranking-star text-amber-500"></i> Match Standings
          </span>
          <span class="text-[10px] text-slate-600 font-extrabold uppercase">Final Worth</span>
        </div>

        <div class="space-y-1.5">
          {#each state.standings || [] as player (player.id)}
            <div class="flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-colors {player.isWinner ? 'bg-amber-100/70 border-amber-300 font-black text-slate-900 shadow-2xs' : (player.bankrupt ? 'bg-rose-50/50 border-rose-200 text-rose-700/80' : 'bg-white border-slate-200 text-slate-800')}">
              <!-- Left: Rank & Player identity -->
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-sm select-none w-5 text-center">{player.medal}</span>
                <span class="w-3 h-3 rounded-full flex-shrink-0 shadow-xs border border-white" style="background-color: {player.colorHex}"></span>
                <span class="text-xs font-black truncate max-w-[120px] sm:max-w-[150px]">{player.name}</span>
                {#if player.isWinner}
                  <span class="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-amber-500 text-white shadow-2xs">WIN</span>
                {/if}
              </div>

              <!-- Right: Cities & Net Worth -->
              <div class="flex items-center gap-2.5 flex-shrink-0">
                <span class="text-[11px] font-extrabold text-slate-500 tabular-nums">
                  {player.citiesCount} <span class="text-[9px]">🏙️</span>
                </span>
                <span class="text-xs font-black tabular-nums {player.bankrupt ? 'text-rose-600 italic' : (player.isWinner ? 'text-amber-800' : 'text-slate-700')}">
                  {player.bankrupt ? 'BANKRUPT' : player.netWorthFormatted}
                </span>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Tycoon Star Rewards Pill Card -->
      <div id="victory-reward-card" class="bg-gradient-to-r from-amber-50/90 to-yellow-50/90 border border-amber-300/80 rounded-2xl p-2.5 px-3 flex items-center justify-between shadow-2xs">
        <div class="flex items-center gap-2">
          <span class="text-xl select-none">⭐</span>
          <div>
            <div class="text-[10px] font-black text-amber-950 uppercase tracking-wider">Tycoon Stars</div>
            <div class="text-xs font-extrabold text-amber-900">
              Total: <span class="font-black text-slate-900 tabular-nums">{state.totalBalanceStars || '500 ⭐'}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="font-rounded font-black text-base text-amber-600 tabular-nums">
            {state.starsEarned || '+0 ⭐'}
          </span>
          <button onclick={onOpenWardrobe} class="px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] shadow-2xs border border-amber-500/30 flex items-center gap-1 cursor-pointer transition-transform active:scale-95" title="Open Wardrobe & customize character">
            <span>👔 Wardrobe</span>
          </button>
        </div>
      </div>

      <!-- Multiplayer Status Banner (if active) -->
      {#if state.multiplayerStatus}
        <div id="victory-multiplayer-status" class="text-xs font-bold text-center py-2 px-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 shadow-2xs">
          {state.multiplayerStatus}
        </div>
      {/if}
    </div>

    <!-- Action Footer (Buttons) -->
    <div class="p-3 sm:p-3.5 border-t border-slate-100 bg-white/95 flex-shrink-0 grid grid-cols-2 gap-2.5 shadow-inner">
      <button id="btn-victory-lobby" onclick={onReturnLobby} class="py-2.5 px-3 rounded-2xl font-rounded font-black text-sm text-sky-800 bg-sky-50 hover:bg-sky-100 border-2 border-sky-300 shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-[transform,background-color,box-shadow] duration-150 ease-out hover:scale-[1.02] enabled:active:scale-[0.96]" title="Return to Table Lobby with all players">
        <i class="fa-solid fa-users text-sky-600 text-sm"></i>
        <span>LOBBY</span>
      </button>

      <button id="btn-victory-play-again" onclick={onPlayAgain} disabled={state.playAgainDisabled} class="game-btn game-btn-green py-2.5 px-3 text-sm font-black shadow-lg flex items-center justify-center gap-2 group hover:scale-[1.02] enabled:active:scale-[0.96] transition-[transform,box-shadow,filter] duration-150 ease-out" title="Start immediate rematch">
        <i class="fa-solid fa-rotate-right text-sm group-hover:rotate-45 transition-transform"></i>
        <span id="btn-victory-play-again-text">{state.playAgainText || 'PLAY AGAIN'}</span>
      </button>
    </div>
  </div>
</div>
