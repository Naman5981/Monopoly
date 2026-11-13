<script>
  /**
   * svelte/lobby/LobbyScreen.svelte
   * Master declarative Lobby screen orchestrating Header, Table Roster, Hero 3D Stage, and Match Settings.
   */
  import { lobbyStore } from '../stores/lobbyStore.js';
  import LobbyHeader from './LobbyHeader.svelte';
  import LobbyRoster from './LobbyRoster.svelte';
  import HeroPreview from './HeroPreview.svelte';
  import MatchSettingsPanel from './MatchSettingsPanel.svelte';
  import MultiplayerPortal from './MultiplayerPortal.svelte';

  let state = $state({});
  lobbyStore.subscribe(val => { state = val; });
</script>

<div
  id="landing-setup-screen"
  class="lobby-view-{state.currentView || 'title'} fixed inset-0 z-50 flex flex-col justify-between p-2 sm:p-3 md:p-4 lg:p-6 overflow-y-auto overflow-x-hidden"
>
  <!-- Floating Atmosphere Clouds -->
  <div id="setup-atmosphere-sky-elements" class="absolute bottom-0 left-0 right-0 pointer-events-none opacity-45 flex justify-between select-none transition-opacity duration-700 px-4 sm:px-6 2xl:px-12">
    <svg class="w-32 h-20 sm:w-36 sm:h-24 2xl:w-48 2xl:h-32 text-white/50 cloud-float-1 transform -translate-y-6 pointer-events-none fill-current"><use href="#icon-cloud"></use></svg>
    <svg class="w-24 h-16 sm:w-28 sm:h-20 2xl:w-40 2xl:h-28 text-white/40 cloud-float-2 transform -translate-y-3 pointer-events-none fill-current"><use href="#icon-cloud"></use></svg>
    <svg class="w-32 h-20 sm:w-36 sm:h-24 2xl:w-48 2xl:h-32 text-white/50 cloud-float-1 transform -translate-y-8 pointer-events-none fill-current"><use href="#icon-cloud"></use></svg>
  </div>

  <!-- Top Header Bar -->
  <LobbyHeader />

  <!-- Main Content Arena -->
  <div id="lobby-main-arena" class="relative z-10 flex-1 max-w-7xl 2xl:max-w-[1540px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-3.5 lg:gap-4.5 2xl:gap-6 items-stretch my-auto py-1 sm:py-2">
    {#if state.currentView === 'multiplayer-portal'}
      <MultiplayerPortal />
    {:else}
      <!-- Left Column: Players Roster -->
      <LobbyRoster />

      <!-- Center Column: Hero 3D Stage -->
      <HeroPreview />

      <!-- Right Column: Match Configuration -->
      <MatchSettingsPanel />
    {/if}
  </div>
</div>
