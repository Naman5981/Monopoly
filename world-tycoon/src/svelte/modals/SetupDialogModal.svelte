<script>
  /**
   * svelte/modals/SetupDialogModal.svelte
   * Declarative legacy setup dialog modal.
   */
  import { modalStore } from '../stores/modalStore.js';
  import { lobbyPlayerCount, setLobbyPlayerCount } from '../../game/state.js';
  import { PLAYER_THEMES } from '../../game/data.js';
  import { networkState } from '../../network/p2p.js';

  let state = $state({});
  modalStore.subscribe(val => { state = val.setup || {}; });

  function setLobbyCount(cnt) {
    if (typeof window !== 'undefined' && typeof window.setLobbyCount === 'function') {
      window.setLobbyCount(cnt);
    } else {
      setLobbyPlayerCount(cnt);
    }
  }

  function startMatch() {
    if (typeof window !== 'undefined' && typeof window.startNewMatch === 'function') {
      window.startNewMatch();
    }
  }

  function setPlayerName(idx, val) {
    if (typeof window !== 'undefined' && typeof window.setPlayerSetupName === 'function') {
      window.setPlayerSetupName(idx, val);
    }
  }
</script>

<div id="modal-setup" class="{state.visible ? 'flex' : 'hidden'} fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 items-center justify-center p-4 overscroll-contain">
  <div class="game-modal-shell modal-shell-indigo max-w-md w-full overflow-hidden shadow-2xl flex flex-col">
    <!-- Grand Banner Header (Victory Style) -->
    <div class="game-modal-header bg-gradient-to-r from-sky-600 to-indigo-700 p-5 text-white relative overflow-hidden flex items-center gap-3.5 shadow-md">
      <!-- Floating Watermark Icons -->
      <svg class="ui-watermark -right-3 -top-3 w-28 h-28 text-white/10" aria-hidden="true"><use href="#icon-globe"></use></svg>
      <svg class="ui-watermark -left-3 -bottom-3 w-28 h-28 text-white/10" aria-hidden="true"><use href="#icon-dice"></use></svg>

      <div class="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-2xl shadow-inner text-white relative z-10">
        <svg class="ui-icon w-6 h-6 text-white" aria-hidden="true"><use href="#icon-globe"></use></svg>
      </div>
      <div class="relative z-10">
        <div class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-sky-100 shadow-xs mb-1 border border-white/20">
          <svg class="ui-icon w-3 h-3 text-sky-200" aria-hidden="true"><use href="#icon-dice"></use></svg> MULTIPLAYER LOBBY
        </div>
        <h2 class="font-rounded font-black text-xl sm:text-2xl text-white tracking-wide drop-shadow-md">
          WORLD TYCOON LOBBY
        </h2>
        <p class="text-xs font-bold text-sky-100 drop-shadow mt-0.5">3D Isometric World Cities Monopoly</p>
      </div>
    </div>

    <div class="p-5 space-y-4 bg-gradient-to-b from-white to-slate-50/70">
      <div class="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border-2 border-slate-200">
        <span class="text-xs font-black text-slate-700">Number of Players</span>
        <div class="flex gap-1.5 flex-wrap">
          {#each [2, 3, 4, 5, 6] as cnt}
            <button
              onclick={() => setLobbyCount(cnt)}
              id="lobby-cnt-{cnt}"
              class="px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer border-2 {lobbyPlayerCount === cnt ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}"
            >
              {cnt}P
            </button>
          {/each}
        </div>
      </div>
      <div id="lobby-players-list" class="space-y-2">
        {#each Array(lobbyPlayerCount) as _, i}
          {@const th = PLAYER_THEMES[i] || { name: `PLAYER ${i + 1}`, colorHex: '#3b82f6', isAI: i > 0 }}
          <div class="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-2xl border border-slate-200">
            <div class="flex items-center gap-2">
              <span class="w-3.5 h-3.5 rounded-full" style="background:{th.colorHex}"></span>
              <input
                type="text"
                value={th.name}
                oninput={(e) => setPlayerName(i, e.target.value)}
                class="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-extrabold w-28 uppercase"
              />
            </div>
            <span class="text-xs font-bold text-slate-500">
              {i === (networkState?.isMultiplayer ? networkState.localPlayerIdx : 0) ? 'Human (YOU)' : (th.isAI ? 'Smart AI Bot' : 'Player')}
            </span>
          </div>
        {/each}
      </div>
      <button onclick={startMatch} class="game-btn game-btn-green w-full py-4 text-sm font-black shadow-md">
        <svg class="ui-icon w-4 h-4 mr-1.5 text-white" aria-hidden="true"><use href="#icon-play"></use></svg> START MATCH (2M STARTING CASH)
      </button>
    </div>
  </div>
</div>
