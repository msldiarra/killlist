<script lang="ts">
    import { fade, slide, scale } from "svelte/transition";
    import { vaultCount } from "$lib/stores/contracts";
    import { unlockAudio } from "$lib/audio";

    let { isOpen = $bindable(false) } = $props();

    let message = $state("");
    let status = $state<"idle" | "loading" | "success" | "error">("idle");
    let errorMessage = $state("");

    async function transmitIntel() {
        if (!message.trim() || status === "loading") return;

        unlockAudio();
        status = "loading";
        errorMessage = "";

        // Gather Metadata
        const metadata = {
            appVersion: "0.2.0", // Hardcoded for now, could be dynamic
            platform: navigator.platform,
            deviceModel: navigator.userAgent,
            bodyCount: $vaultCount,
        };

        try {
            const response = await fetch("/api/uplink", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message, metadata }),
            });

            const result = await response.json();

            if (response.ok) {
                status = "success";
                setTimeout(() => {
                    isOpen = false;
                    // Reset after closing
                    setTimeout(() => {
                        message = "";
                        status = "idle";
                    }, 500);
                }, 2000);
            } else {
                status = "error";
                errorMessage = result.error || "UPLINK FAILED";
            }
        } catch (err) {
            status = "error";
            errorMessage = "CONNECTION FAILED";
        }
    }

    function autoResize(el: HTMLTextAreaElement) {
        const resize = () => {
            el.style.height = "auto";
            el.style.height = Math.max(120, el.scrollHeight) + "px";
        };
        el.addEventListener("input", resize);
        // Initial resize after mount (tiny delay to ensure style is applied)
        setTimeout(resize, 0);
        return {
            destroy: () => el.removeEventListener("input", resize),
        };
    }
</script>

{#if isOpen}
    <div
        class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-kl-black/90 backdrop-blur-md"
        transition:fade={{ duration: 300 }}
    >
        <div
            class="w-full max-w-lg bg-kl-black border-2 border-neutral-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden"
            transition:scale={{ duration: 400, start: 0.95 }}
        >
            <!-- Header -->
            <div
                class="bg-neutral-900 px-4 py-2 border-b border-neutral-800 flex justify-between items-center"
            >
                <span
                    class="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-mono"
                    >HQ DIRECT CONNECTION</span
                >
                <button
                    onclick={() => (isOpen = false)}
                    class="text-zinc-600 hover:text-white transition-colors p-1"
                    aria-label="Close Uplink"
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

            <!-- Main Input Area -->
            <div class="p-6 space-y-4">
                <div class="relative group">
                    <textarea
                        bind:value={message}
                        use:autoResize
                        placeholder="Describe malfunction or request intel..."
                        class="w-full bg-zinc-950 border border-neutral-800 p-4 text-kl-gold font-mono text-sm focus:outline-none focus:border-kl-gold/50 transition-colors placeholder:text-zinc-800 scrollbar-hide resize-none min-h-[120px]"
                        disabled={status === "loading" || status === "success"}
                    ></textarea>

                    <!-- Tactical corners -->
                    <div
                        class="absolute top-0 left-0 w-2 h-2 border-t border-l border-neutral-700"
                    ></div>
                    <div
                        class="absolute top-0 right-0 w-2 h-2 border-t border-r border-neutral-700"
                    ></div>
                    <div
                        class="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-neutral-700"
                    ></div>
                    <div
                        class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-neutral-700"
                    ></div>
                </div>

                <!-- Action Button -->
                <button
                    onclick={transmitIntel}
                    disabled={status === "loading" ||
                        status === "success" ||
                        !message.trim()}
                    class="w-full py-4 font-mono font-bold tracking-[0.4em] uppercase text-xs transition-all duration-300 relative group overflow-hidden border
            {status === 'idle'
                        ? 'bg-kl-gold/5 border-kl-gold text-kl-gold hover:bg-kl-gold/10'
                        : ''}
            {status === 'loading'
                        ? 'bg-zinc-900 border-zinc-700 text-zinc-500 cursor-wait'
                        : ''}
            {status === 'success'
                        ? 'bg-green-950/20 border-green-600 text-green-500'
                        : ''}
            {status === 'error'
                        ? 'bg-red-950/20 border-red-600 text-red-500'
                        : ''}
          "
                >
                    {#if status === "idle"}
                        [ TRANSMIT REPORT ]
                    {:else if status === "loading"}
                        <span class="animate-pulse">ENCRYPTING...</span>
                    {:else if status === "success"}
                        TRANSMISSION COMPLETE
                    {:else}
                        {errorMessage}
                    {/if}

                    <!-- Scanning line effect for loading -->
                    {#if status === "loading"}
                        <div
                            class="absolute inset-0 bg-kl-gold/5 animate-[scan_2s_linear_infinite]"
                        ></div>
                    {/if}
                </button>

                <!-- Status Details -->
                <div
                    class="flex justify-between items-center text-[8px] tracking-widest text-zinc-600 font-mono uppercase"
                >
                    <span>FREQ: 433.92MHZ</span>
                    <span>ESTABLISHING SECURE TUNNEL...</span>
                    <span>RSA-4096 ACTIVE</span>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    @keyframes scan {
        0% {
            transform: translateY(-100%);
        }
        100% {
            transform: translateY(100%);
        }
    }

    /* Tactical scanline texture */
    textarea {
        background-image: linear-gradient(
                rgba(18, 16, 16, 0) 50%,
                rgba(0, 0, 0, 0.25) 50%
            ),
            linear-gradient(
                90deg,
                rgba(255, 0, 0, 0.06),
                rgba(0, 255, 0, 0.02),
                rgba(0, 0, 255, 0.06)
            );
        background-size:
            100% 2px,
            3px 100%;
    }

    ::-webkit-scrollbar {
        display: none;
    }
</style>
