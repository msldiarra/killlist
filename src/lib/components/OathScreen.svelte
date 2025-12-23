<script lang="ts">
  import { unlockAudio, playLock } from '$lib/audio';

  interface Props {
    onComplete: () => void;
  }

  let { onComplete }: Props = $props();

  let isHolding = $state(false);
  let holdProgress = $state(0);
  let isCompleted = $state(false);

  const HOLD_DURATION = 2000; // 2 seconds to complete oath
  let holdStartTime = 0;
  let animationFrame: number | null = null;

  function startHold() {
    if (isCompleted) return;
    
    isHolding = true;
    holdStartTime = Date.now();
    
    // Unlock audio on first interaction
    unlockAudio();
    
    animateProgress();
  }

  function animateProgress() {
    if (!isHolding) return;
    
    const elapsed = Date.now() - holdStartTime;
    holdProgress = Math.min(1, elapsed / HOLD_DURATION);
    
    if (holdProgress >= 1) {
      completeOath();
    } else {
      animationFrame = requestAnimationFrame(animateProgress);
    }
  }

  function stopHold() {
    if (isCompleted) return;
    
    isHolding = false;
    
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    
    // Spring back if not completed
    if (holdProgress < 1) {
      holdProgress = 0;
    }
  }

  function completeOath() {
    isCompleted = true;
    playLock();
    
    // Wait for animation then transition
    setTimeout(() => {
      onComplete();
    }, 800);
  }

  // Computed glow intensity
  const glowIntensity = $derived(holdProgress * 0.6);
</script>

<div
  class="fixed inset-0 bg-kl-black flex flex-col items-center justify-center z-50"
  ontouchstart={startHold}
  ontouchend={stopHold}
  ontouchcancel={stopHold}
  onmousedown={startHold}
  onmouseup={stopHold}
  onmouseleave={stopHold}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === ' ' && startHold()}
  onkeyup={(e) => e.key === ' ' && stopHold()}
