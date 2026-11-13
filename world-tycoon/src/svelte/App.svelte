<script>
  /**
   * svelte/App.svelte
   * Master reactive application shell uniting Lobby, Game HUD, Modals, and Dev Suite.
   */
  import GameHud from './hud/GameHud.svelte';
  import ModalsRoot from './modals/ModalsRoot.svelte';
  import DebugDrawer from './debug/DebugDrawer.svelte';
  import { BUILD_CONFIG } from '../game/config.js';

  const isDebugAllowed = BUILD_CONFIG?.DEBUG_ENABLED !== false &&
    (typeof __DEBUG_ALLOWED__ === 'undefined' || __DEBUG_ALLOWED__ !== false);
</script>

<div id="world-tycoon-app-shell" class="w-full h-full relative pointer-events-none">
  <!-- Game HUD Layer (pointer-events managed inside) -->
  <GameHud />

  <!-- Declarative Modals Layer -->
  <ModalsRoot />

  <!-- Developer / QA Suite -->
  {#if isDebugAllowed}
    <DebugDrawer />
  {/if}
</div>
