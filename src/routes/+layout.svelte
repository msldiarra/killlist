<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import TriggerIndicator from "$lib/components/TriggerIndicator.svelte";
  import MissionReportModal from "$lib/components/MissionReportModal.svelte";
  import SplashScreen from "$lib/components/SplashScreen.svelte";
  import MorningReport from "$lib/components/MorningReport.svelte";
  import {
    initializeStores,
    todayActiveContracts,
    killContractOptimistic,
    runBurnProtocolOnStart,
    morningReportOpen,
    morningReportBurned,
    startDeadlineMonitoring,
    stopDeadlineMonitoring,
  } from "$lib/stores/contracts";
  import { playChargeUp, playExecuteSound, unlockAudio } from "$lib/audio";
  import { requestPermission, scheduleDailyBriefing } from "$lib/notifications";
  import {
    initAnalytics,
    trackContractKilled,
    trackContractsBurned,
  } from "$lib/analytics";

  let { children } = $props();

  // Notification Permission State
  let showNotificationPrompt = $state(false);

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
  onMount(() => {
    const splashStart = Date.now();

    // Keyboard event listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger on spacebar, not when typing in inputs
      if (e.code !== "Space") return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (isCharging) return;

      e.preventDefault();
      startCharge();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (!isCharging) return;

      e.preventDefault();
      releaseCharge();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Async initialization
    (async () => {
      // Initialize analytics (privacy-first)
      await initAnalytics();

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
    })();

    // Check Notification Permission
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        showNotificationPrompt = true;
      } else if (Notification.permission === "granted") {
        scheduleDailyBriefing();
      }
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      stopDeadlineMonitoring();
      if (chargeAnimationFrame) {
        cancelAnimationFrame(chargeAnimationFrame);
      }
    };
  });

  function startCharge() {
    isCharging = true;
    chargeStartTime = Date.now();
    unlockAudio();
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
        playExecuteSound();
        killContractOptimistic(topContract.id);

        // Track the kill via spacebar
        const acceptedAt = topContract.acceptedAt
          ? new Date(topContract.acceptedAt).getTime()
          : null;
        const timeToKill = acceptedAt ? Date.now() - acceptedAt : undefined;
        trackContractKilled({
          method: "spacebar",
          time_to_kill_ms: timeToKill,
          is_executive_order: topContract.priority === "highTable",
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

<!-- Morning Report (Daily Performance) -->
<MorningReport />

<!-- Spacebar Trigger Indicator -->
<TriggerIndicator
  isVisible={isCharging}
  {chargeProgress}
  onKill={() => {
    const topContract = $todayActiveContracts[0];
    if (topContract) {
      killContractOptimistic(topContract.id);
    }
  }}
/>

<!-- Secure Comms Prompt -->
{#if showNotificationPrompt}
  <div class="fixed bottom-35 right-4 z-[110]">
    <button
      class="bg-neutral-900 border border-kl-gold/30 text-kl-gold text-[10px] uppercase tracking-widest px-3 py-2 hover:bg-kl-gold/10 transition-colors"
      style="font-family: 'JetBrains Mono', monospace;"
      onclick={async () => {
        const granted = await requestPermission();
        if (granted) showNotificationPrompt = false;
      }}
    >
      [ ENABLE SECURE COMMS ]
    </button>
  </div>
{/if}

{@render children()}