>
  <!-- Title -->
  <h1
    class="font-body text-xl tracking-widest mb-16 transition-opacity duration-300"
    style="color: rgba(212, 175, 55, {0.6 + holdProgress * 0.4}); font-family: 'JetBrains Mono', monospace;"
  >
    Serve the High Table.
  </h1>

  <!-- Fingerprint Scanner -->
  <div class="relative w-48 h-48 mb-16">
    <!-- Scanner surface -->
    <div
      class="absolute inset-0 rounded-lg overflow-hidden border transition-all duration-300"
      style="
        background: linear-gradient(135deg, rgba(80, 20, 20, {0.3 + holdProgress * 0.4}) 0%, rgba(40, 10, 10, {0.2 + holdProgress * 0.3}) 100%);
        border-color: rgba(153, 0, 0, {0.3 + holdProgress * 0.4});
        box-shadow: 0 0 {holdProgress * 40}px rgba(153, 0, 0, {holdProgress * 0.5});
      "
    >
      <!-- Grid texture -->
      <div
        class="absolute inset-0 opacity-10"
        style="background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(100, 100, 100, 0.3) 2px, rgba(100, 100, 100, 0.3) 3px), repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(100, 100, 100, 0.3) 2px, rgba(100, 100, 100, 0.3) 3px);"
      ></div>
    </div>

    <!-- Fingerprint SVG -->
    <svg
      viewBox="0 0 512 512"
      class="absolute inset-8 w-32 h-32"
      style="filter: drop-shadow(0 0 {holdProgress * 20}px rgba(220, 38, 38, {holdProgress * 0.8}));"
    >
      <path 
        style="fill: rgba(180, 60, 60, {0.5 + holdProgress * 0.5});"
        d="M390.42,75.28a10.45,10.45,0,0,1-5.32-1.44C340.72,50.08,302.35,40,256.35,40c-45.77,0-89.23,11.28-128.76,33.84C122,77,115.11,74.8,111.87,69a12.4,12.4,0,0,1,4.63-16.32A281.81,281.81,0,0,1,256.35,16c49.23,0,92.23,11.28,139.39,36.48a12,12,0,0,1,4.85,16.08A11.3,11.3,0,0,1,390.42,75.28Zm-330.79,126a11.73,11.73,0,0,1-6.7-2.16,12.26,12.26,0,0,1-2.78-16.8c22.89-33.6,52-60,86.69-78.48C209.42,65,302.35,64.72,375.16,103.6c34.68,18.48,63.8,44.64,86.69,78a12.29,12.29,0,0,1-2.78,16.8,11.26,11.26,0,0,1-16.18-2.88c-20.8-30.24-47.15-54-78.36-70.56-66.34-35.28-151.18-35.28-217.29.24-31.44,16.8-57.79,40.8-78.59,71A10,10,0,0,1,59.63,201.28ZM204.1,491a10.66,10.66,0,0,1-8.09-3.6C175.9,466.48,165,453,149.55,424c-16-29.52-24.27-65.52-24.27-104.16,0-71.28,58.71-129.36,130.84-129.36S387,248.56,387,319.84a11.56,11.56,0,1,1-23.11,0c0-58.08-48.32-105.36-107.72-105.36S148.4,261.76,148.4,319.84c0,34.56,7.39,66.48,21.49,92.4,14.8,27.6,25,39.36,42.77,58.08a12.67,12.67,0,0,1,0,17A12.44,12.44,0,0,1,204.1,491Zm165.75-44.4c-27.51,0-51.78-7.2-71.66-21.36a129.1,129.1,0,0,1-55-105.36,11.57,11.57,0,1,1,23.12,0,104.28,104.28,0,0,0,44.84,85.44c16.41,11.52,35.6,17,58.72,17a147.41,147.41,0,0,0,24-2.4c6.24-1.2,12.25,3.12,13.4,9.84a11.92,11.92,0,0,1-9.47,13.92A152.28,152.28,0,0,1,369.85,446.56ZM323.38,496a13,13,0,0,1-3-.48c-36.76-10.56-60.8-24.72-86-50.4-32.37-33.36-50.16-77.76-50.16-125.28,0-38.88,31.9-70.56,71.19-70.56s71.2,31.68,71.2,70.56c0,25.68,21.5,46.56,48.08,46.56s48.08-20.88,48.08-46.56c0-90.48-75.13-163.92-167.59-163.92-65.65,0-125.75,37.92-152.79,96.72-9,19.44-13.64,42.24-13.64,67.2,0,18.72,1.61,48.24,15.48,86.64,2.32,6.24-.69,13.2-6.7,15.36a11.34,11.34,0,0,1-14.79-7,276.39,276.39,0,0,1-16.88-95c0-28.8,5.32-55,15.72-77.76,30.75-67,98.94-110.4,173.6-110.4,105.18,0,190.71,84.24,190.71,187.92,0,38.88-31.9,70.56-71.2,70.56s-71.2-31.68-71.2-70.56C303.5,293.92,282,273,255.42,273s-48.08,20.88-48.08,46.56c0,41,15.26,79.44,43.23,108.24,22,22.56,43,35,75.59,44.4,6.24,1.68,9.71,8.4,8.09,14.64A11.39,11.39,0,0,1,323.38,496Z"
      />
    </svg>

    <!-- Scan line animation -->
    {#if isHolding}
      <div
        class="absolute left-6 right-6 h-1 rounded-full transition-none"
        style="
          top: {6 + (1 - holdProgress) * 144}px;
          background: linear-gradient(90deg, transparent, rgba(220, 38, 38, 0.8), transparent);
          box-shadow: 0 0 10px rgba(220, 38, 38, 0.6);
        "
      ></div>
    {/if}

    <!-- Completion flash -->
    {#if isCompleted}
      <div class="absolute inset-0 bg-kl-crimson rounded-lg animate-pulse opacity-30"></div>
    {/if}
  </div>

  <!-- Instruction text -->
  <p
    class="font-body text-sm tracking-wider transition-opacity duration-300"
    style="color: rgba(139, 115, 85, {0.5 + holdProgress * 0.5}); font-family: 'JetBrains Mono', monospace;"
  >
    {#if isCompleted}
      Oath accepted
    {:else}
      Press and hold to confirm
    {/if}
  </p>
</div>
