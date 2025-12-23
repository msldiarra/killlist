<script lang="ts">
  import OathScreen from '$lib/components/OathScreen.svelte';
  import ContractCard from '$lib/components/ContractCard.svelte';
  import { getClientTodayISODate } from '$lib/db';
  import {
    todayActiveContracts,
    vaultCount,
    settings,
    isLoading,
    addContract,
    killContractOptimistic,
    completeOnboardingOptimistic,
    openCount
  } from '$lib/stores/contracts';

  // UI State
  let showOath = $state(true);
  let showCreateForm = $state(false);
  let newContractTitle = $state('');
  let newContractTime = $state('23:59');
  let isHighTable = $state(false);

  // Check if onboarding is complete
  $effect(() => {
    if ($settings.onboardingComplete) {
      showOath = false;
    }
  });

  function handleOathComplete() {
    completeOnboardingOptimistic();
    showOath = false;
  }

  function handleContractKill(id: string) {
    killContractOptimistic(id);
  }

  function handleCreateContract(e: Event) {
    e.preventDefault();
    if (!newContractTitle.trim()) return;

    // In hardcore mode, contracts are ALWAYS for today
    addContract(
      newContractTitle.trim(),
      newContractTime || '23:59',
      isHighTable ? 'highTable' : 'normal'
    );

    // Reset form
    newContractTitle = '';
    newContractTime = '23:59';
    isHighTable = false;
    showCreateForm = false;
  }

  function openCreateForm() {
    showCreateForm = true;
    newContractTime = '23:59';
  }

  // Get today's date for display
  const todayFormatted = $derived(() => {
    const today = new Date();
    return today.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  });
</script>

<svelte:head>
  <title>KILL LIST</title>
</svelte:head>

