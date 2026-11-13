<script>
  import TopBar from './TopBar.svelte';
  import PlayerCards from './PlayerCards.svelte';
  import StatusPill from './StatusPill.svelte';
  import GameBanners from './GameBanners.svelte';
  import EmotePopover from './EmotePopover.svelte';
  import FloatingOverlays from './FloatingOverlays.svelte';
  import EventLogDrawer from './EventLogDrawer.svelte';
</script>

<div class="game-hud-svelte-root">
  <TopBar />
  <PlayerCards />
  <StatusPill />
  <GameBanners />
  <EmotePopover />
  <FloatingOverlays />
  <EventLogDrawer />
</div>
