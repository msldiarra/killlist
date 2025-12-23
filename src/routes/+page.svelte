<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import OathScreen from '$lib/components/OathScreen.svelte';
  import ContractCard from '$lib/components/ContractCard.svelte';
  import {
    activeContracts,
    archivedContracts,
    vaultCount,
    settings,
    isLoading,
    addContract,
    completeContractOptimistic,
    completeOnboardingOptimistic
  } from '$lib/stores/contracts';

  // UI State
  let showOath = $state(true);
  let showCreateForm = $state(false);
  let newContractTitle = $state('');
  let newContractDate = $state('');
  let newContractTime = $state('');
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

  function handleContractComplete(id: string) {
    completeContractOptimistic(id);
  }

  function handleCreateContract(e: Event) {
    e.preventDefault();
    if (!newContractTitle.trim() || !newContractDate) return;

    const deadline = new Date(`${newContractDate}T${newContractTime || '12:00'}`);
    addContract(newContractTitle.trim(), deadline, isHighTable ? 'highTable' : 'normal');

    // Reset form
    newContractTitle = '';
    newContractDate = '';
    newContractTime = '';
    isHighTable = false;
    showCreateForm = false;
  }

  // Default deadline to tomorrow
  function setDefaultDeadline(): void {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    newContractDate = tomorrow.toISOString().slice(0, 10);
    newContractTime = '12:00';
  }

  const openCount = $derived($activeContracts.length);
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
      <!-- Add button -->
      <button
        type="button"
        class="w-10 h-10 rounded-full border border-kl-gold/40 flex items-center justify-center text-kl-gold hover:border-kl-gold transition-colors"
        onclick={() => {
          showCreateForm = true;
          setDefaultDeadline();
        }}
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

  <!-- Section Header -->
  <div class="flex items-center justify-between px-6 py-4">
    <span class="text-sm tracking-widest text-kl-gold/70" style="font-family: 'JetBrains Mono', monospace;">
      ACTIVE CONTRACTS
    </span>
    <span class="text-sm tracking-wider text-kl-gold" style="font-family: 'JetBrains Mono', monospace;">
      {openCount} OPEN
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
    {:else if $activeContracts.length === 0}
      <!-- Empty state -->
      <div class="flex items-center justify-center pt-16">
        <p class="text-kl-gold/40 text-sm tracking-widest text-center" style="font-family: 'JetBrains Mono', monospace;">
          YOU ARE CURRENTLY RETIRED
        </p>
      </div>
    {:else}
      <!-- Contract list -->
      <div class="space-y-3">
        {#each $activeContracts as contract (contract.id)}
          <ContractCard {contract} onComplete={handleContractComplete} />
        {/each}
      </div>
    {/if}

    <!-- Archive Section -->
    {#if $archivedContracts.length > 0}
      <section class="mt-12">
        <h2 class="text-xs tracking-widest text-kl-gold/50 mb-6" style="font-family: 'JetBrains Mono', monospace;">
          ARCHIVE
        </h2>

        <div class="space-y-4">
          {#each $archivedContracts as contract (contract.id)}
            {@const isHighTableOrder = contract.priority === 'highTable'}
            {@const isFailed = contract.status === 'failed'}
            {@const completedDate = contract.completedAt ? new Date(contract.completedAt) : new Date(contract.deadlineAt)}
            {@const timeStr = completedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            
            <div class="flex items-start gap-4">
              <!-- Left: Timeline + Icon -->
              <div class="flex items-center gap-3">
                <!-- Vertical line -->
                <div class="w-0.5 h-16 self-stretch {isHighTableOrder ? 'bg-kl-crimson' : 'bg-kl-gold/60'}"></div>
                
                <!-- Circle icon -->
                {#if isHighTableOrder}
                  <!-- High Table: Filled red circle with dot -->
                  <div class="w-12 h-12 rounded-full border-2 border-kl-crimson flex items-center justify-center bg-kl-gunmetal flex-shrink-0">
                    <div class="w-4 h-4 rounded-full bg-kl-crimson"></div>
                  </div>
                {:else}
                  <!-- Normal: Gold crosshair icon -->
                  <div class="w-12 h-12 rounded-full border border-kl-gold/50 flex items-center justify-center bg-kl-gunmetal flex-shrink-0">
                    <svg class="w-6 h-6 text-kl-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <circle cx="12" cy="12" r="8" />
                      <circle cx="12" cy="12" r="2" />
                      <line x1="12" y1="2" x2="12" y2="6" />
                      <line x1="12" y1="18" x2="12" y2="22" />
                      <line x1="2" y1="12" x2="6" y2="12" />
                      <line x1="18" y1="12" x2="22" y2="12" />
                    </svg>
                  </div>
                {/if}
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0 pt-1">
                <h3 
                  class="text-base line-through {isHighTableOrder ? 'text-kl-crimson' : 'text-kl-gold'}"
                  style="font-family: 'JetBrains Mono', monospace;"
                >
                  {contract.title}
                </h3>
                <p class="text-xs mt-1 text-kl-gold/60" style="font-family: 'JetBrains Mono', monospace;">
                  STATUS: {isFailed ? 'FAILED' : 'TERMINATED'}
                </p>
              </div>

              <!-- Time -->
              <div class="text-xs text-kl-gold/50 whitespace-nowrap pt-1" style="font-family: 'JetBrains Mono', monospace;">
                {timeStr} HRS
              </div>
            </div>
          {/each}
        </div>
      </section>
    {/if}
  </main>

  <!-- FAB: Create Contract -->
  <button
    type="button"
    class="fixed bottom-6 right-6 w-14 h-14 bg-kl-gold text-kl-black flex items-center justify-center z-40 active:scale-95 transition-transform"
    onclick={() => {
      showCreateForm = true;
      setDefaultDeadline();
    }}
  >
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
    </svg>
  </button>

  <!-- Create Contract Modal -->
  {#if showCreateForm}
    <div class="fixed inset-0 bg-black/90 z-50 flex items-end">
      <div class="w-full bg-kl-gunmetal p-6">
        <!-- Top indicator -->
        <div class="flex justify-center mb-4">
          <div class="w-12 h-1 bg-kl-gold/60 rounded-full"></div>
        </div>

        <form onsubmit={handleCreateContract}>
          <h3 class="text-xl tracking-widest text-kl-gold mb-6" style="font-family: 'JetBrains Mono', monospace;">
            ISSUE NEW CONTRACT
          </h3>

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

            <!-- Terminus Date -->
            <div>
              <label class="block text-xs text-kl-gold/50 mb-2 tracking-widest" style="font-family: 'JetBrains Mono', monospace;">
                TERMINUS DATE
              </label>
              <div class="flex gap-3">
                <input
                  type="date"
                  bind:value={newContractDate}
                  class="flex-1 bg-kl-black border border-kl-gold/20 p-4 text-white focus:border-kl-gold focus:outline-none"
                  style="font-family: 'JetBrains Mono', monospace; color-scheme: dark;"
                />
                <input
                  type="time"
                  bind:value={newContractTime}
                  class="w-32 bg-kl-black border border-kl-gold/20 p-4 text-white focus:border-kl-gold focus:outline-none"
                  style="font-family: 'JetBrains Mono', monospace; color-scheme: dark;"
                />
              </div>
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