<!-- Oath Screen Overlay -->
{#if showOath && !$isLoading}
  <OathScreen onComplete={handleOathComplete} />
{/if}

<!-- Main App -->
<div class="min-h-screen bg-kl-black flex flex-col" style="font-family: 'JetBrains Mono', monospace;">
  <!-- Header -->
  <header class="flex items-center justify-between px-6 py-5 border-b border-kl-gold/10">
    <h1 class="text-xl tracking-widest text-kl-gold" style="font-family: 'JetBrains Mono', monospace;">
      KILL LIST
    </h1>

    <div class="flex items-center gap-3">
      <!-- Morgue button (Skull icon) -->
      <a
        href="/morgue"
        class="w-10 h-10 rounded-full border border-kl-gold/40 flex items-center justify-center text-kl-gold hover:border-kl-gold hover:bg-kl-gold/10 transition-colors"
        title="The Morgue"
      >
        <svg class="w-5 h-5" viewBox="0 0 318 412" fill="currentColor">
          <path d="M 171.00 318.50 L 164.00 318.50 L 162.50 317.00 L 161.50 300.00 L 160.00 298.50 L 158.50 301.00 L 158.50 317.00 L 157.00 318.50 L 144.50 316.00 L 143.00 300.50 L 141.00 316.50 L 130.50 314.00 L 129.00 298.50 L 127.00 314.50 L 119.50 311.00 L 117.00 295.50 L 115.00 310.50 L 109.50 308.00 L 108.00 293.50 L 105.50 297.00 L 105.50 307.00 L 103.00 306.50 L 101.50 305.00 L 101.50 290.00 L 99.50 281.00 L 92.50 266.00 L 80.00 255.50 L 65.00 253.50 L 53.00 247.50 L 48.50 242.00 L 45.50 234.00 L 46.50 221.00 L 56.50 202.00 L 55.50 180.00 L 45.50 157.00 L 41.50 141.00 L 41.50 123.00 L 48.50 97.00 L 61.50 73.00 L 82.00 51.50 L 104.00 38.50 L 130.00 31.50 L 192.00 31.50 L 210.00 35.50 L 231.00 44.50 L 244.00 53.50 L 262.50 74.00 L 271.50 92.00 L 278.50 116.00 L 278.50 147.00 L 264.50 185.00 L 265.50 206.00 L 275.50 225.00 L 275.50 234.00 L 272.50 242.00 L 265.00 249.50 L 256.00 253.50 L 241.00 255.50 L 235.00 258.50 L 227.50 266.00 L 220.50 282.00 L 219.50 304.00 L 218.00 305.50 L 215.50 305.00 L 215.50 295.00 L 214.00 294.50 L 212.50 308.00 L 207.00 310.50 L 205.50 309.00 L 206.50 300.00 L 204.00 296.50 L 202.50 311.00 L 195.00 313.50 L 194.50 302.00 L 192.00 298.50 L 190.50 314.00 L 181.00 317.50 L 179.50 316.00 L 179.50 302.00 L 178.00 300.50 L 176.50 316.00 L 171.00 318.50 Z M 110.00 240.50 L 100.00 240.50 L 87.00 236.50 L 77.50 229.00 L 73.50 222.00 L 71.50 213.00 L 73.50 197.00 L 79.50 186.00 L 87.00 180.50 L 96.00 178.50 L 106.00 178.50 L 107.00 179.50 L 117.00 179.50 L 126.00 181.50 L 135.00 185.50 L 142.50 193.00 L 144.50 197.00 L 145.50 202.00 L 144.50 214.00 L 136.50 229.00 L 128.00 235.50 L 110.00 240.50 Z M 221.00 240.50 L 211.00 240.50 L 198.00 237.50 L 188.00 232.50 L 181.50 225.00 L 176.50 214.00 L 175.50 202.00 L 178.50 193.00 L 186.00 185.50 L 192.00 182.50 L 204.00 179.50 L 225.00 178.50 L 236.00 181.50 L 241.50 186.00 L 245.50 192.00 L 249.50 207.00 L 248.50 219.00 L 245.50 226.00 L 240.00 232.50 L 234.00 236.50 L 221.00 240.50 Z M 176.00 280.50 L 170.00 280.50 L 161.00 274.50 L 151.00 280.50 L 145.00 280.50 L 142.00 279.50 L 138.50 275.00 L 139.50 263.00 L 150.50 240.00 L 155.00 234.50 L 165.00 234.50 L 168.50 237.00 L 181.50 263.00 L 182.50 275.00 L 179.00 279.50 L 176.00 280.50 Z" fill-rule="evenodd"/>
        </svg>
      </a>

      <!-- Add button -->
      <button
        type="button"
        class="w-10 h-10 rounded-full border border-kl-gold/40 flex items-center justify-center text-kl-gold hover:border-kl-gold transition-colors"
        onclick={openCreateForm}
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <!-- Vault counter -->
      <span class="text-kl-gold text-lg" style="font-family: 'JetBrains Mono', monospace;">
        {$vaultCount}
      </span>
    </div>
  </header>

  <!-- Section Header - Today's Contracts -->
  <div class="flex items-center justify-between px-6 py-4">
    <span class="text-sm tracking-widest text-kl-gold/70" style="font-family: 'JetBrains Mono', monospace;">
      TODAY'S CONTRACTS
    </span>
    <span class="text-sm tracking-wider text-kl-gold" style="font-family: 'JetBrains Mono', monospace;">
      {$openCount} OPEN
    </span>
  </div>

  <!-- Content -->
  <main class="flex-1 px-6 pb-24">
    {#if $isLoading}
      <!-- Loading skeleton -->
      <div class="space-y-3 mt-8">
        {#each [1, 2, 3] as _}
          <div class="h-16 bg-kl-gunmetal/50 animate-pulse"></div>
        {/each}
      </div>
    {:else if $todayActiveContracts.length === 0}
      <!-- Empty state -->
      <div class="flex items-center justify-center pt-16">
        <p class="text-kl-gold/40 text-sm tracking-widest text-center" style="font-family: 'JetBrains Mono', monospace;">
          YOU ARE CURRENTLY RETIRED
        </p>
      </div>
    {:else}
      <!-- Contract list -->
      <div class="space-y-3">
        {#each $todayActiveContracts as contract (contract.id)}
          <ContractCard {contract} onComplete={handleContractKill} />
        {/each}
      </div>
    {/if}

  </main>

  <!-- FAB: Create Contract -->
  <button
    type="button"
    class="fixed bottom-6 right-6 w-14 h-14 bg-kl-gold text-kl-black flex items-center justify-center z-40 active:scale-95 transition-transform"
    onclick={openCreateForm}
  >
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
    </svg>
  </button>

  <!-- Create Contract Modal (Today Only - Hardcore Mode) -->
  {#if showCreateForm}
    <div class="fixed inset-0 bg-black/90 z-50 flex items-end">
      <div class="w-full bg-kl-gunmetal p-6">
        <!-- Top indicator -->
        <div class="flex justify-center mb-4">
          <div class="w-12 h-1 bg-kl-gold/60 rounded-full"></div>
        </div>

        <form onsubmit={handleCreateContract}>
          <h3 class="text-xl tracking-widest text-kl-gold mb-2" style="font-family: 'JetBrains Mono', monospace;">
            ISSUE NEW CONTRACT
          </h3>
          
          <!-- Today indicator -->
          <p class="text-xs text-kl-crimson mb-6" style="font-family: 'JetBrains Mono', monospace;">
            24H HARDCORE: Must be completed today or it burns
          </p>

          <div class="space-y-5">
            <!-- Target Name -->
            <div>
              <label class="block text-xs text-kl-gold/50 mb-2 tracking-widest" style="font-family: 'JetBrains Mono', monospace;">
                TARGET NAME
              </label>
              <input
                type="text"
                bind:value={newContractTitle}
                placeholder="Enter Target Name..."
                class="w-full bg-kl-black border border-kl-gold/20 p-4 text-white placeholder:text-kl-gold/30 focus:border-kl-gold focus:outline-none"
                style="font-family: 'JetBrains Mono', monospace;"
                autofocus
              />
            </div>

            <!-- Terminus Time (Time only - date is always today) -->
            <div>
              <label class="block text-xs text-kl-gold/50 mb-2 tracking-widest" style="font-family: 'JetBrains Mono', monospace;">
                TERMINUS TIME
              </label>
              <input
                type="time"
                bind:value={newContractTime}
                class="w-full bg-kl-black border border-kl-gold/20 p-4 text-white focus:border-kl-gold focus:outline-none"
                style="font-family: 'JetBrains Mono', monospace; color-scheme: dark;"
              />
            </div>

            <!-- High Table Order Toggle -->
            <div class="flex items-center justify-between p-4 border transition-colors {isHighTable ? 'bg-kl-crimson/20 border-kl-crimson' : 'bg-kl-black border-kl-gold/20'}">
              <span class="text-sm tracking-widest transition-colors {isHighTable ? 'text-kl-crimson' : 'text-kl-gold/70'}" style="font-family: 'JetBrains Mono', monospace;">
                HIGH TABLE ORDER
              </span>
              <button
                type="button"
                class="w-12 h-6 rounded-full transition-colors relative {isHighTable ? 'bg-kl-crimson' : 'bg-kl-gold/20'}"
                onclick={() => (isHighTable = !isHighTable)}
              >
                <div
                  class="absolute top-1 w-4 h-4 rounded-full bg-white transition-all {isHighTable ? 'left-7' : 'left-1'}"
                ></div>
              </button>
            </div>
          </div>

          <div class="flex gap-3 mt-6">
            <button
              type="button"
              class="flex-1 py-4 border border-kl-gold/30 text-kl-gold/70 text-sm tracking-widest"
              style="font-family: 'JetBrains Mono', monospace;"
              onclick={() => (showCreateForm = false)}
            >
              [ABORT]
            </button>
            <button
              type="submit"
              class="flex-1 py-4 bg-kl-gold text-kl-black text-sm tracking-widest font-semibold"
              style="font-family: 'JetBrains Mono', monospace;"
            >
              RATIFY CONTRACT
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>

<!-- Desktop hint -->
<div class="fixed bottom-4 left-4 hidden md:flex items-center gap-2 text-kl-gold/30 text-xs" style="font-family: 'JetBrains Mono', monospace;">
  <kbd class="px-2 py-1 border border-kl-gold/20 text-kl-gold/50">SPACE</kbd>
  <span>Hold to execute top contract</span>
</div>
