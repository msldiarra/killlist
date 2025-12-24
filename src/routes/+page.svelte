<script lang="ts">
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import OathScreen from '$lib/components/OathScreen.svelte';
  import ContractCard from '$lib/components/ContractCard.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import {
    todayActiveContracts,
    vaultCount,
    settings,
    isLoading,
    addContract,
    killContractOptimistic,
    abortContractOptimistic,
    completeOnboardingOptimistic,
    openCount,
    registryCount
  } from '$lib/stores/contracts';
  import { trackDossierFiled, trackOathCompleted } from '$lib/analytics';
  import { playLoad, isAudioUnlocked } from '$lib/audio';
  import { impact } from '$lib/haptics';

  // UI State
  let showOath = $state(true);
  let showCreateForm = $state(false);
  let newContractTitle = $state('');
  let isHighTable = $state(false);

  // Check if onboarding is complete (returning user)
  $effect(() => {
    if ($settings.onboardingComplete) {
      showOath = false;
    }
  });

  // Check localStorage for oath_signed (quick check for returning users)
  $effect(() => {
    if (browser && localStorage.getItem('oath_signed') === 'true') {
      showOath = false;
    }
  });

  function handleOathComplete() {
    // Mark oath as signed in localStorage (quick gatekeeper check)
    if (browser) {
      localStorage.setItem('oath_signed', 'true');
    }
    
    // Complete onboarding in Dexie (source of truth)
    completeOnboardingOptimistic();
    showOath = false;
    
    // Track oath completion
    trackOathCompleted();
    
    // First-time users go to Registry to start adding contracts
    goto('/registry');
  }

  function handleContractKill(id: string) {
    killContractOptimistic(id);
  }

  function handleContractAbort(id: string) {
    abortContractOptimistic(id);
  }

  function handleCreateContract(e: Event) {
    e.preventDefault();
    if (!newContractTitle.trim()) return;

    // Context-aware creation based on current route
    const isActiveRoute = $page.url.pathname === '/';
    const status = isActiveRoute ? 'active' : 'registry';
    
    // Create contract with appropriate status
    addContract(
      newContractTitle.trim(),
      isHighTable ? 'highTable' : 'normal',
      status
    );
    
    // Visual/Audio feedback for Active contracts
    if (status === 'active') {
      playLoad();
      impact();
    }
    
    // Track analytics
    trackDossierFiled({ is_executive_order: isHighTable });

    // Reset form
    newContractTitle = '';
    isHighTable = false;
    showCreateForm = false;
  }

  function openCreateForm() {
    showCreateForm = true;
  }
</script>

<svelte:head>
  <title>KILL LIST</title>
</svelte:head>

