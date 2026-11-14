<script>
  import { lobbyStore } from '../stores/lobbyStore.js';

  export let variant;

  function copyInviteLink() { window.copyRoomInviteLink?.(); }
  function copyRoomCode() { window.copyRoomCodeOnly?.(); }
  function leaveRoom() { window.leaveP2PRoom?.(); }
  function startMatch() { window.startGameFromLandingPage?.(); }
</script>

{#if variant === 'room' && $lobbyStore.isRoomActive}
  <div id="mp-room-capsule" class="w-full rounded-2xl bg-white/95 border-2 border-sky-300 p-2.5 shadow-md flex flex-col items-center gap-2">
    <div class="flex items-center justify-between w-full">
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span class="text-xs font-black uppercase text-sky-900 tracking-wider">ROOM:</span>
        <strong class="font-mono text-base font-black text-slate-900">{$lobbyStore.roomCode || '----'}</strong>
      </div>
      <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase {$lobbyStore.isHost ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-sky-100 text-sky-800 border border-sky-300'}">
        {$lobbyStore.isHost ? 'HOST' : `PLAYER ${($lobbyStore.localPlayerIdx || 0) + 1}`}
      </span>
    </div>
    <div class="flex items-center gap-2 w-full">
      <button onclick={copyInviteLink} class="flex-1 py-1.5 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-700 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"><i class="fa-solid fa-link text-xs"></i> Copy Link</button>
      <button onclick={copyRoomCode} class="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"><i class="fa-solid fa-copy text-xs"></i> Code</button>
      <button onclick={leaveRoom} class="py-1.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-600 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"><i class="fa-solid fa-arrow-right-from-bracket text-xs"></i> Leave</button>
    </div>
  </div>
{:else if variant === 'badge' && $lobbyStore.isRoomActive}
  <span id="setup-p2p-badge" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-300"><span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><strong>{$lobbyStore.roomCode || '----'}</strong></span>
{:else if variant === 'status'}
  <span id="setup-p2p-status-text" class="text-xs font-bold {$lobbyStore.networkStatusKind === 'error' ? 'text-rose-600' : 'text-sky-600'}">{$lobbyStore.networkStatus}</span>
{:else if variant === 'portal'}
  <p id="portal-p2p-status-text" class="text-xs font-bold text-center min-h-[18px] {$lobbyStore.portalStatusKind === 'error' ? 'text-rose-500' : ($lobbyStore.portalStatusKind === 'loading' ? 'text-emerald-600' : 'text-slate-500')}">{$lobbyStore.portalStatus}</p>
{:else if variant === 'play'}
  {#if $lobbyStore.isTeamMode && !$lobbyStore.isTeamBalanceValid}
    <div class="team-balance-warning-pill w-full px-3 py-2 rounded-2xl bg-rose-50/95 border-2 border-rose-300 text-rose-800 text-xs font-black shadow-md flex items-center justify-center gap-1.5 animate-pulse text-center leading-tight">
      <i class="fa-solid fa-triangle-exclamation text-rose-600 text-sm flex-shrink-0"></i>
      <span>{$lobbyStore.teamBalanceError || 'Teams must be balanced to start!'}</span>
    </div>
  {/if}
  <button id="landing-play-btn" onclick={startMatch} disabled={$lobbyStore.isMultiplayer && !$lobbyStore.isHost} class="w-full py-4 sm:py-4.5 rounded-full font-rounded font-black text-2xl sm:text-3xl text-white tracking-widest uppercase game-btn shadow-2xl {$lobbyStore.isMultiplayer && !$lobbyStore.isHost ? 'bg-slate-500 opacity-75 cursor-not-allowed' : ($lobbyStore.isTeamMode && !$lobbyStore.isTeamBalanceValid ? 'bg-rose-500 hover:bg-rose-600 ring-4 ring-rose-300/60' : 'game-btn-green')}">
    <i class="fa-solid {$lobbyStore.isMultiplayer && !$lobbyStore.isHost ? 'fa-hourglass-half fa-spin text-lg' : ($lobbyStore.isTeamMode && !$lobbyStore.isTeamBalanceValid ? 'fa-triangle-exclamation text-xl' : 'fa-play text-xl')} mr-2"></i>
    {$lobbyStore.isMultiplayer && !$lobbyStore.isHost
      ? 'WAITING FOR HOST...'
      : ($lobbyStore.isTeamMode
          ? ($lobbyStore.isTeamBalanceValid ? ($lobbyStore.playerCount === 6 ? 'START 3v3 CLASH' : 'START 2v2 CLASH') : 'BALANCE TEAMS')
          : 'PLAY')}
  </button>
{/if}
