<script>
  /**
   * svelte/debug/DebugDrawer.svelte
   * Pure declarative Svelte 5 Developer & QA Suite panel.
   * Replaces 1,000+ lines of imperative DOM string template injection.
   */
  import { debugStore, updateDebugStore, toggleDebugStoreVisible, setDebugStoreTab } from '../stores/debugStore.js';
  import { BOARD_TILES, GROUP_META, CHANCE_WHEEL_PRIZES } from '../../game/data.js';
  import { gameState, debugState } from '../../game/state.js';
  import { fmtMoney } from '../../game/utils.js';
  import { calculateTileRent } from '../../game/rules.js';
  import {
    debugRoll,
    debugTeleport,
    debugSetPropertyOwner,
    debugSetPropertyLevel,
    debugToggleFestivalBoost,
    debugGrantMonopoly,
    debugClearGroup,
    debugAdjustCash,
    debugSetCash,
    debugToggleIsland,
    debugForceTurn,
    debugAdvanceTurn,
    debugToggleFreezeAI,
    debugTriggerChancePrize,
    debugAdjustFestivalPot,
    debugTriggerFestivalJackpot,
    debugTriggerVictory
  } from '../../game/debug/actions.js';
  import { debugRunScenario } from '../../game/debug/scenarios.js';

  let state = $state({});
  debugStore.subscribe(val => { state = val; });

  const purchasableTiles = BOARD_TILES.filter(t => t.type === 'city' || t.type === 'resort');
  const groupKeys = Object.keys(GROUP_META);

  // Derived state calculations
  let currPlayer = $derived(
    gameState?.players && gameState.players[gameState.currentPlayerIdx]
      ? gameState.players[gameState.currentPlayerIdx]
      : { name: 'Player 0', isAI: false }
  );

  let selectedPropState = $derived(
    gameState?.properties && gameState.properties[state.selectedPropId]
      ? gameState.properties[state.selectedPropId]
      : { owner: null, level: 0, festivalBoost: false }
  );

  let selectedPlayerState = $derived(
    gameState?.players && gameState.players[state.selectedPlayerIdx]
      ? gameState.players[state.selectedPlayerIdx]
      : { cash: 0, position: 0, inIsland: false, islandTurns: 0, bankrupt: false, isAI: false, name: 'Player' }
  );

  function handleRoll() {
    debugRoll(Number(state.forcedD1), Number(state.forcedD2));
  }

  function handleTeleport() {
    debugTeleport(gameState?.currentPlayerIdx ?? 0, Number(state.selectedTileId), true);
  }

  function handleToggleFreeze() {
    debugToggleFreezeAI();
    updateDebugStore({ freezeAI: Boolean(debugState?.freezeAI) });
  }

  function handleSetPropOwner(ownerIdx) {
    debugSetPropertyOwner(Number(state.selectedPropId), ownerIdx, false);
    updateDebugStore({});
  }

  function handleSetPropLevel(level) {
    debugSetPropertyLevel(Number(state.selectedPropId), level);
    updateDebugStore({});
  }

  function handleToggleBoost() {
    debugToggleFestivalBoost(Number(state.selectedPropId));
    updateDebugStore({});
  }

  function handleMonopoly() {
    debugGrantMonopoly(state.selectedGroup, Number(state.selectedPlayerIdx), 2);
    updateDebugStore({});
  }

  function handleClearGroup() {
    debugClearGroup(state.selectedGroup);
    updateDebugStore({});
  }

  function handleAdjustCash(amount) {
    debugAdjustCash(Number(state.selectedPlayerIdx), amount);
    updateDebugStore({});
  }

  function handleSetCash() {
    debugSetCash(Number(state.selectedPlayerIdx), Number(state.cashInput));
    updateDebugStore({});
  }

  function handleToggleIsland() {
    debugToggleIsland(Number(state.selectedPlayerIdx));
    updateDebugStore({});
  }

  function handleTriggerChance() {
    debugTriggerChancePrize(Number(state.selectedChancePrize), gameState?.currentPlayerIdx ?? 0);
  }

  function handleAdjustPot(amount) {
    debugAdjustFestivalPot(amount);
    updateDebugStore({});
  }

  function handleScenario(name) {
    debugRunScenario(name);
    updateDebugStore({});
  }
</script>

<div
  id="debug-suite-panel"
  class="{state.visible ? 'flex' : 'hidden'} fixed top-12 right-3 z-[1400] w-[460px] max-w-[96vw] max-h-[88vh] bg-slate-950/95 backdrop-blur-xl border-2 border-amber-400/80 rounded-3xl shadow-2xl text-slate-100 flex-col overflow-hidden select-none font-sans text-xs"
  style="display: {state.visible ? 'flex' : 'none'};"
