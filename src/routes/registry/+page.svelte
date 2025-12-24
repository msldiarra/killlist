<script lang="ts">
  import { page } from '$app/stores';
  import { slide } from 'svelte/transition';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import DeadDrop from '$lib/components/DeadDrop.svelte';
  import {
    registryContracts,
    registryCount,
    isLoading,
    addContract,
    acceptContractOptimistic,
    deleteContractOptimistic
  } from '$lib/stores/contracts';
  import { playLoad, unlockAudio } from '$lib/audio';
  import { vibrate, HapticPatterns } from '$lib/haptic';
  import { trackContractAccepted, trackDossierFiled } from '$lib/analytics';

  // UI State
  let showCreateForm = $state(false);
  let newContractTitle = $state('');
  let isHighTable = $state(false);
  let expandedId = $state<string | null>(null);

  // Swipe state for each contract
  let swipeStates = $state<Record<string, { x: number; swiping: boolean }>>({});
  
  // Toggle expand state
  function toggleExpand(id: string) {
    expandedId = expandedId === id ? null : id;
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
      // Unlock audio on first user interaction (required for iOS/Safari)
      unlockAudio();
      // Play "Lock and Load" sound (load.mp3)
      playLoad();
      // Trigger heavy vibration for haptic feedback
      vibrate(HapticPatterns.Heavy);
    }
    
    // Track analytics
    trackDossierFiled({ is_executive_order: isHighTable });

    // Reset form
    newContractTitle = '';
    isHighTable = false;
    showCreateForm = false;
  }

  function handleAccept(id: string) {
    unlockAudio();
    playLoad();
    acceptContractOptimistic(id);
    trackContractAccepted();
  }

  function handleDelete(id: string) {
    deleteContractOptimistic(id);
  }

  // Touch handlers for swipe-to-accept
  function handleTouchStart(id: string, e: TouchEvent) {
    const touch = e.touches[0];
    swipeStates[id] = { x: 0, swiping: true };
    const startX = touch.clientX;

    const handleMove = (e: TouchEvent) => {
      const currentX = e.touches[0].clientX;
      const deltaX = currentX - startX;
      // Only allow right swipe
      swipeStates[id] = { x: Math.max(0, deltaX), swiping: true };
    };

    const handleEnd = () => {
      const state = swipeStates[id];
      if (state && state.x > 100) {
        // Threshold reached - accept the contract
        handleAccept(id);
      }
      swipeStates[id] = { x: 0, swiping: false };
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('touchmove', handleMove, { passive: true });
    document.addEventListener('touchend', handleEnd);
  }

  function getSwipeProgress(id: string): number {
    const state = swipeStates[id];
    if (!state) return 0;
    return Math.min(1, state.x / 100);
  }
</script>

<svelte:head>
  <title>THE REGISTRY | KILL LIST</title>
</svelte:head>

<div class="min-h-screen bg-kl-black flex flex-col pb-36" style="font-family: 'JetBrains Mono', monospace;">
  <!-- Header: Vault-style with Pending Bounties Counter -->
  <header class="px-6 py-6 border-b border-neutral-700/30 bg-neutral-900/50">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-sm tracking-widest text-neutral-500 uppercase">
        The Registry
      </h1>
      
      <!-- Add Contract button -->
      <button
        type="button"
        class="w-10 h-10 rounded-full border border-kl-gold/40 flex items-center justify-center text-kl-gold hover:border-kl-gold hover:bg-kl-gold/10 transition-colors"
        onclick={() => (showCreateForm = true)}
        title="Add Contract"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>

    <!-- Pending Bounties Counter (Bank Balance Style) -->
    <div class="flex items-baseline gap-3">
      <span class="text-5xl font-bold text-kl-gold tabular-nums tracking-tight">
        {$registryCount}
      </span>
      <span class="text-xs tracking-widest text-kl-gold/50 uppercase">
        Pending Bounties
      </span>
    </div>
  </header>

  <!-- Subtitle -->
  <div class="px-6 py-3 border-b border-neutral-800">
    <p class="text-[10px] tracking-widest text-neutral-600 uppercase">
      Cold Storage • Swipe Right to Accept
    </p>
  </div>

  <!-- Content -->
  <main class="flex-1 px-4 py-4">
    {#if $isLoading}
      <!-- Loading skeleton -->
      <div class="space-y-2 mt-4">
        {#each [1, 2, 3, 4] as _}
          <div class="h-12 bg-neutral-900 animate-pulse"></div>
        {/each}
      </div>
    {:else if $registryContracts.length === 0}
      <!-- Empty state -->
      <div class="flex flex-col items-center justify-center pt-20">
        <svg class="w-16 h-16 text-neutral-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" 
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <p class="text-neutral-600 text-sm tracking-widest text-center">
          NO PENDING DOSSIERS
        </p>
        <p class="text-neutral-700 text-xs tracking-wider mt-2 text-center">
          Add contracts to the registry
        </p>
      </div>
    {:else}
      <!-- Contract list - Dense "Cold Storage" style -->
      <div class="space-y-1">
        {#each $registryContracts as contract (contract.id)}
          {@const swipeProgress = getSwipeProgress(contract.id)}
          {@const isHighTableOrder = contract.priority === 'highTable'}
          {@const isExpanded = expandedId === contract.id}

          <div
            class="relative overflow-hidden bg-neutral-900 border border-neutral-800 group cursor-pointer transition-colors hover:border-neutral-700"
            ontouchstart={(e) => handleTouchStart(contract.id, e)}
            onclick={() => toggleExpand(contract.id)}
          >
            <!-- Swipe accept indicator (background) -->
            <div
              class="absolute inset-y-0 left-0 bg-green-900/50 flex items-center pl-4 transition-all"
              style="width: {swipeProgress * 100}%;"
            >
              {#if swipeProgress > 0.5}
                <span class="text-green-400 text-xs tracking-widest">ACCEPT</span>
              {/if}
            </div>

            <!-- Contract content -->
            <div
              class="relative transition-transform"
              style="transform: translateX({swipeStates[contract.id]?.x || 0}px);"
            >
              <!-- Main row -->
              <div class="flex items-center gap-3 p-3">
                <!-- Priority indicator -->
                <div class="flex-shrink-0">
                  {#if isHighTableOrder}
                    <div class="w-2 h-2 rounded-full bg-kl-crimson"></div>
                  {:else}
                    <div class="w-2 h-2 rounded-full bg-neutral-600"></div>
                  {/if}
                </div>

                <!-- Title (truncated or expanded) -->
                <div class="flex-1 min-w-0">
                  <span
                    class="text-sm block {isExpanded ? 'text-white whitespace-pre-wrap break-words' : 'text-neutral-300 truncate'}"
                  >
                    {contract.title}
                  </span>
                </div>

                <!-- Terminus time -->
                <span class="text-[10px] text-neutral-600 tracking-wider flex-shrink-0">
                  {contract.terminusTime || '23:59'}
                </span>

                <!-- Desktop actions (always visible when expanded) -->
                <div class="hidden md:flex items-center gap-2 {isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity">
                  <!-- Accept button (SIGN stamp) -->
                  <button
                    type="button"
                    class="px-2 py-1 border border-green-700 text-green-500 text-[10px] tracking-widest hover:bg-green-900/30 transition-colors"
                    onclick={(e) => {
                      e.stopPropagation();
                      handleAccept(contract.id);
                    }}
                  >
                    SIGN
                  </button>

                  <!-- Delete button -->
                  <button
                    type="button"
                    class="px-2 py-1 border border-neutral-700 text-neutral-500 text-[10px] tracking-widest hover:bg-neutral-800 transition-colors"
                    onclick={(e) => {
                      e.stopPropagation();
                      handleDelete(contract.id);
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <!-- Expanded content panel -->
              {#if isExpanded}
                <div
                  class="px-3 pb-3"
                  transition:slide={{ duration: 200 }}
                >
                  <div class="flex items-center justify-between pt-2 border-t border-neutral-800">
                    <!-- Metadata -->
                    <div class="flex flex-col gap-1 text-[10px] text-neutral-500">
                      <span>Created: {new Date(contract.createdAt).toLocaleDateString()}</span>
                      {#if isHighTableOrder}
                        <span class="text-kl-crimson">EXECUTIVE ORDER</span>
                      {/if}
                    </div>

                    <!-- Accept button (mobile-friendly when expanded) -->
                    <button
                      type="button"
                      class="px-4 py-2 border border-kl-gold text-kl-gold text-xs tracking-widest hover:bg-kl-gold/10 transition-colors uppercase"
                      onclick={(e) => {
                        e.stopPropagation();
                        handleAccept(contract.id);
                      }}
                    >
                      [ACCEPT]
                    </button>
                  </div>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </main>

  <!-- Dead Drop Quick Input -->
  <DeadDrop />

  <!-- Advanced Options Modal -->
  {#if showCreateForm}
    <div class="fixed inset-0 bg-black/90 z-50 flex items-end">
      <div class="w-full bg-neutral-900 border-t border-neutral-700 max-h-[90vh] overflow-y-auto pb-20">
        <div class="p-6">
          <!-- Top indicator -->
          <div class="flex justify-center mb-4">
            <div class="w-12 h-1 bg-neutral-600 rounded-full"></div>
          </div>

          <form onsubmit={handleCreateContract}>
            <h3 class="text-xl tracking-widest text-neutral-300 mb-2">
              NEW DOSSIER
            </h3>
            
            <p class="text-xs text-neutral-500 mb-6">
              {$page.url.pathname === '/' ? 'Contract Accepted Immediately - Deadline: Tonight at 23:59' : 'Deadline: Tonight at 23:59 when accepted'}
            </p>

            <div class="space-y-5">
              <!-- Target Name -->
              <div>
                <label class="block text-xs text-neutral-500 mb-2 tracking-widest">
                  TARGET NAME
                </label>
                <input
                  type="text"
                  bind:value={newContractTitle}
                  placeholder="Input Objective..."
                  class="w-full bg-neutral-800 border border-neutral-700 p-4 text-white placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
                  autofocus
                />
              </div>

              <!-- EXECUTIVE ORDER Toggle -->
              <div class="flex items-center justify-between p-4 border transition-colors {isHighTable ? 'bg-kl-crimson/20 border-kl-crimson' : 'bg-neutral-800 border-neutral-700'}">
                <span class="text-sm tracking-widest transition-colors {isHighTable ? 'text-kl-crimson' : 'text-neutral-400'}">
                  EXECUTIVE ORDER
                </span>
                <button
                  type="button"
                  class="w-12 h-6 rounded-full transition-colors relative {isHighTable ? 'bg-kl-crimson' : 'bg-neutral-700'}"
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
                class="flex-1 py-4 border border-neutral-600 text-neutral-400 text-sm tracking-widest"
                onclick={() => (showCreateForm = false)}
              >
                [ABORT]
              </button>
              <button
                type="submit"
                class="flex-1 py-4 bg-neutral-600 text-white text-sm tracking-widest font-semibold hover:bg-neutral-500 transition-colors"
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

