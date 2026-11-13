<script>
  let { chart = null } = $props();
</script>

{#if !chart || chart.empty}
  <div class="text-xs text-slate-400 font-bold text-center py-4">No match timeline data recorded</div>
{:else}
  <div class="w-full flex flex-col items-center">
    <svg viewBox="0 0 {chart.width} {chart.height}" class="w-full h-auto max-h-28 overflow-visible" role="img" aria-label="Net worth by turn">
      {#each chart.gridLines as line (line.y)}
        <line x1={chart.padLeft} y1={line.y} x2={chart.right} y2={line.y} stroke="#475569" stroke-width="1" stroke-dasharray="3,3" />
        <text x={chart.padLeft - 6} y={line.labelY} text-anchor="end" font-size="8" font-weight="700" fill="#94a3b8">{line.value}</text>
      {/each}
      {#each chart.series as series (series.name)}
        <path d={series.path} fill="none" stroke={series.color} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity={series.opacity} />
        <circle cx={series.lastX} cy={series.lastY} r="3" fill={series.color} stroke="#fff" stroke-width="1.5" />
      {/each}
    </svg>
    <div class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-1 px-1 border-t border-white/10 pt-1 w-full">
      {#each chart.series as series (series.name)}
        <div class="flex items-center gap-1.5 text-[10px] font-bold text-slate-300">
          <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:{series.color}"></span>
          <span class="truncate max-w-[65px] uppercase">{series.name}</span>
          <span class="text-slate-400 font-semibold">{series.lastValue}</span>
        </div>
      {/each}
    </div>
  </div>
{/if}
