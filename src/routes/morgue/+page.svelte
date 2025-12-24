<script lang="ts">
  import { onMount } from 'svelte';
  import MorgueHeatmap from '$lib/components/MorgueHeatmap.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import { getMorgueStats, groupByMonth, type MorgueStats, type MonthGroup } from '$lib/morgue';

  // State
  let isLoading = $state(true);
  let stats = $state<MorgueStats>({
    totalKills: 0,
    currentStreak: 0,
    bestStreak: 0,
    countsByDate: {},
    killedContracts: []
  });
  let monthGroups = $state<MonthGroup[]>([]);

  onMount(async () => {
    const loadedStats = await getMorgueStats();
    stats = loadedStats;
    monthGroups = groupByMonth(loadedStats.killedContracts);
    isLoading = false;
  });

  // Format time from killedAt
  function formatTime(isoString: string | undefined, fallback: string): string {
    const date = new Date(isoString ?? fallback);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  // Format date for individual items
  function formatDate(isoString: string | undefined, fallback: string): string {
    const date = new Date(isoString ?? fallback);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }
</script>

<svelte:head>
  <title>THE MORGUE | KILL LIST</title>
</svelte:head>

<div class="min-h-screen bg-kl-black flex flex-col pb-20" style="font-family: 'JetBrains Mono', monospace;">
  <!-- Header -->
  <header class="flex items-center justify-center px-6 py-5 border-b border-kl-gold/10">
    <h1 class="text-xl tracking-widest text-kl-gold">
      THE MORGUE
    </h1>
  </header>

  <!-- Content -->
  <main class="flex-1 px-6">
    {#if isLoading}
      <!-- Loading skeleton -->
      <div class="space-y-6 mt-8">
        <div class="h-32 bg-kl-gunmetal/50 animate-pulse"></div>
        <div class="h-48 bg-kl-gunmetal/50 animate-pulse"></div>
      </div>
    {:else if stats.totalKills === 0}
      <!-- THE VOID - No kills yet -->
      <section class="mt-24 text-center px-8">
        <div class="relative inline-block mb-8">
          <!-- Skull icon -->
          <svg class="w-20 h-20 text-neutral-800" viewBox="0 0 318 412" fill="currentColor">
            <path d="M 171.00 318.50 L 164.00 318.50 L 162.50 317.00 L 161.50 300.00 L 160.00 298.50 L 158.50 301.00 L 158.50 317.00 L 157.00 318.50 L 144.50 316.00 L 143.00 300.50 L 141.00 316.50 L 130.50 314.00 L 129.00 298.50 L 127.00 314.50 L 119.50 311.00 L 117.00 295.50 L 115.00 310.50 L 109.50 308.00 L 108.00 293.50 L 105.50 297.00 L 105.50 307.00 L 103.00 306.50 L 101.50 305.00 L 101.50 290.00 L 99.50 281.00 L 92.50 266.00 L 80.00 255.50 L 65.00 253.50 L 53.00 247.50 L 48.50 242.00 L 45.50 234.00 L 46.50 221.00 L 56.50 202.00 L 55.50 180.00 L 45.50 157.00 L 41.50 141.00 L 41.50 123.00 L 48.50 97.00 L 61.50 73.00 L 82.00 51.50 L 104.00 38.50 L 130.00 31.50 L 192.00 31.50 L 210.00 35.50 L 231.00 44.50 L 244.00 53.50 L 262.50 74.00 L 271.50 92.00 L 278.50 116.00 L 278.50 147.00 L 264.50 185.00 L 265.50 206.00 L 275.50 225.00 L 275.50 234.00 L 272.50 242.00 L 265.00 249.50 L 256.00 253.50 L 241.00 255.50 L 235.00 258.50 L 227.50 266.00 L 220.50 282.00 L 219.50 304.00 L 218.00 305.50 L 215.50 305.00 L 215.50 295.00 L 214.00 294.50 L 212.50 308.00 L 207.00 310.50 L 205.50 309.00 L 206.50 300.00 L 204.00 296.50 L 202.50 311.00 L 195.00 313.50 L 194.50 302.00 L 192.00 298.50 L 190.50 314.00 L 181.00 317.50 L 179.50 316.00 L 179.50 302.00 L 178.00 300.50 L 176.50 316.00 L 171.00 318.50 Z M 110.00 240.50 L 100.00 240.50 L 87.00 236.50 L 77.50 229.00 L 73.50 222.00 L 71.50 213.00 L 73.50 197.00 L 79.50 186.00 L 87.00 180.50 L 96.00 178.50 L 106.00 178.50 L 107.00 179.50 L 117.00 179.50 L 126.00 181.50 L 135.00 185.50 L 142.50 193.00 L 144.50 197.00 L 145.50 202.00 L 144.50 214.00 L 136.50 229.00 L 128.00 235.50 L 110.00 240.50 Z M 221.00 240.50 L 211.00 240.50 L 198.00 237.50 L 188.00 232.50 L 181.50 225.00 L 176.50 214.00 L 175.50 202.00 L 178.50 193.00 L 186.00 185.50 L 192.00 182.50 L 204.00 179.50 L 225.00 178.50 L 236.00 181.50 L 241.50 186.00 L 245.50 192.00 L 249.50 207.00 L 248.50 219.00 L 245.50 226.00 L 240.00 232.50 L 234.00 236.50 L 221.00 240.50 Z M 176.00 280.50 L 170.00 280.50 L 161.00 274.50 L 151.00 280.50 L 145.00 280.50 L 142.00 279.50 L 138.50 275.00 L 139.50 263.00 L 150.50 240.00 L 155.00 234.50 L 165.00 234.50 L 168.50 237.00 L 181.50 263.00 L 182.50 275.00 L 179.00 279.50 L 176.00 280.50 Z" fill-rule="evenodd"/>
          </svg>
        </div>

        <p class="text-kl-gold text-lg tracking-[0.2em] uppercase mb-3">
          No Records Found
        </p>
        <p class="text-neutral-600 text-xs tracking-wider max-w-xs mx-auto mb-8">
          Execute a contract to begin your legacy.
        </p>

        <a
          href="/"
          class="inline-block px-6 py-3 border border-kl-gold/30 text-kl-gold text-sm tracking-widest hover:bg-kl-gold/10 transition-colors uppercase"
        >
          View Active Contracts
        </a>
      </section>
    {:else}
      <!-- THE LEGACY PANEL - Big Monolithic Stats -->
      <section class="mt-8">
        <h2 class="text-[10px] tracking-[0.3em] text-kl-gold/40 mb-4 uppercase text-center">
          The Legacy
        </h2>
        
        <div class="flex justify-center gap-8">
          <!-- Body Count (Primary Stat) -->
          <div class="text-center">
            <div class="text-6xl font-bold text-kl-gold mb-1" style="text-shadow: 0 0 30px rgba(212, 175, 55, 0.4);">
              {stats.totalKills}
            </div>
            <div class="text-[10px] tracking-[0.2em] text-kl-gold/60 uppercase">
              Body Count
            </div>
          </div>

          <!-- Divider -->
          <div class="w-px bg-kl-gold/20 self-stretch"></div>

          <!-- Current Streak -->
          <div class="text-center">
            <div class="text-5xl font-bold text-kl-gold/80 mb-1">
              {stats.currentStreak}<span class="text-2xl text-kl-gold/50">d</span>
            </div>
            <div class="text-[10px] tracking-[0.2em] text-kl-gold/50 uppercase">
              Streak
            </div>
          </div>
        </div>

        <!-- Best Streak (subtle, below) -->
        {#if stats.bestStreak > stats.currentStreak}
          <div class="text-center mt-4">
            <span class="text-[10px] tracking-widest text-kl-gold/30 uppercase">
              Personal Best: {stats.bestStreak} days
            </span>
          </div>
        {/if}
      </section>

      <!-- CALENDAR OF SKULLS (Heatmap) -->
      <section class="mt-10">
        <h2 class="text-[10px] tracking-[0.3em] text-kl-gold/40 mb-4 uppercase">
          Calendar of Skulls
        </h2>

        <div class="bg-neutral-900/50 border border-kl-gold/10 p-4 overflow-hidden">
          <MorgueHeatmap countsByDate={stats.countsByDate} days={365} />
        </div>
      </section>

      <!-- THE PAPER TRAIL - Detailed History (Month-Grouped) -->
      {#if monthGroups.length > 0}
        <section class="mt-12 mb-8">
          <h2 class="text-[10px] tracking-[0.3em] text-kl-gold/40 mb-6 uppercase">
            The Paper Trail
          </h2>

          <div class="space-y-10">
            {#each monthGroups as group (group.label)}
              <div>
                <!-- Month Header -->
                <div class="flex items-center gap-3 mb-4">
                  <div class="h-px flex-1 bg-kl-gold/20"></div>
                  <h3 class="text-sm tracking-widest text-kl-gold/70 uppercase">
                    {group.label}
                  </h3>
                  <div class="h-px flex-1 bg-kl-gold/20"></div>
                </div>

                <!-- Contracts in this month -->
                <div class="space-y-2">
                  {#each group.contracts as contract (contract.id)}
                    {@const isHighTable = contract.priority === 'highTable'}
                    {@const timeStr = formatTime(contract.killedAt, contract.createdAt)}
                    {@const dateStr = formatDate(contract.killedAt, contract.createdAt)}

                    <div class="flex items-center gap-4 p-3 bg-kl-black/50 border border-kl-gold/5 group hover:border-kl-gold/20 transition-colors">
                      <!-- Status indicator -->
                      <div class="flex-shrink-0">
                        {#if isHighTable}
                          <div class="w-3 h-3 rounded-full bg-kl-crimson"></div>
                        {:else}
                          <div class="w-3 h-3 rounded-full border border-kl-gold/50"></div>
                        {/if}
                      </div>

                      <!-- Title (redacted style) -->
                      <div class="flex-1 min-w-0">
                        <span
                          class="text-sm line-through {isHighTable ? 'text-kl-crimson/70' : 'text-kl-gold/60'}"
                          style="text-decoration-thickness: 1px;"
                        >
                          {contract.title}
                        </span>
                      </div>

                      <!-- Date & Time -->
                      <div class="flex items-center gap-3 text-[10px] text-kl-gold/40 whitespace-nowrap">
                        <span>{dateStr}</span>
                        <span class="text-kl-gold/30">•</span>
                        <span>{timeStr}</span>
                      </div>

                      <!-- Stamp -->
                      <div class="flex-shrink-0 px-2 py-0.5 border border-kl-gold/20 text-[9px] tracking-wider text-kl-gold/40 uppercase">
                        FILED
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </section>
      {/if}
    {/if}
  </main>
</div>

<!-- Bottom Navigation -->
<BottomNav />
