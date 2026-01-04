<script lang="ts">
  import { goto } from "$app/navigation";
  import { browser } from "$app/environment";
  import { fade } from "svelte/transition";
  import { flip } from "svelte/animate";
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
    registryCount,
    openCount,
    togglePriority,
    freezeContract,
    reorderContracts,
  } from "$lib/stores/contracts";
  import { trackOathCompleted } from "$lib/analytics";
  import { dndzone, type DndEvent } from "svelte-dnd-action";

  // UI State
  let showOath = $state(true);
  let showToast = $state(false); // For clipboard fallback

  // Check if onboarding is complete (returning user)
  $effect(() => {
    if ($settings.onboardingComplete) {
      showOath = false;
    }
  });

  // Check localStorage for oath_signed (quick check for returning users)
  // Check localStorage for oath_signed (quick check for returning users)
  $effect(() => {
    if (browser && localStorage.getItem("oath_signed") === "true") {
      showOath = false;
    }
  });

  import { trainingStore } from "$lib/stores/training";
  import { HapticPatterns, vibrate } from "$lib/haptic";

  // Drag & Drop
  let items: any[] = $state([]);
  let dragDisabled = $state(true);
  let isDragging = $state(false);

  $effect(() => {
    if (isDragging) return;
    // Always sync items with store to capture property changes (like Priority)
    items = [...$todayActiveContracts];
  });

  function handleDndConsider(e: CustomEvent<DndEvent<any>>) {
    items = e.detail.items;
    isDragging = true;
    dragDisabled = false; // Keep enabled during drag
  }

  function handleDndFinalize(e: CustomEvent<DndEvent<any>>) {
    items = e.detail.items;
    isDragging = false;
    dragDisabled = true; // Disable immediately
    reorderContracts(items.map((i) => i.id));
    vibrate(HapticPatterns.Heavy);
  }

  function startDrag() {
    // Prevent drag during training execution to avoid confusion
    if (
      $trainingStore.phase === "execution" ||
      $trainingStore.phase === "executionExpand"
    )
      return;
    dragDisabled = false;
  }

  function handleOathComplete() {
    // Mark oath as signed in localStorage (quick gatekeeper check)
    if (browser) {
      localStorage.setItem("oath_signed", "true");
    }

    // DO NOT complete onboarding yet - we are entering Training Day
    // completeOnboardingOptimistic();

    showOath = false;
    trackOathCompleted();

    // Start Training Mode -> Secure Comms Phase
    trainingStore.start();
    goto("/registry");
  }

  function handleContractKill(id: string) {
    if ($trainingStore.phase === "execution") {
      killContractOptimistic(id);
      trainingStore.advanceToDebrief();
      goto("/morgue");
      return;
    }
    killContractOptimistic(id);
  }

  function handleContractAbort(id: string) {
    abortContractOptimistic(id);
  }

  // --- RECRUIT FEATURE ---
  async function recruitAgent() {
    const shareData = {
      title: "PRIORITY INVITATION",
      text: `/// ENCRYPTED MESSAGE ///

OPERATIVE RECRUITMENT PROTOCOL
STATUS: ACTIVE

You have been identified as a potential asset.
Access the network below to begin your directive.

SECURE ACCESS:
https://killlist.app

/// END TRANSMISSION ///`,
      url: "https://killlist.app",
    };

    // Auto-copy to clipboard first (as backup for apps that drop text)
    if (browser) {
      try {
        await navigator.clipboard.writeText(shareData.text);
        showToast = true;
        setTimeout(() => (showToast = false), 3000);
      } catch (err) {
        console.error("Auto-copy failed:", err);
      }
    }

    // Then trigger share menu WITH URL (so WhatsApp/etc appear)
    if (browser && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled in share menu, normal behavior
      }
    }
  }
</script>

<svelte:head>
  <title>KILL LIST</title>
</svelte:head>

<!-- Toast Notification -->
{#if showToast}
  <div
    class="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-kl-gold/10 border border-kl-gold/40 px-6 py-3 text-kl-gold text-xs tracking-widest backdrop-blur-md whitespace-nowrap"
    style="font-family: 'JetBrains Mono', monospace;"
  >
    MESSAGE COPIED
  </div>
{/if}

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
      <!-- Recruit Button -->
      <button
        onclick={recruitAgent}
        class="border border-kl-gold/30 text-kl-gold/70 text-[10px] uppercase px-3 py-1.5 hover:bg-kl-gold/10 hover:border-kl-gold hover:text-kl-gold transition-colors tracking-wider mr-2"
      >
        [ Recruit ]
      </button>

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
      {#if $trainingStore.phase !== "executionExpand" && $trainingStore.phase !== "execution"}
        <span class="text-xs text-neutral-600 animate-pulse mt-0.5"
          >[SWIPE TO EXECUTE]</span
        >
      {/if}
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
      <div
        class="space-y-3"
        use:dndzone={{
          items,
          dragDisabled,
          flipDurationMs: 300,
          dropTargetStyle: {},
        }}
        onconsider={handleDndConsider}
        onfinalize={handleDndFinalize}
      >
        {#each items as contract, i (contract.id)}
          <div
            animate:flip={{ duration: 300 }}
            class="relative"
            class:ring-2={$trainingStore.phase === "executionExpand" ||
              $trainingStore.phase === "execution"}
            class:ring-kl-gold={$trainingStore.phase === "executionExpand" ||
              $trainingStore.phase === "execution"}
          >
            <!-- Training Expand Cue -->
            {#if $trainingStore.phase === "executionExpand" && i === 0}
              <div
                class="absolute -top-12 left-0 right-0 flex justify-center z-20 pointer-events-none"
                transition:fade
              >
                <div class="flex flex-col items-center gap-1 animate-bounce">
                  <span
                    class="text-kl-gold text-xs tracking-widest bg-black/80 px-2 py-1 border border-kl-gold shadow-[0_0_10px_rgba(212,175,55,0.3)]"
                  >
                    TAP TO EXPAND
                  </span>
                  <svg
                    class="w-4 h-4 text-kl-gold"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </div>
              </div>
            {/if}

            <!-- Training Execution Cue -->
            {#if $trainingStore.phase === "execution" && i === 0}
              <div
                class="absolute top-8 right-6 z-20 pointer-events-none flex items-center gap-2 animate-pulse text-kl-gold"
                transition:fade
              >
                <span
                  class="text-xs tracking-widest bg-black/80 px-2 py-1 border border-kl-gold/50 shadow-[0_0_10px_rgba(212,175,55,0.3)]"
                >
                  SWIPE RIGHT
                </span>
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </div>
            {/if}

            <ContractCard
              {contract}
              onComplete={handleContractKill}
              onAbort={handleContractAbort}
              onExpand={(id, expanded) => {
                if ($trainingStore.phase === "executionExpand" && expanded) {
                  trainingStore.advanceToExecution();
                } else if ($trainingStore.phase === "execution" && !expanded) {
                  // User collapsed the card while in execution phase - revert guidance
                  trainingStore.advanceToExecutionExpand();
                }
              }}
              onTogglePriority={(id) => togglePriority(id)}
              onFreeze={(id) => freezeContract(id)}
              onDragStart={startDrag}
            />
          </div>
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