>
  <!-- 1. Header Bar -->
  <div class="p-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
    <div class="flex items-center gap-2">
      <div class="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm shadow">
        <i class="fa-solid fa-bug"></i>
      </div>
      <div>
        <div class="font-black text-sm text-amber-300 tracking-wide flex items-center gap-2">
          DEV & QA SUITE
          <span class="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 font-mono">v2.0.0</span>
        </div>
        <div id="debug-header-subtitle" class="text-[10px] text-slate-400 font-medium">
          <span>Turn: <strong>P{gameState?.currentPlayerIdx ?? 0} ({currPlayer.name})</strong></span> •
          <span>Phase: <strong>{gameState?.phase ?? 'INIT'}</strong></span> •
          <span>{debugState?.freezeAI ? 'AI FROZEN' : 'AI Active'}</span>
        </div>
      </div>
    </div>
    <div class="flex items-center gap-1.5">
      <button
        onclick={handleToggleFreeze}
        class="px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer transition border {debugState?.freezeAI ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-slate-800 text-slate-300 border-slate-700'}"
        title="Toggle AI Automation Pause"
      >
        <span id="quick-freeze-label">{debugState?.freezeAI ? 'Resume AI' : 'Freeze AI'}</span>
      </button>
      <button
        onclick={() => toggleDebugStoreVisible(false)}
        class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition"
        title="Close Panel (~ or F2)"
      >
        <i class="fa-solid fa-xmark text-xs"></i>
      </button>
    </div>
  </div>

  <!-- 2. Tab Navigation Bar -->
  <div class="flex items-center gap-1 p-2 bg-slate-900/90 border-b border-slate-800 shrink-0 overflow-x-auto">
    <button
      id="debug-tab-btn-dice"
      onclick={() => setDebugStoreTab('dice')}
      class="flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1 text-[11px] font-bold {state.activeTab === 'dice' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}"
    >
      🎲 Dice
    </button>
    <button
      id="debug-tab-btn-props"
      onclick={() => setDebugStoreTab('props')}
      class="flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1 text-[11px] font-bold {state.activeTab === 'props' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}"
    >
      🏙️ Props
    </button>
    <button
      id="debug-tab-btn-players"
      onclick={() => setDebugStoreTab('players')}
      class="flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1 text-[11px] font-bold {state.activeTab === 'players' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}"
    >
      👤 Players
    </button>
    <button
      id="debug-tab-btn-events"
      onclick={() => setDebugStoreTab('events')}
      class="flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1 text-[11px] font-bold {state.activeTab === 'events' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}"
    >
      ⚡ Events
    </button>
    <button
      id="debug-tab-btn-scenarios"
      onclick={() => setDebugStoreTab('scenarios')}
      class="flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1 text-[11px] font-bold {state.activeTab === 'scenarios' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}"
    >
      🧪 Scenarios
    </button>
  </div>

  <!-- 3. Tab Contents Area -->
  <div class="p-3.5 space-y-3 flex-1 overflow-y-auto">
    <!-- TAB 1: DICE & TURNS -->
    {#if state.activeTab === 'dice'}
      <div id="debug-tab-content-dice" class="space-y-3">
        <div class="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-2">
          <span class="text-[10px] font-black uppercase text-amber-400 tracking-wider">🎲 Forced Dice Override</span>
          <div class="flex items-center gap-2">
            <select
              id="debug-d1"
              bind:value={state.forcedD1}
              class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 font-bold text-center"
            >
              {#each [1, 2, 3, 4, 5, 6] as d}
                <option value={d}>Die 1: {d}</option>
              {/each}
            </select>
            <select
              id="debug-d2"
              bind:value={state.forcedD2}
              class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 font-bold text-center"
            >
              {#each [1, 2, 3, 4, 5, 6] as d}
                <option value={d}>Die 2: {d}</option>
              {/each}
            </select>
            <button
              onclick={handleRoll}
              class="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black cursor-pointer shadow active:scale-95 transition"
            >
              Roll
            </button>
          </div>
          <div class="flex items-center gap-1.5 pt-1">
            <button
              onclick={() => { state.forcedD1 = 6; state.forcedD2 = 6; handleRoll(); }}
              class="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px]"
            >
              Double 6s
            </button>
            <button
              onclick={() => { state.forcedD1 = 1; state.forcedD2 = 1; handleRoll(); }}
              class="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px]"
            >
              Double 1s
            </button>
            <button
              onclick={() => debugAdvanceTurn(true)}
              class="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-[10px]"
            >
              Skip Turn ⏭
            </button>
          </div>
        </div>

        <div class="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-2">
          <span class="text-[10px] font-black uppercase text-sky-400 tracking-wider">🚀 Teleport Player</span>
          <div class="flex items-center gap-2">
            <select
              id="debug-teleport-tile"
              bind:value={state.selectedTileId}
              class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 font-bold"
            >
              {#each BOARD_TILES as t}
                <option value={t.id}>[{t.id}] {t.group ? `[${t.group.toUpperCase()}] ` : ''}{t.name} {t.type ? `(${t.type.toUpperCase()})` : ''}</option>
              {/each}
            </select>
            <button
              onclick={handleTeleport}
              class="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-black cursor-pointer shadow active:scale-95 transition"
            >
              Go
            </button>
          </div>
        </div>
      </div>

    <!-- TAB 2: PROPERTIES -->
    {:else if state.activeTab === 'props'}
      <div id="debug-tab-content-props" class="space-y-3">
        <div class="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-2">
          <span class="text-[10px] font-black uppercase text-amber-400 tracking-wider">Select Property</span>
          <select
            id="debug-prop-select"
            bind:value={state.selectedPropId}
            class="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 font-bold"
          >
            {#each purchasableTiles as t}
              <option value={t.id}>{t.group ? `[${t.group.toUpperCase()}] ` : '[RESORT] '}{t.name} ({fmtMoney(t.price)})</option>
            {/each}
          </select>

          <div class="grid grid-cols-2 gap-2 p-2 bg-slate-950 rounded-xl text-[10px]">
            <div>Owner: <span id="debug-prop-val-owner" class="font-bold text-amber-300">{selectedPropState.owner !== null ? `P${selectedPropState.owner}` : 'Bank'}</span></div>
            <div>Level: <span id="debug-prop-val-level" class="font-bold text-sky-300">{selectedPropState.level}</span></div>
            <div>Rent: <span id="debug-prop-val-rent" class="font-bold text-emerald-300">{fmtMoney(calculateTileRent(state.selectedPropId))}</span></div>
            <div>Status: <span id="debug-prop-val-status" class="font-bold text-indigo-300">{selectedPropState.festivalBoost ? '2× BOOSTED' : 'Normal'}</span></div>
          </div>

          <div class="flex items-center gap-1.5 pt-1 flex-wrap">
            <button
              onclick={() => handleSetPropOwner(gameState?.currentPlayerIdx ?? 0)}
              class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px]"
            >
              Give Active Player
            </button>
            <button
              onclick={() => handleSetPropOwner(-1)}
              class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px]"
            >
              Make Bank
            </button>
            <button
              onclick={handleToggleBoost}
              class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px]"
            >
              Toggle 2× Boost
            </button>
          </div>

          <div class="flex items-center gap-1 pt-1">
            {#each [0, 1, 2, 3, 4] as lvl}
              <button
                onclick={() => handleSetPropLevel(lvl)}
                class="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px]"
              >
                Lvl {lvl}
              </button>
            {/each}
          </div>
        </div>

        <div class="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-2">
          <span class="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Group Monopoly Actions</span>
          <div class="flex items-center gap-2">
            <select
              id="debug-monopoly-group"
              bind:value={state.selectedGroup}
              class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 font-bold"
            >
              {#each groupKeys as k}
                <option value={k}>{GROUP_META[k].name} ({k.toUpperCase()})</option>
              {/each}
            </select>
            <button
              onclick={handleMonopoly}
              class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black"
            >
              Monopoly
            </button>
            <button
              onclick={handleClearGroup}
              class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

    <!-- TAB 3: PLAYERS -->
    {:else if state.activeTab === 'players'}
      <div id="debug-tab-content-players" class="space-y-3">
        <div class="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-2">
          <span class="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Select Player</span>
          <select
            id="debug-player-select"
            bind:value={state.selectedPlayerIdx}
            class="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 font-bold"
          >
            {#each (gameState?.players || []) as p, idx}
              <option value={idx}>P{idx}: {p.name} {p.isAI ? '(AI)' : '(YOU)'}</option>
            {/each}
          </select>

          <div class="grid grid-cols-2 gap-2 p-2 bg-slate-950 rounded-xl text-[10px]">
            <div>Cash: <span id="debug-player-val-cash" class="font-bold text-emerald-300">{fmtMoney(selectedPlayerState.cash)}</span></div>
            <div>Pos: <span id="debug-player-val-pos" class="font-bold text-sky-300">{selectedPlayerState.position}</span></div>
            <div>Island: <span id="debug-player-val-island" class="font-bold text-amber-300">{selectedPlayerState.inIsland ? 'YES' : 'No'}</span></div>
            <div>Type: <span id="debug-player-val-type" class="font-bold text-indigo-300">{selectedPlayerState.bankrupt ? 'BANKRUPT' : (selectedPlayerState.isAI ? 'AI' : 'Human')}</span></div>
          </div>

          <div class="flex items-center gap-2 pt-1">
            <input
              type="number"
              bind:value={state.cashInput}
              step="100000"
              class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 font-mono text-center font-bold"
            />
            <button
              onclick={handleSetCash}
              class="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black"
            >
              Set Cash
            </button>
          </div>

          <div class="flex items-center gap-1.5 pt-1">
            <button
              onclick={() => handleAdjustCash(500000)}
              class="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-[10px]"
            >
              +$500k
            </button>
            <button
              onclick={() => handleAdjustCash(-500000)}
              class="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold text-[10px]"
            >
              -$500k
            </button>
            <button
              onclick={handleToggleIsland}
              class="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-[10px]"
            >
              Toggle Island
            </button>
            <button
              onclick={() => debugForceTurn(Number(state.selectedPlayerIdx))}
              class="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-[10px]"
            >
              Force Turn
            </button>
          </div>
        </div>
      </div>

    <!-- TAB 4: EVENTS & JACKPOTS -->
    {:else if state.activeTab === 'events'}
      <div id="debug-tab-content-events" class="space-y-3">
        <div class="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-2">
          <span class="text-[10px] font-black uppercase text-amber-400 tracking-wider">🎲 Chance Card Wheel Prize</span>
          <div class="flex items-center gap-2">
            <select
              id="debug-chance-prize-select"
              bind:value={state.selectedChancePrize}
              class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 font-bold"
            >
              {#each CHANCE_WHEEL_PRIZES as p, idx}
                <option value={idx}>{p.label} - {p.desc}</option>
              {/each}
            </select>
            <button
              onclick={handleTriggerChance}
              class="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black"
            >
              Trigger
            </button>
          </div>
        </div>

        <div class="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-2">
          <span class="text-[10px] font-black uppercase text-emerald-400 tracking-wider">🎪 World Festival Jackpot Pot</span>
          <div class="flex items-center justify-between text-xs">
            <span>Current Pot:</span>
            <span id="debug-festival-pot-val" class="font-black text-amber-300">{fmtMoney(gameState?.festivalPot || 0)}</span>
          </div>
          <div class="flex items-center gap-1.5 pt-1">
            <button
              onclick={() => handleAdjustPot(500000)}
              class="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-[10px]"
            >
              +$500k Pot
            </button>
            <button
              onclick={() => handleAdjustPot(2000000)}
              class="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-[10px]"
            >
              +$2M Mega Pot
            </button>
            <button
              onclick={() => debugTriggerFestivalJackpot(gameState?.currentPlayerIdx ?? 0)}
              class="flex-1 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[10px]"
            >
              Win Jackpot!
            </button>
          </div>
        </div>

        <button
          onclick={() => debugTriggerVictory(gameState?.currentPlayerIdx ?? 0)}
          class="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs cursor-pointer shadow active:scale-98 transition"
        >
          🏆 Instant Victory Trigger
        </button>
      </div>

    <!-- TAB 5: SCENARIOS -->
    {:else if state.activeTab === 'scenarios'}
      <div id="debug-tab-content-scenarios" class="space-y-2">
        <span class="text-[10px] font-black uppercase text-indigo-400 tracking-wider">1-Click QA Test Scenarios</span>
        <button
          onclick={() => handleScenario('monopolyShowdown')}
          class="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left font-bold text-sky-300 flex items-center justify-between"
        >
          <span>👑 Monopoly Showdown (P0 vs P1 sets)</span>
          <i class="fa-solid fa-chevron-right text-xs"></i>
        </button>
        <button
          onclick={() => handleScenario('hostileBuyoutReady')}
          class="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left font-bold text-amber-300 flex items-center justify-between"
        >
          <span>⚔️ Hostile Buyout Scenario</span>
          <i class="fa-solid fa-chevron-right text-xs"></i>
        </button>
        <button
          onclick={() => handleScenario('auctionFrenzy')}
          class="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left font-bold text-emerald-300 flex items-center justify-between"
        >
          <span>🔨 Auction Frenzy (Bank Liquidations)</span>
          <i class="fa-solid fa-chevron-right text-xs"></i>
        </button>
        <button
          onclick={() => handleScenario('debtCrisis')}
          class="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left font-bold text-rose-300 flex items-center justify-between"
        >
          <span>💸 Debt Crisis & Sell Cities</span>
          <i class="fa-solid fa-chevron-right text-xs"></i>
        </button>
        <button
          onclick={() => handleScenario('cleanSlate')}
          class="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left font-bold text-slate-300 flex items-center justify-between"
        >
          <span>🧹 Clean Slate (Reset Properties)</span>
          <i class="fa-solid fa-chevron-right text-xs"></i>
        </button>
      </div>
    {/if}
  </div>
</div>
