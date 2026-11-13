<script>
  /**
   * svelte/hud/FloatingOverlays.svelte
   * Declarative floating 3D canvas overlays: token speech bubble, tile hover tooltip,
   * World Tour flight banner, and World Festival boost banner.
   */
  function openFestivalBoostModal() {
    window.openFestivalBoostModalFromBanner?.();
  }
</script>

<!-- Floating Speech Bubble Over Active Player Token -->
<div id="token-speech-bubble" class="token-speech-bubble hidden">Rolling dice...</div>

<!-- High-Contrast 3D Tile Hover Tooltip -->
<div id="tile-hover-tooltip" class="tile-hover-tooltip hidden"></div>

<!-- World Tour Destination Selection Banner -->
<div id="world-tour-banner" class="world-tour-banner fixed top-16 left-1/2 -translate-x-1/2 z-40 hidden bg-gradient-to-r from-sky-600 to-indigo-700 text-white px-5 py-2 rounded-full font-extrabold text-xs shadow-xl border-2 border-white items-center gap-2 select-none">
  <i class="fa-solid fa-plane-departure animate-bounce"></i>
  <span>WORLD TOUR! Click any tile to fly.</span>
</div>

<!-- World Festival Selection Banner -->
<div id="festival-select-banner" class="fixed top-16 left-1/2 -translate-x-1/2 z-40 hidden bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-5 py-2.5 rounded-full font-black text-xs shadow-2xl border-2 border-white/90 items-center gap-2.5 animate-pulse select-none">
  <i class="fa-solid fa-champagne-glasses text-amber-300 text-sm animate-bounce"></i>
  <span>🎪 <strong>WORLD FESTIVAL!</strong> Click any flashing owned city on the board to double rent (2×)!</span>
  <button onclick={openFestivalBoostModal} class="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-full text-[11px] font-black underline cursor-pointer ml-1 transition" title="Open Property List">📋 View List</button>
</div>
