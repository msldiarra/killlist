<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import MorgueHeatmap from '$lib/components/MorgueHeatmap.svelte';
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

<div class="min-h-screen bg-kl-black flex flex-col" style="font-family: 'JetBrains Mono', monospace;">
  <!-- Header -->
  <header class="flex items-center justify-between px-6 py-5 border-b border-kl-gold/10">
    <button
      type="button"
      class="flex items-center gap-3 text-kl-gold hover:text-kl-gold/80 transition-colors"
      onclick={() => goto('/')}
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19l-7-7 7-7" />
      </svg>
      <span class="text-sm tracking-widest">BACK</span>
    </button>

    <h1 class="text-xl tracking-widest text-kl-gold">
      THE MORGUE
    </h1>

    <div class="w-16"></div>
  </header>

  <!-- Content -->
  <main class="flex-1 px-6 pb-24">
    {#if isLoading}
      <!-- Loading skeleton -->
      <div class="space-y-6 mt-8">
        <div class="h-32 bg-kl-gunmetal/50 animate-pulse"></div>
        <div class="h-48 bg-kl-gunmetal/50 animate-pulse"></div>
      </div>
    {:else}
      <!-- Legacy Stats -->
      <section class="mt-8">
        <div class="grid grid-cols-3 gap-4">
          <!-- Total Kills -->
          <div class="bg-kl-gunmetal border border-kl-gold/20 p-4 text-center">
            <div class="text-4xl font-bold text-kl-gold mb-1">
              {stats.totalKills}
            </div>
            <div class="text-[10px] tracking-widest text-kl-gold/50 uppercase">
              Total Kills
            </div>
          </div>

          <!-- Current Streak -->
          <div class="bg-kl-gunmetal border border-kl-gold/20 p-4 text-center">
            <div class="text-4xl font-bold text-kl-gold mb-1">
              {stats.currentStreak}
            </div>
            <div class="text-[10px] tracking-widest text-kl-gold/50 uppercase">
              Current Streak
            </div>
          </div>

          <!-- Best Streak -->
          <div class="bg-kl-gunmetal border border-kl-gold/20 p-4 text-center">
            <div class="text-4xl font-bold text-kl-gold mb-1">
              {stats.bestStreak}
            </div>
            <div class="text-[10px] tracking-widest text-kl-gold/50 uppercase">
              Best Streak
            </div>
          </div>
        </div>
      </section>

      <!-- Calendar of Skulls (Heatmap) -->
      <section class="mt-10">
        <h2 class="text-xs tracking-widest text-kl-gold/50 mb-4 uppercase">
          Calendar of Skulls
        </h2>

        <div class="bg-kl-gunmetal border border-kl-gold/10 p-4 overflow-hidden">
          <MorgueHeatmap countsByDate={stats.countsByDate} days={365} />
        </div>
      </section>

      <!-- Detailed History (Month-Grouped) -->
      {#if monthGroups.length > 0}
        <section class="mt-12">
          <h2 class="text-xs tracking-widest text-kl-gold/50 mb-6 uppercase">
            Detailed Kills
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
      {:else}
        <!-- Empty state -->
        <section class="mt-16 text-center">
          <div class="text-kl-gold/30 text-6xl mb-4">💀</div>
          <p class="text-kl-gold/40 text-sm tracking-widest">
            NO CONFIRMED KILLS YET
          </p>
          <p class="text-kl-gold/20 text-xs tracking-wider mt-2">
            Complete your first contract to fill the morgue
          </p>
        </section>
      {/if}
    {/if}
  </main>
</div>

