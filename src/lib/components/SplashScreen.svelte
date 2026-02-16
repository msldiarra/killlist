<script lang="ts">
  // Props
  let {
    visible = true,
    onFadeComplete,
  }: {
    visible?: boolean;
    onFadeComplete?: () => void;
  } = $props();

  // Track fade state
  let isFading = $state(false);

  $effect(() => {
    if (!visible && !isFading) {
      isFading = true;
      // Wait for fade animation to complete
      setTimeout(() => {
        onFadeComplete?.();
      }, 500);
    }
  });
</script>

{#if visible || isFading}
  <div
    class="fixed inset-0 z-[100] transition-opacity duration-500
      {isFading ? 'opacity-0' : 'opacity-100'}"
    style="background-image: url('/logo.png'); background-size: cover; background-position: center; background-repeat: no-repeat;"
  >
    <!-- Loading indicator -->
    <div
      class="absolute bottom-24 left-0 right-0 flex flex-col items-center gap-3"
      style="font-family: 'JetBrains Mono', monospace;"
    >
      <div class="flex gap-1">
        <div
          class="w-1.5 h-1.5 bg-kl-gold/60 rounded-full animate-bounce"
          style="animation-delay: 0ms;"
        ></div>
        <div
          class="w-1.5 h-1.5 bg-kl-gold/60 rounded-full animate-bounce"
          style="animation-delay: 150ms;"
        ></div>
        <div
          class="w-1.5 h-1.5 bg-kl-gold/60 rounded-full animate-bounce"
          style="animation-delay: 300ms;"
        ></div>
      </div>
      <span class="text-kl-gold/40 text-xs tracking-widest uppercase"
        >Initializing</span
      >
    </div>
  </div>
{/if}

<style>
  @keyframes pulse-slow {
    0%,
    100% {
      opacity: 0.3;
      transform: scale(1);
    }
    50% {
      opacity: 0.6;
      transform: scale(1.05);
    }
  }
</style>
