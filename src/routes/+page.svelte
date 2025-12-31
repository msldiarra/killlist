<script lang="ts">
  import { goto } from "$app/navigation";
  import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import OathScreen from "$lib/components/OathScreen.svelte";
  import ContractCard from "$lib/components/ContractCard.svelte";
  import DeadDrop from "$lib/components/DeadDrop.svelte";
  import BottomNav from "$lib/components/BottomNav.svelte";
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
    registryCount,
  } from "$lib/stores/contracts";
  import { trackOathCompleted } from "$lib/analytics";

  // UI State
  let showOath = $state(true);

  // Check if onboarding is complete (returning user)
  $effect(() => {
    if ($settings.onboardingComplete) {
      showOath = false;
    }
  });

  // Check localStorage for oath_signed (quick check for returning users)
  $effect(() => {
    if (browser && localStorage.getItem("oath_signed") === "true") {
      showOath = false;
    }
  });

  function handleOathComplete() {
    // Mark oath as signed in localStorage (quick gatekeeper check)
    if (browser) {
      localStorage.setItem("oath_signed", "true");
    }

    // Complete onboarding in Dexie (source of truth)
    completeOnboardingOptimistic();
    showOath = false;

    // Track oath completion
    trackOathCompleted();

    // First-time users go to Registry to start adding contracts
    goto("/registry");
  }

  function handleContractKill(id: string) {
    killContractOptimistic(id);
  }

  function handleContractAbort(id: string) {
    abortContractOptimistic(id);
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
<div
  class="min-h-screen bg-kl-black flex flex-col pb-20"
  style="font-family: 'JetBrains Mono', monospace;"
>
  <!-- Header -->
  <header
    class="flex items-center justify-between px-6 py-5 border-b border-kl-gold/10"
  >
    <h1 class="text-xl tracking-widest text-kl-gold">KILL LIST</h1>

    <div class="flex items-center gap-3">
      <!-- Add button -->

      <!-- Vault counter -->
      <span class="text-kl-gold text-lg">
        {$vaultCount}
      </span>
    </div>
  </header>

  <!-- Section Header - Today's Contracts -->
  <!-- Section Header - Today's Contracts -->
  <div class="flex items-center justify-between px-6 py-4">
    <div class="flex flex-col">
      <span class="text-sm tracking-widest text-kl-gold/70">
        TODAY'S CONTRACTS
      </span>
      <span class="text-xs text-neutral-600 animate-pulse mt-0.5"
        >[SWIPE TO EXECUTE]</span
      >
    </div>
    <span class="text-sm tracking-wider text-kl-gold whitespace-nowrap">
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
        <p
          class="text-kl-gold text-sm tracking-widest text-center mb-2 uppercase"
        >
          No Active Contracts
        </p>
        <p
          class="text-neutral-600 text-xs tracking-wider text-center mb-8 max-w-xs"
        >
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
          <ContractCard
            {contract}
            onComplete={handleContractKill}
            onAbort={handleContractAbort}
          />
        {/each}
      </div>
    {/if}
  </main>

  <!-- Dead Drop Input -->
  <DeadDrop forceActive={true} />
</div>

<!-- Bottom Navigation -->
<BottomNav />

<!-- Desktop hint -->
<div
  class="fixed bottom-20 left-4 hidden md:flex items-center gap-2 text-kl-gold/30 text-xs"
  style="font-family: 'JetBrains Mono', monospace;"
>
  <kbd class="px-2 py-1 border border-kl-gold/20 text-kl-gold/50">SPACE</kbd>
  <span>Hold to execute top contract</span>
</div>
