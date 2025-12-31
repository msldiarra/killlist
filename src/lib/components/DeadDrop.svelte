<script lang="ts">
  import { tick } from "svelte";
  import { addContract } from "$lib/stores/contracts";
  import { playUpload, unlockAudio } from "$lib/audio";
  import { trackDeadDropUsed } from "$lib/analytics";

  // Props
  let {
    onAdd,
    forceActive = false,
  }: {
    onAdd?: (title: string) => void;
    forceActive?: boolean;
  } = $props();

  // State
  let inputElement: HTMLInputElement;
  let inputValue = $state("");
  let isScrambling = $state(false);
  let scrambledText = $state("");
  let flyingItem = $state<{ text: string; visible: boolean } | null>(null);

  // Executive Order State
  let isExecutiveOrder = $state(false);

  // Scramble characters for the encryption effect
  const SCRAMBLE_CHARS =
    "!@#$%^&*()_+-=[]{}|;:,.<>?/~`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  function getRandomChar(): string {
    return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
  }

  function generateScrambledText(length: number): string {
    const result: string[] = [];
    for (let i = 0; i < length; i++) {
      result.push(getRandomChar());
    }
    return result.join("");
  }

  // Handle text input behavior
  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    inputValue = target.value;

    const trimmed = inputValue.trim();
    // Check start or end for "!"
    const hasMarker = trimmed.startsWith("!") || trimmed.endsWith("!");

    if (hasMarker) {
      if (!isExecutiveOrder) {
        isExecutiveOrder = true;
        unlockAudio(); // Feedback for activation
      }
    } else {
      // If marker is removed manually, turn off executive order
      if (isExecutiveOrder) {
        isExecutiveOrder = false;
      }
    }
  }

  // Toggle via Icon
  async function toggleExecutiveOrder() {
    isExecutiveOrder = !isExecutiveOrder;

    if (isExecutiveOrder) {
      // Append " !"
      inputValue = inputValue.trimEnd() + " !";
      unlockAudio();
    } else {
      // Remove "!" from start and end
      inputValue = inputValue
        .replace(/^\s*!\s*/, "") // Leading !
        .replace(/\s*!\s*$/, ""); // Trailing !
    }

    if (inputElement) {
      await tick();
      inputElement.focus();
      // Move cursor to end
      inputElement.selectionStart = inputElement.selectionEnd =
        inputElement.value.length;
    }
  }

  async function handleSubmit() {
    // Clean title: remove leading/trailing "!" and whitespace
    let title = inputValue.replace(/^[\s!]+|[\s!]+$/g, "").trim();

    // Strip trailing "!" if it exists (handles both UI toggle and manual type)
    if (title.endsWith("!")) {
      // This fallback is not needed with the regex above but keeping logic clean
      title = title.replace(/!+$/, "").trim();
    }

    if (!title || isScrambling) return;

    // Capture priority before clearing
    const priority = isExecutiveOrder ? "highTable" : "normal";

    // Phase 1: LOCK - Freeze the input
    isScrambling = true;
    scrambledText = title; // Start with original text visible in overlay

    // Phase 2: SCRAMBLE - Rapidly change characters for 0.4s
    const scrambleDuration = 400;
    const scrambleInterval = 40; // Change every 40ms for rapid effect
    const scrambleIterations = scrambleDuration / scrambleInterval;

    for (let i = 0; i < scrambleIterations; i++) {
      scrambledText = generateScrambledText(title.length);
      await new Promise((resolve) => setTimeout(resolve, scrambleInterval));
    }

    // Phase 3: UPLOAD - Text fades out + slides up
    flyingItem = { text: title, visible: true };

    // Play sound immediately when upload animation starts
    unlockAudio();
    playUpload();

    // Phase 4: CLEAR - Input clears and unlocks
    // Determine destination: Executive Orders bypass the Registry
    // If forceActive is true, ALWAYS go to active.
    // Otherwise, check executive order.
    // We must check this BEFORE resetting the state variable
    const status = forceActive || isExecutiveOrder ? "active" : "registry";

    // Reset state
    inputValue = "";
    scrambledText = "";
    isScrambling = false;
    isExecutiveOrder = false;

    // Add to store
    addContract(title, priority, status);
    onAdd?.(title);

    // Track analytics
    trackDeadDropUsed();

    // Wait for fly animation to complete, then hide
    await new Promise((resolve) => setTimeout(resolve, 500));
    flyingItem = null;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }
