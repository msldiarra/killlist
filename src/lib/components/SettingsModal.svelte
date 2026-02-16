<script lang="ts">
    import { fade, scale } from "svelte/transition";

    let { isOpen = $bindable(false), onOpenUplink } = $props();

    function handleReportToHQ() {
        isOpen = false;
        onOpenUplink();
    }
</script>

{#if isOpen}
    <div
        class="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-kl-black/80 backdrop-blur-sm"
        transition:fade={{ duration: 200 }}
    >
        <div
            class="w-full max-w-sm bg-kl-black border border-neutral-800 shadow-2xl overflow-hidden"
            transition:scale={{ duration: 300, start: 0.98 }}
        >
            <!-- Header -->
            <div
                class="bg-neutral-900 px-4 py-3 border-b border-neutral-800 flex justify-between items-center"
            >
                <span
                    class="text-[10px] text-kl-gold uppercase tracking-[0.2em] font-mono font-bold"
                    >Terminal Settings</span
                >
                <button
                    onclick={() => (isOpen = false)}
                    class="text-zinc-600 hover:text-white transition-colors p-1"
                    aria-label="Close Settings"
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
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>

            <!-- Content -->
            <div class="p-6 space-y-6">
                <!-- Communications Section -->
                <div class="space-y-3">
                    <div class="flex items-center gap-2">
                        <div class="h-px flex-1 bg-neutral-800"></div>
                        <span
                            class="text-[9px] text-zinc-600 uppercase tracking-widest font-mono"
                            >Communications</span
                        >
                        <div class="h-px flex-1 bg-neutral-800"></div>
                    </div>

                    <button
                        onclick={handleReportToHQ}
                        class="w-full py-4 border-2 border-kl-gold bg-kl-gold/5 text-kl-gold flex items-center justify-center gap-3 transition-all duration-300 hover:bg-kl-gold/10 group shadow-[0_0_15px_rgba(212,175,55,0.1)] hover:shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                    >
                        <svg
                            class="w-5 h-5 transition-transform group-hover:scale-110"
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
                        <span
                            class="text-xs font-mono font-bold tracking-widest uppercase"
                            >[ REPORT TO HQ ]</span
                        >
                    </button>
                </div>

                <!-- Footer Info -->
                <div class="pt-4 text-center">
                    <p
                        class="text-[8px] text-zinc-700 font-mono uppercase tracking-[0.2em]"
                    >
                        Build v0.3.0 // Encryption Active
                    </p>
                </div>
            </div>
        </div>
    </div>
{/if}
