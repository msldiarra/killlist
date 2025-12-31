<script lang="ts">
    import { fade } from "svelte/transition";
    import { unlockAudio, playLoad } from "$lib/audio";
    import { onMount } from "svelte";

    let { onClose }: { onClose: () => void } = $props();

    onMount(() => {
        unlockAudio();
        playLoad();
    });
</script>

<div
    class="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center p-6 text-white overflow-y-auto"
    transition:fade={{ duration: 300 }}
    style="font-family: 'JetBrains Mono', monospace;"
>
    <!-- Content Container -->
    <div
        class="max-w-xl w-full flex flex-col items-center text-center space-y-12 my-auto"
    >
        <!-- Title -->
        <h1
            class="text-3xl md:text-4xl font-bold tracking-widest uppercase border-b-2 border-white pb-4 mb-8"
        >
            THE MANIFESTO
        </h1>

        <!-- Body Text -->
        <div
            class="space-y-8 text-base md:text-lg leading-relaxed text-neutral-300"
        >
            <p>
                Comfort is the enemy. Your other to-do lists are polite. They
                let you reschedule. They let you snooze. They let you lie to
                yourself.
            </p>

            <p class="text-white font-medium">
                Kill List is not safe. A task without a deadline is just a wish.
                If you don't do it today, you didn't want it bad enough.
            </p>

            <div
                class="border-l-4 border-red-600 pl-6 py-2 text-left bg-neutral-900/50"
            >
                <p class="uppercase tracking-wider text-red-500 text-sm mb-1">
                    The Rule:
                </p>
                <p class="text-white">Finish the task, or we burn it.</p>
                <p
                    class="uppercase tracking-wider text-red-500 text-sm mt-4 mb-1"
                >
                    The Result:
                </p>
                <p class="text-white">You execute, or you lose.</p>
            </div>
        </div>

        <!-- Close Action -->
        <button
            onclick={onClose}
            class="mt-12 px-8 py-4 border-2 border-white hover:bg-white hover:text-black transition-all duration-300 font-bold tracking-widest uppercase text-sm md:text-base group"
        >
            <span class="mr-2 group-hover:mr-4 transition-all"
                >I UNDERSTAND. LET ME WORK.</span
            >
            <span>→</span>
        </button>
    </div>
</div>
