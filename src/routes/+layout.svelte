<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import TriggerIndicator from '$lib/components/TriggerIndicator.svelte';
  import {
    initializeStores,
    activeContracts,
    completeContractOptimistic,
    settings
  } from '$lib/stores/contracts';
  import { playChargeUp, playKillConfirm, startTicking, stopTicking } from '$lib/audio';

  let { children } = $props();

  // Spacebar trigger state
  let isCharging = $state(false);
  let chargeProgress = $state(0);
  let chargeStartTime = 0;
  let chargeAnimationFrame: number | null = null;

  const CHARGE_DURATION = 800; // ms to fully charge

  // Initialize stores on mount
  onMount(() => {
    initializeStores();

    // Keyboard event listeners for spacebar trigger
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger on spacebar, not when typing in inputs
      if (e.code !== 'Space') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (isCharging) return;

      e.preventDefault();
      startCharge();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      if (!isCharging) return;

      e.preventDefault();
      releaseCharge();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (chargeAnimationFrame) {
        cancelAnimationFrame(chargeAnimationFrame);
      }
    };
  });

  function startCharge() {
    isCharging = true;
    chargeStartTime = Date.now();
    playChargeUp();
    animateCharge();
  }

  function animateCharge() {
    if (!isCharging) return;

    const elapsed = Date.now() - chargeStartTime;
    chargeProgress = Math.min(1, elapsed / CHARGE_DURATION);

    if (chargeProgress < 1) {
      chargeAnimationFrame = requestAnimationFrame(animateCharge);
    }
  }

  function releaseCharge() {
    if (chargeAnimationFrame) {
      cancelAnimationFrame(chargeAnimationFrame);
      chargeAnimationFrame = null;
    }

    // If fully charged, execute kill on top contract
    if (chargeProgress >= 1) {
      const topContract = $activeContracts[0];
      if (topContract) {
        playKillConfirm();
        completeContractOptimistic(topContract.id);
      }
    }

    isCharging = false;
    chargeProgress = 0;
  }

  // Watch for excommunicado state (overdue contracts)
  $effect(() => {
    if (!browser) return;

    const hasOverdue = $activeContracts.some((c) => new Date() > new Date(c.deadlineAt));

    if (hasOverdue) {
      document.documentElement.classList.add('excommunicado');
      startTicking();
    } else {
      document.documentElement.classList.remove('excommunicado');
      stopTicking();
    }

    return () => {
      document.documentElement.classList.remove('excommunicado');
      stopTicking();
    };
  });
</script>

<svelte:head>
  <meta name="theme-color" content="#DC2626" />
</svelte:head>

<!-- Spacebar Trigger Indicator -->
<TriggerIndicator
  isVisible={isCharging}
  chargeProgress={chargeProgress}
  onKill={() => {
    const topContract = $activeContracts[0];
    if (topContract) {
      completeContractOptimistic(topContract.id);
    }
  }}
/>

{@render children()}

