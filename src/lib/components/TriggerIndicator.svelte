<script lang="ts">
  import { playChargeUp, playKillConfirm } from '$lib/audio';

  interface Props {
    isVisible: boolean;
    chargeProgress: number; // 0 to 1
    onKill: () => void;
  }

  let { isVisible, chargeProgress, onKill }: Props = $props();

  // Derived
  const isCharged = $derived(chargeProgress >= 1);
  const ringScale = $derived(0.8 + chargeProgress * 0.4);
  const glowIntensity = $derived(chargeProgress * 30);
</script>

{#if isVisible}
  <div class="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
    <!-- Outer ring container -->
    <div class="relative w-20 h-20">
      <!-- Background circle -->
      <div
        class="absolute inset-0 rounded-full border-2 transition-all duration-100"
        style="
          border-color: rgba({isCharged ? '220, 38, 38' : '212, 175, 55'}, {0.3 + chargeProgress * 0.5});
          transform: scale({ringScale});
          box-shadow: 0 0 {glowIntensity}px rgba({isCharged ? '220, 38, 38' : '212, 175, 55'}, {chargeProgress * 0.6});
        "
      ></div>

      <!-- Progress arc -->
      <svg class="absolute inset-0 w-20 h-20 -rotate-90">
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke="rgba(212, 175, 55, 0.1)"
          stroke-width="4"
        />
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke={isCharged ? '#DC2626' : '#D4AF37'}
          stroke-width="4"
          stroke-linecap="round"
          stroke-dasharray={2 * Math.PI * 36}
          stroke-dashoffset={2 * Math.PI * 36 * (1 - chargeProgress)}
          class="transition-colors duration-200"
        />
      </svg>

      <!-- Center icon -->
      <div
        class="absolute inset-0 flex items-center justify-center transition-transform duration-100"
        style="transform: scale({0.9 + chargeProgress * 0.2});"
      >
        {#if isCharged}
          <!-- Kill ready icon (crosshair) -->
          <svg class="w-8 h-8 text-kl-blood" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke-width="1.5" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        {:else}
          <!-- Charging icon (target) -->
          <svg class="w-6 h-6 text-kl-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" stroke-width="2" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke-width="2" stroke-linecap="round" />
          </svg>
        {/if}
      </div>

      <!-- Pulse rings when charged -->
      {#if isCharged}
        <div class="absolute inset-0 rounded-full border border-kl-blood animate-charge-ring"></div>
        <div class="absolute inset-0 rounded-full border border-kl-blood animate-charge-ring" style="animation-delay: 0.3s;"></div>
      {/if}
    </div>

    <!-- Label -->
    <div
      class="text-center mt-2 font-body text-xs uppercase tracking-wider transition-colors duration-200"
      style="color: {isCharged ? 'var(--color-kl-blood)' : 'var(--color-kl-gold-dim)'};"
    >
      {isCharged ? 'RELEASE TO EXECUTE' : 'CHARGING...'}
    </div>
  </div>
{/if}