<!-- Oath Screen Overlay -->
{#if showOath && !$isLoading}
  <OathScreen onComplete={handleOathComplete} />
{/if}

<!-- Main App -->
<div class="min-h-screen bg-kl-black flex flex-col pb-20" style="font-family: 'JetBrains Mono', monospace;">
  <!-- Header -->
  <header class="flex items-center justify-between px-6 py-5 border-b border-kl-gold/10">
    <h1 class="text-xl tracking-widest text-kl-gold">
      KILL LIST
    </h1>

    <div class="flex items-center gap-3">
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
      <span class="text-kl-gold text-lg">
        {$vaultCount}
      </span>
    </div>
  </header>

  <!-- Section Header - Today's Contracts -->
  <div class="flex items-center justify-between px-6 py-4">
    <span class="text-sm tracking-widest text-kl-gold/70">
      TODAY'S CONTRACTS
    </span>
    <span class="text-sm tracking-wider text-kl-gold">
      {$openCount} OPEN
    </span>
  </div>

  <!-- Content -->
  <main class="flex-1 px-6">
    {#if $isLoading}
      <!-- Loading skeleton -->
      <div class="space-y-3 mt-8">
        {#each [1, 2, 3] as _}
          <div class="h-16 bg-kl-gunmetal/50 animate-pulse"></div>
        {/each}
      </div>
    {:else if $todayActiveContracts.length === 0}
      <!-- Empty state - "You are idle. That is dangerous." -->
      <div class="flex flex-col items-center justify-center pt-20">
        <div class="text-neutral-700 text-6xl mb-6">⊘</div>
        <p class="text-kl-gold text-sm tracking-widest text-center mb-2 uppercase">
          No Active Contracts
        </p>
        <p class="text-neutral-600 text-xs tracking-wider text-center mb-8 max-w-xs">
          You are idle. That is dangerous.
        </p>
        <a
          href="/registry"
          class="px-6 py-3 bg-kl-gold/10 border border-kl-gold/40 text-kl-gold text-sm tracking-widest hover:bg-kl-gold/20 transition-colors uppercase"
          style="font-family: 'JetBrains Mono', monospace;"
        >
          Access Registry
          {#if $registryCount > 0}
            <span class="ml-2 text-kl-gold/60">({$registryCount})</span>
          {/if}
        </a>
      </div>
    {:else}
      <!-- Contract list -->
      <div class="space-y-3">
        {#each $todayActiveContracts as contract (contract.id)}
          <ContractCard {contract} onComplete={handleContractKill} onAbort={handleContractAbort} />
        {/each}
      </div>
    {/if}
  </main>

  <!-- FAB: Create Contract (adds to Registry) -->
  <button
    type="button"
    class="fixed bottom-20 right-6 w-14 h-14 bg-kl-gold text-kl-black flex items-center justify-center z-40 active:scale-95 transition-transform"
    onclick={openCreateForm}
  >
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
    </svg>
  </button>

  <!-- Create Contract Modal -->
  {#if showCreateForm}
    <div class="fixed inset-0 bg-black/90 z-50 flex items-end">
      <div class="w-full bg-kl-gunmetal max-h-[90vh] overflow-y-auto pb-20">
        <div class="p-6">
          <!-- Top indicator -->
          <div class="flex justify-center mb-4">
            <div class="w-12 h-1 bg-kl-gold/60 rounded-full"></div>
          </div>

          <form onsubmit={handleCreateContract}>
            <h3 class="text-xl tracking-widest text-kl-gold mb-2">
              NEW DOSSIER
            </h3>
            
            <p class="text-xs text-kl-gold/50 mb-6">
              {$page.url.pathname === '/' ? 'Contract Accepted Immediately - Deadline: Tonight at 23:59' : 'Deadline: Tonight at 23:59 when accepted'}
            </p>

            <div class="space-y-5">
              <!-- Target Name -->
              <div>
                <label class="block text-xs text-kl-gold/50 mb-2 tracking-widest">
                  TARGET NAME
                </label>
                <input
                  type="text"
                  bind:value={newContractTitle}
                  placeholder="Input Objective..."
                  class="w-full bg-kl-black border border-kl-gold/20 p-4 text-white placeholder:text-kl-gold/30 focus:border-kl-gold focus:outline-none"
                  autofocus
                />
              </div>

              <!-- EXECUTIVE ORDER Toggle -->
              <div class="flex items-center justify-between p-4 border transition-colors {isHighTable ? 'bg-kl-crimson/20 border-kl-crimson' : 'bg-kl-black border-kl-gold/20'}">
                <span class="text-sm tracking-widest transition-colors {isHighTable ? 'text-kl-crimson' : 'text-kl-gold/70'}">
                  EXECUTIVE ORDER
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
                onclick={() => (showCreateForm = false)}
              >
                [ABORT]
              </button>
              <button
                type="submit"
                class="flex-1 py-4 bg-kl-gold text-kl-black text-sm tracking-widest font-semibold"
              >
                FILE DOSSIER
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Bottom Navigation -->
<BottomNav />

<!-- Desktop hint -->
<div class="fixed bottom-20 left-4 hidden md:flex items-center gap-2 text-kl-gold/30 text-xs" style="font-family: 'JetBrains Mono', monospace;">
  <kbd class="px-2 py-1 border border-kl-gold/20 text-kl-gold/50">SPACE</kbd>
  <span>Hold to execute top contract</span>
</div>