</script>

<!-- Dead Drop Input Container -->
<div
  class="fixed bottom-16 left-0 right-0 z-40 px-4 pb-2"
  style="font-family: 'JetBrains Mono', monospace;"
>
  <!-- Flying Item Animation -->
  {#if flyingItem?.visible}
    <div class="absolute left-4 right-4 bottom-full mb-2 pointer-events-none">
      <div
        class="bg-neutral-800 border border-kl-gold/40 px-4 py-3 text-kl-gold text-sm
          animate-fly-up opacity-0"
      >
        <span class="text-kl-gold/50 mr-2">+</span>
        {flyingItem.text}
      </div>
    </div>
  {/if}

  <!-- Input Field -->
  <div class="relative">
    <!-- Scramble overlay -->
    {#if isScrambling && scrambledText}
      <div
        class="absolute inset-0 bg-neutral-900 border border-kl-gold/30 px-4 py-3
          flex items-center text-kl-gold text-sm pointer-events-none z-10"
      >
        <span class="text-kl-gold/50 mr-2 animate-pulse">⟩</span>
        <span class="text-green-400 font-mono tracking-wider"
          >{scrambledText}</span
        >
        <span class="animate-blink ml-1">_</span>
      </div>
    {/if}

    <!-- Actual input -->
    <div
      class="flex items-center bg-neutral-900 border transition-colors duration-300
      {isExecutiveOrder
        ? 'border-kl-gold shadow-[0_0_10px_rgba(212,175,55,0.2)]'
        : 'border-neutral-700 focus-within:border-kl-gold/50'}"
    >
      <span class="text-kl-gold/40 pl-4 text-sm">⟩</span>
      <input
        type="text"
        bind:this={inputElement}
        bind:value={inputValue}
        oninput={handleInput}
        onkeydown={handleKeyDown}
        placeholder="Input Objective..."
        disabled={isScrambling}
        class="flex-1 bg-transparent px-3 py-3 text-white text-sm placeholder:text-neutral-600
          focus:outline-none disabled:opacity-50 pr-10"
      />

      <!-- Executive Order Bolt Toggle -->
      <button
        type="button"
        class="absolute right-12 top-1/2 -translate-y-1/2 p-2 transition-colors duration-300"
        onclick={toggleExecutiveOrder}
        disabled={isScrambling}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-4 h-4 transition-colors duration-300 {isExecutiveOrder
            ? 'text-kl-gold fill-kl-gold'
            : 'text-[#555555]'}"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
          fill="none"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </button>

      <button
        type="button"
        onclick={handleSubmit}
        disabled={!inputValue.trim() || isScrambling}
        class="px-4 py-3 text-kl-gold/50 hover:text-kl-gold transition-colors disabled:opacity-30 border-l border-neutral-800"
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
            d="M12 4v16m0-16l-4 4m4-4l4 4"
          />
        </svg>
      </button>
    </div>
  </div>
</div>

<style>
  @keyframes fly-up {
    0% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    50% {
      opacity: 1;
      transform: translateY(-50px) scale(0.95);
    }
    100% {
      opacity: 0;
      transform: translateY(-100px) scale(0.9);
    }
  }

  .animate-fly-up {
    animation: fly-up 0.5s ease-out forwards;
  }

  @keyframes blink {
    0%,
    50% {
      opacity: 1;
    }
    51%,
    100% {
      opacity: 0;
    }
  }

  .animate-blink {
    animation: blink 0.8s infinite;
  }
</style>
