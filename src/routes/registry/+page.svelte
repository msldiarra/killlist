<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { slide, fade } from "svelte/transition";
  import BottomNav from "$lib/components/BottomNav.svelte";
  import DeadDrop from "$lib/components/DeadDrop.svelte";
  import {
    registryContracts,
    registryCount,
    isLoading,
    addContract,
    acceptContractOptimistic,
    deleteContractOptimistic,
    reorderContracts,
    settings,
    updateContractTitle,
  } from "$lib/stores/contracts";
  import { secureUplinkOpen } from "$lib/stores/ui";
  import { playLoad, unlockAudio } from "$lib/audio";
  import { vibrate, HapticPatterns } from "$lib/haptic";
  import {
    trackContractAccepted,
    trackDossierFiled,
    trackContractHitSent,
  } from "$lib/analytics";
  import { trainingStore } from "$lib/stores/training";
  import type { Contract } from "$lib/db";
  import { dndzone, type DndEvent } from "svelte-dnd-action";
  import { flip } from "svelte/animate";
  import { downloadMissionICS } from "$lib/ics";

  // Redirect if not onboarded
  $effect(() => {
    if (!$isLoading && !$settings.onboardingComplete) {
      if ($trainingStore.phase === "idle") {
        goto("/");
      }
    }
  });

  // Derived Training State
  const isSecureComms = $derived($trainingStore.phase === "secureComms");
  const isAcquisition = $derived($trainingStore.phase === "acquisition");
  const isActivation = $derived($trainingStore.phase === "activation");

  // Dummy Contracts for Training
  const DUMMY_CONTRACTS = [
    {
      id: "dummy1",
      title: "OPERATION: BLACKOUT",
      priority: "normal",
      terminusTime: "23:59",
      createdAt: new Date(),
    },
    {
      id: "dummy2",
      title: "TARGET: UNKNOWN",
      priority: "highTable",
      terminusTime: "00:00",
      createdAt: new Date(),
    },
  ];

  // Logic to show dummies or real contracts
  const visibleContracts = $derived(
    isSecureComms || isAcquisition || isActivation
      ? [...DUMMY_CONTRACTS, ...$registryContracts]
      : $registryContracts,
  );

  // UI State
  let showCreateForm = $state(false);
  let newContractTitle = $state("");
  let isHighTable = $state(false);
  let expandedId: string | null = $state(null);
  let deleteConfirmId: string | null = $state(null);
  let editingId: string | null = $state(null);
  let editValue = $state("");

  // Drag & Drop State (svelte-dnd-action)
  let items: any[] = $state([]);
  let dragDisabled = $state(true);
  let isDragging = $state(false);

  // Sync visibleContracts to items when not dragging
  $effect(() => {
    // Always sync if IDs mismatch (and not currently dragging)
    if (isDragging) return;

    // Force disable if training
    if (isActivation || isAcquisition || isSecureComms) {
      dragDisabled = true;
    }

    // Check for ID or Content (Title) mismatch
    const currentSig = items.map((i) => i.id + i.title).join("|");
    const newSig = visibleContracts.map((c) => c.id + c.title).join("|");

    if (currentSig !== newSig) {
      items = [...visibleContracts];
    }
  });

  function startDrag() {
    if (isActivation || isAcquisition || isSecureComms) return;
    dragDisabled = false;
  }

  function handleDndConsider(e: CustomEvent<DndEvent<any>>) {
    isDragging = true;
    items = e.detail.items;
    // Keep it enabled while considering
    dragDisabled = false;
  }

  function handleDndFinalize(e: CustomEvent<DndEvent<any>>) {
    isDragging = false;
    items = e.detail.items;

    // DISABLE drag again immediately after drop
    dragDisabled = true;

    // Persist order
    reorderContracts(items.map((i) => i.id));
    vibrate(HapticPatterns.Heavy);
  }

  // Swipe state for each contract
  let swipeStates: { [key: string]: { x: number; swiping: boolean } } = $state(
    {},
  );

  // Toggle expand state
  function toggleExpand(id: string) {
    if (isDragging) return;
    expandedId = expandedId === id ? null : id;
  }

  // Tease Animation - Reactive to contracts loading
  $effect(() => {
    const hasTeased = sessionStorage.getItem("registry_tease_shown");
    // Only tease if we have contracts and haven't shown it yet
    if (!hasTeased && visibleContracts.length > 0) {
      // Set flag immediately to prevent re-triggering while animation plays
      sessionStorage.setItem("registry_tease_shown", "true");

      // Longer delay to ensure complete render/transition
      setTimeout(() => {
        // Slide all visible contracts more noticeably
        visibleContracts.forEach((c) => {
          if (!swipeStates[c.id]?.swiping) {
            swipeStates[c.id] = { x: 40, swiping: false };
          }
        });

        // Hold for a moment, then snap back
        setTimeout(() => {
          visibleContracts.forEach((c) => {
            // Only reset if user isn't currently swiping
            if (!swipeStates[c.id]?.swiping) {
              swipeStates[c.id] = { x: 0, swiping: false };
            }
          });
        }, 600);
      }, 800);
    }
  });

  function handleCreateContract(e: Event) {
    e.preventDefault();
    if (!newContractTitle.trim()) return;

    // Context-aware creation based on current route
    const isActiveRoute = $page.url.pathname === "/";
    const status = isActiveRoute ? "active" : "registry";

    // Create contract with appropriate status
    addContract(
      newContractTitle.trim(),
      isHighTable ? "highTable" : "normal",
      status,
    );

    // Visual/Audio feedback for Active contracts
    if (status === "active") {
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
    newContractTitle = "";
    isHighTable = false;
    showCreateForm = false;
  }

  function handleAccept(id: string) {
    unlockAudio();
    playLoad();

    // Training Intercept
    if (isActivation) {
      acceptContractOptimistic(id);
      trainingStore.advanceToExecutionExpand();
      goto("/");
      return;
    }

    acceptContractOptimistic(id);
    trackContractAccepted();
  }

  function handleDeadDropAdd(title: string) {
    if (isAcquisition) {
      // Find the new contract to activate training phase
      // Small timeout to allow store propagation just in case, though usually sync
      setTimeout(() => {
        const contract = $registryContracts.find((c) => c.title === title);
        if (contract) {
          trainingStore.advanceToActivation(contract.id);
        }
      }, 100);
    }
  }

  function handleDelete(id: string) {
    // Prevent delete during training
    if (isActivation) return;
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
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
    };

    document.addEventListener("touchmove", handleMove, { passive: true });
    document.addEventListener("touchend", handleEnd);
  }

  function getSwipeProgress(id: string): number {
    const state = swipeStates[id];
    if (!state) return 0;
    return Math.min(1, state.x / 100);
  }

  // Share Function for Registry
  async function shareContract(contract: Contract) {
    trackContractHitSent(contract.id);

    const url = `${$page.url.origin}/assign?target=${encodeURIComponent(contract.title)}&priority=${contract.priority}`;
    const text = `/// CONTRACT INTERCEPTED ///\nTarget: ${contract.title}\nPriority: ${contract.priority.toUpperCase()}\n\nAccept Mission:\n${url}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Contract Hit",
          text: text,
          url: url,
        });
      } catch (err) {
        console.warn("Share failed", err);
      }
    }
  }

  function handleUpdateTitle(id: string) {
    if (!editValue.trim()) {
      editingId = null;
      return;
    }

    updateContractTitle(id, editValue.trim());
    editingId = null;
    unlockAudio();
    // Subtle feedback can be added here
  }

  function toggleEdit(contract: Contract) {
    if (editingId === contract.id) {
      // Save
      handleUpdateTitle(contract.id);
    } else {
      editingId = contract.id;
      editValue = contract.title;
    }
  }

  function autoResize(el: HTMLTextAreaElement) {
    const resize = () => {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    };
    el.addEventListener("input", resize);
    resize();
    return {
      destroy: () => el.removeEventListener("input", resize),
    };
  }
</script>

<svelte:head>
  <title>THE REGISTRY | KILL LIST</title>
</svelte:head>

<div
  class="min-h-screen bg-kl-black flex flex-col pb-36"
  style="font-family: 'JetBrains Mono', monospace;"
>
  <!-- Header: Vault-style with Pending Bounties Counter -->
  <header class="px-6 py-6 border-b border-neutral-700/30 bg-neutral-900/50">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-sm tracking-widest text-neutral-500 uppercase">
        The Registry <span class="text-xs text-neutral-600 ml-2 animate-pulse"
          >[SWIPE TO ACCEPT]</span
        >
      </h1>

      <div class="flex items-center gap-4">
        <!-- HQ Feedback Trigger (Envelope) -->
        <button
          type="button"
          class="text-kl-gold/60 hover:text-kl-gold transition-colors p-1"
          onclick={() => ($secureUplinkOpen = true)}
          title="HQ Direct Connection"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </button>

        <!-- Add Contract button (+) -->
        <button
          type="button"
          class="w-10 h-10 rounded-full border border-kl-gold/40 flex items-center justify-center text-kl-gold hover:border-kl-gold hover:bg-kl-gold/10 transition-colors"
          onclick={() => (showCreateForm = true)}
          title="Add Contract"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Pending Bounties Counter (Bank Balance Style) -->
    <div class="flex items-baseline gap-3">
      <span class="text-5xl font-bold text-kl-gold tabular-nums tracking-tight">
        {visibleContracts.length}
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
    {:else if visibleContracts.length === 0}
      <!-- Empty state -->
      <div class="flex flex-col items-center justify-center pt-20">
        <svg
          class="w-16 h-16 text-neutral-700 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1"
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
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
      <div
        class="space-y-1"
        use:dndzone={{
          items,
          dragDisabled,
          flipDurationMs: 200,
          dropTargetStyle: {},
        }}
        onconsider={handleDndConsider}
        onfinalize={handleDndFinalize}
      >
        {#each items as contract, i (contract.id)}
          {@const swipeProgress = getSwipeProgress(contract.id)}
          {@const isHighTableOrder = contract.priority === "highTable"}
          {@const isExpanded = expandedId === contract.id}
          <div animate:flip={{ duration: 200 }}>
            <div
              class="relative overflow-hidden bg-neutral-900 border border-neutral-800 group cursor-pointer transition-colors hover:border-neutral-700"
              role="button"
              tabindex="0"
              ontouchstart={(e) => {
                // Prevent drag (dndzone) from seeing this touch
                e.stopPropagation();
                handleTouchStart(contract.id, e);
              }}
              onpointerdown={(e) => {
                // Crucial: dndzone likely uses pointer events. Stop them here.
                e.stopPropagation();
              }}
              onmousedown={(e) => {
                // Prevent drag (dndzone) from seeing this click
                e.stopPropagation();
              }}
              onclick={() => toggleExpand(contract.id)}
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleExpand(contract.id);
                }
              }}
            >
              <!-- Training Swipe Cue -->
              {#if isActivation && i === visibleContracts.length - 1}
                <div
                  class="absolute right-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center gap-2 animate-pulse text-kl-gold"
                  transition:fade
                >
                  <span
                    class="text-xs tracking-widest bg-black/80 px-2 py-1 border border-kl-gold/30 shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                    >SWIPE RIGHT</span
                  >
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

              <!-- Swipe accept indicator (background) -->
              <div
                class="absolute inset-y-0 left-0 bg-green-900/50 flex items-center pl-4 transition-all"
                style="width: {swipeProgress * 100}%;"
              >
                {#if swipeProgress > 0.5}
                  <span class="text-green-400 text-xs tracking-widest"
                    >ACCEPT</span
                  >
                {/if}
              </div>

              <!-- Contract content -->
              <div
                class="relative transition-transform"
                style="transform: translateX({swipeStates[contract.id]?.x ||
                  0}px);"
              >
                <!-- Main row -->
                <div class="flex items-center gap-3 p-3 pl-7">
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
                    {#if editingId === contract.id}
                      <div class="relative">
                        <textarea
                          bind:value={editValue}
                          class="w-full bg-neutral-800 border-b border-kl-gold text-white text-sm p-1 focus:outline-none resize-none overflow-hidden block"
                          style="field-sizing: content; min-height: 1.5em;"
                          rows="1"

                          onclick={(e) => e.stopPropagation()}
                          onblur={() => handleUpdateTitle(contract.id)}
                          onkeydown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleUpdateTitle(contract.id);
                            }
                            if (e.key === "Escape") editingId = null;
                          }}
                          use:autoResize
                        ></textarea>
                      </div>
                    {:else}
                      <span
                        class="text-sm block {isExpanded
                          ? 'text-white whitespace-pre-wrap break-words'
                          : 'text-neutral-300 truncate'}"
                      >
                        {contract.title}
                      </span>
                    {/if}
                  </div>

                  <!-- Terminus time -->
                  <span
                    class="text-[10px] text-neutral-600 tracking-wider flex-shrink-0"
                  >
                    {contract.terminusTime || "23:59"}
                  </span>

                  <!-- Desktop actions (always visible when expanded) -->
                  <div
                    class="hidden md:flex items-center gap-2 {isExpanded
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'} transition-opacity"
                  >
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

                <!-- Grip Handle -> Drag Handle -->
                <div
                  class="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-move text-neutral-600 hover:text-neutral-400 z-10"
                  role="button"
                  tabindex="0"
                  onpointerdown={(e) => {
                    startDrag();
                  }}
                  ontouchstart={(e) => {
                    // Ensure touch also triggers it immediately
                    startDrag();
                  }}
                  onclick={(e) => e.stopPropagation()}
                  onkeydown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      startDrag();
                    }
                  }}
                >
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"
                    ><path
                      d="M7 19v-2h2v2H7zm0-6v-2h2v2H7zm0-6V5h2v2H7zm4 4h10v2H11v-2zm0 6h10v2H11v-2zm0-12h10v2H11V5z"
                    ></path></svg
                  >
                </div>

                <!-- Expanded content panel -->
                {#if isExpanded}
                  <div class="px-3 pb-3" transition:slide={{ duration: 200 }}>
                    <div
                      class="pt-3 border-t border-neutral-800 flex flex-col gap-4"
                    >
                      <!-- Metadata Row -->
                      <div
                        class="flex items-center justify-between text-[10px] tracking-widest text-neutral-500"
                      >
                        <span
                          >Created: {new Date(
                            contract.createdAt,
                          ).toLocaleDateString()}</span
                        >
                        {#if isHighTableOrder}
                          <span class="text-kl-crimson font-bold"
                            >EXECUTIVE ORDER</span
                          >
                        {/if}
                      </div>

                      <!-- Action Bar -->
                      <div class="flex items-center justify-between">
                        <!-- Secondary Actions (Icons) -->
                        <div class="flex items-center gap-2">
                          <!-- Upload (ICS) -->
                          <button
                            type="button"
                            class="w-10 h-10 flex items-center justify-center border border-neutral-700 text-neutral-500 hover:text-kl-gold hover:border-kl-gold/50 hover:bg-kl-gold/5 transition-colors"
                            title="Add to Calendar"
                            onclick={(e) => {
                              e.stopPropagation();
                              downloadMissionICS(contract);
                            }}
                          >
                            <svg
                              class="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="1.5"
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </button>

                          <!-- Assign (Share) -->
                          <button
                            type="button"
                            class="w-10 h-10 flex items-center justify-center border border-neutral-700 text-neutral-500 hover:text-white hover:border-neutral-500 hover:bg-neutral-800 transition-colors"
                            title="Assign Agent"
                            onclick={(e) => {
                              e.stopPropagation();
                              shareContract(contract);
                            }}
                          >
                            <svg
                              class="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="1.5"
                                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                              />
                            </svg>
                          </button>

                          <!-- Edit (Amend Intel) -->
                          <button
                            type="button"
                            class="w-10 h-10 flex items-center justify-center border border-neutral-700 text-neutral-500 hover:text-kl-gold hover:border-kl-gold/50 hover:bg-kl-gold/5 transition-colors"
                            title="Amend Intel"
                            onclick={(e) => {
                              e.stopPropagation();
                              toggleEdit(contract);
                            }}
                          >
                            <svg
                              class="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="1.5"
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                          </button>

                          <!-- Delete -->
                          <button
                            type="button"
                            class="w-10 h-10 flex items-center justify-center border transition-all duration-200 {deleteConfirmId ===
                            contract.id
                              ? 'border-red-600 bg-red-900/20 text-red-500 w-24'
                              : 'border-neutral-700 text-neutral-500 hover:text-red-500 hover:border-red-900/50 hover:bg-red-900/10'}"
                            title="Delete"
                            onclick={(e) => {
                              e.stopPropagation();
                              if (deleteConfirmId === contract.id) {
                                handleDelete(contract.id);
                                deleteConfirmId = null;
                              } else {
                                deleteConfirmId = contract.id;
                                setTimeout(() => {
                                  if (deleteConfirmId === contract.id)
                                    deleteConfirmId = null;
                                }, 3000);
                              }
                            }}
                          >
                            {#if deleteConfirmId === contract.id}
                              <span
                                class="text-[10px] uppercase font-bold tracking-widest leading-none"
                                >SHRED</span
                              >
                            {:else}
                              <svg
                                class="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="1.5"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            {/if}
                          </button>
                        </div>

                        <!-- Primary Action -->
                        <button
                          type="button"
                          class="px-6 py-2.5 border border-kl-gold text-kl-gold text-xs font-bold tracking-widest hover:bg-kl-gold/10 transition-colors uppercase bg-kl-gold/5"
                          onclick={(e) => {
                            e.stopPropagation();
                            handleAccept(contract.id);
                          }}
                        >
                          [ACCEPT]
                        </button>
                      </div>
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </main>

  <!-- Dead Drop Quick Input -->
  {#if isAcquisition}
    <div
      class="fixed bottom-36 left-0 right-0 flex justify-center z-50 pointer-events-none"
      transition:fade
    >
      <div class="flex flex-col items-center gap-2 animate-bounce">
        <span
          class="text-kl-gold text-xs tracking-widest bg-black/80 px-3 py-1 border border-kl-gold shadow-[0_0_10px_rgba(212,175,55,0.3)]"
        >
          INPUT TARGET
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
  <DeadDrop onAdd={handleDeadDropAdd} />

  <!-- Advanced Options Modal -->
  {#if showCreateForm}
    <div class="fixed inset-0 bg-black/90 z-50 flex items-end">
      <div
        class="w-full bg-neutral-900 border-t border-neutral-700 max-h-[90vh] overflow-y-auto pb-20"
      >
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
              {$page.url.pathname === "/"
                ? "Contract Accepted Immediately - Deadline: Tonight at 23:59"
                : "Deadline: Tonight at 23:59 when accepted"}
            </p>

            <div class="space-y-5">
              <!-- Target Name -->
              <div>
                <label
                  for="target-input"
                  class="block text-xs text-neutral-500 mb-2 tracking-widest"
                >
                  TARGET NAME
                </label>
                <input
                  id="target-input"
                  type="text"
                  bind:value={newContractTitle}
                  placeholder="Input Objective..."
                  class="w-full bg-neutral-800 border border-neutral-700 p-4 text-white placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
                />
              </div>

              <!-- EXECUTIVE ORDER Toggle -->
              <div
                class="flex items-center justify-between p-4 border transition-colors {isHighTable
                  ? 'bg-kl-crimson/20 border-kl-crimson'
                  : 'bg-neutral-800 border-neutral-700'}"
              >
                <span
                  class="text-sm tracking-widest transition-colors {isHighTable
                    ? 'text-kl-crimson'
                    : 'text-neutral-400'}"
                >
                  EXECUTIVE ORDER
                </span>
                <button
                  type="button"
                  aria-label="Toggle Executive Order"
                  class="w-12 h-6 rounded-full transition-colors relative {isHighTable
                    ? 'bg-kl-crimson'
                    : 'bg-neutral-700'}"
                  onclick={() => (isHighTable = !isHighTable)}
                >
                  <div
                    class="absolute top-1 w-4 h-4 rounded-full bg-white transition-all {isHighTable
                      ? 'left-7'
                      : 'left-1'}"
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
