"use client";

// Audio context singleton
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

// Resume audio context on user interaction (required for mobile)
export async function resumeAudio(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
}

/**
 * Play a synthesized tone
 */
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume: number = 0.3
): void {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available, fail silently
  }
}

/**
 * Play lock sound - heavy mechanical thunk
 */
export function playLock(): void {
  // Low frequency thump
  playTone(80, 0.15, "sine", 0.5);
  // Metallic click
  setTimeout(() => playTone(2000, 0.05, "square", 0.2), 100);
  setTimeout(() => playTone(1500, 0.03, "square", 0.15), 130);
}

/**
 * Play execution sound - silencer shot / knife unsheathing
 */
export function playExecute(): void {
  const ctx = getAudioContext();
  
  try {
    // Create noise for "pfft" silencer effect
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      // Noise with decay
      const decay = 1 - i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * decay * decay;
    }
    
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(3000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.15);
    
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    noiseSource.start();
    noiseSource.stop(ctx.currentTime + 0.15);
    
    // Add subtle metallic ring
    setTimeout(() => playTone(4000, 0.08, "sine", 0.1), 50);
  } catch {
    // Fallback to simple tone
    playTone(200, 0.1, "sine", 0.3);
  }
}

/**
 * Play tick sound - for excommunicado countdown
 */
export function playTick(): void {
  playTone(800, 0.02, "square", 0.15);
}

/**
 * Play heavy bass thrum - for fingerprint hold
 */
export function playThrum(intensity: number = 0.5): void {
  const frequency = 40 + intensity * 30; // 40-70 Hz
  playTone(frequency, 0.3, "sine", 0.3 * intensity);
}

/**
 * Play coin collect sound
 */
export function playCoin(): void {
  playTone(880, 0.1, "sine", 0.2);
  setTimeout(() => playTone(1174, 0.1, "sine", 0.2), 80);
  setTimeout(() => playTone(1568, 0.15, "sine", 0.15), 160);
}

// Ticking state management
let tickingInterval: NodeJS.Timeout | null = null;

export function startTicking(): void {
  // Stop any existing ticking first
  stopTicking();
  
  tickingInterval = setInterval(() => {
    playTick();
  }, 1000);
  
  // Store reference for safety cleanup
  if (typeof window !== "undefined") {
    (window as any).__killListTickingInterval = tickingInterval;
  }
}

export function stopTicking(): void {
  if (tickingInterval) {
    clearInterval(tickingInterval);
    tickingInterval = null;
  }
  // Force clear any lingering intervals (safety check)
  if (typeof window !== "undefined" && (window as any).__killListTickingInterval) {
    clearInterval((window as any).__killListTickingInterval);
    (window as any).__killListTickingInterval = null;
  }
}

export function isTickingActive(): boolean {
  return tickingInterval !== null;
}

