<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import TriggerIndicator from '$lib/components/TriggerIndicator.svelte';
  import MissionReportModal from '$lib/components/MissionReportModal.svelte';
  import SplashScreen from '$lib/components/SplashScreen.svelte';
  import {
    initializeStores,
    todayActiveContracts,
    killContractOptimistic,
    runBurnProtocolOnStart,
    morningReportOpen,
    morningReportBurned,
    startDeadlineMonitoring,
    stopDeadlineMonitoring
  } from '$lib/stores/contracts';
  import { playChargeUp, playKillConfirm, initAudio } from '$lib/audio';
  import { initAnalytics, trackContractKilled, trackContractsBurned } from '$lib/analytics';

  let { children } = $props();

  // Splash screen state
  let showSplash = $state(true);
  let splashVisible = $state(true);
  let appReady = $state(false);

  // Spacebar trigger state
  let isCharging = $state(false);
  let chargeProgress = $state(0);
  let chargeStartTime = 0;
  let chargeAnimationFrame: number | null = null;

  const CHARGE_DURATION = 800; // ms to fully charge
  const SPLASH_MIN_DURATION = 1500; // Minimum splash display time (1.5s)

  // Initialize stores and run burn protocol on mount
  onMount(async () => {
    const splashStart = Date.now();
    
    // Initialize analytics (privacy-first)
    await initAnalytics();
    
    // Initialize audio (preload sounds)
    initAudio();
    
    // Initialize app
    await initializeStores();
    const burnedCount = await runBurnProtocolOnStart();
    
    // Track burned contracts if any
    if (burnedCount && burnedCount > 0) {
      trackContractsBurned(burnedCount);
    }
    
    // Start real-time deadline monitoring (checks every 30s)
    startDeadlineMonitoring();
    
    // Ensure splash shows for minimum duration
    const elapsed = Date.now() - splashStart;
    const remainingTime = Math.max(0, SPLASH_MIN_DURATION - elapsed);
    
    setTimeout(() => {
      // Start fade out
      splashVisible = false;
    }, remainingTime);

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
      stopDeadlineMonitoring();
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
      const topContract = $todayActiveContracts[0];
      if (topContract) {
        playKillConfirm();
        killContractOptimistic(topContract.id);
        
        // Track the kill via spacebar
        const acceptedAt = topContract.acceptedAt ? new Date(topContract.acceptedAt).getTime() : null;
        const timeToKill = acceptedAt ? Date.now() - acceptedAt : undefined;
        trackContractKilled({
          method: 'spacebar',
          time_to_kill_ms: timeToKill,
          is_executive_order: topContract.priority === 'highTable'
        });
      }
    }

    isCharging = false;
    chargeProgress = 0;
  }
</script>

<svelte:head>
  <meta name="theme-color" content="#DC2626" />
</svelte:head>

<!-- Splash Screen (Gatekeeper) -->
{#if showSplash}
  <SplashScreen
    visible={splashVisible}
    onFadeComplete={() => {
      showSplash = false;
      appReady = true;
    }}
  />
{/if}

<!-- Mission Report Modal (Burn Protocol) -->
{#if $morningReportOpen}
  <MissionReportModal
    burnedContracts={$morningReportBurned}
    onClose={() => morningReportOpen.set(false)}
  />
{/if}

<!-- Spacebar Trigger Indicator -->
<TriggerIndicator
  isVisible={isCharging}
  chargeProgress={chargeProgress}
  onKill={() => {
    const topContract = $todayActiveContracts[0];
    if (topContract) {
      killContractOptimistic(topContract.id);
    }
  }}
/>

{@render children()}
