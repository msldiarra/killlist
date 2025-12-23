// ===== Audio Manager Singleton =====
// Handles Web Audio API with graceful fallbacks

let audioContext: AudioContext | null = null;
let isUnlocked = false;

/**
 * Get or create the AudioContext singleton
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  
  if (!audioContext) {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContext = new AudioContextClass();
    } catch {
      console.warn('Web Audio API not supported');
      return null;
    }
  }
  return audioContext;
}

/**
 * Unlock AudioContext - MUST be called on first user interaction
 * This is required by iOS/Safari and modern Chrome
 */
export async function unlockAudio(): Promise<void> {
  if (isUnlocked) return;
  
  const ctx = getAudioContext();
  if (!ctx) return;
  
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (e) {
      console.warn('Failed to resume AudioContext:', e);
    }
  }
  
  // Play a silent buffer to fully unlock on iOS
  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch {
    // Ignore errors
  }
  
  isUnlocked = true;
}

/**
 * Check if audio is unlocked
 */
export function isAudioUnlocked(): boolean {
  return isUnlocked;
}

/**
 * Play a synthesized tone
 */
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3
): void {
  const ctx = getAudioContext();
  if (!ctx || ctx.state === 'suspended') return;
  
  try {
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
  playTone(80, 0.15, 'sine', 0.5);
  setTimeout(() => playTone(2000, 0.05, 'square', 0.2), 100);
  setTimeout(() => playTone(1500, 0.03, 'square', 0.15), 130);
}

/**
 * Play execution sound - silencer shot / knife unsheathing
 */
export function playExecute(): void {
  const ctx = getAudioContext();
  if (!ctx || ctx.state === 'suspended') return;

  try {
    // Create noise for "pfft" silencer effect
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const decay = 1 - i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * decay * decay;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
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

    setTimeout(() => playTone(4000, 0.08, 'sine', 0.1), 50);
  } catch {
    playTone(200, 0.1, 'sine', 0.3);
  }
}

/**
 * Play tick sound - for excommunicado countdown
 */
export function playTick(): void {
  playTone(800, 0.02, 'square', 0.15);
}

/**
 * Play heavy bass thrum - for fingerprint hold / charge up
 */
export function playThrum(intensity: number = 0.5): void {
  const frequency = 40 + intensity * 30;
  playTone(frequency, 0.3, 'sine', 0.3 * intensity);
}

/**
 * Play coin collect sound
 */
export function playCoin(): void {
  playTone(880, 0.1, 'sine', 0.2);
  setTimeout(() => playTone(1174, 0.1, 'sine', 0.2), 80);
  setTimeout(() => playTone(1568, 0.15, 'sine', 0.15), 160);
}

/**
 * Play charge up sound - escalating tone
 */
export function playChargeUp(): void {
  playTone(100, 0.5, 'sine', 0.2);
  setTimeout(() => playTone(150, 0.3, 'sine', 0.25), 200);
  setTimeout(() => playTone(200, 0.2, 'sine', 0.3), 400);
}

/**
 * Play kill confirm sound - decisive metallic impact
 */
export function playKillConfirm(): void {
  playTone(60, 0.2, 'sine', 0.5);
  setTimeout(() => playTone(3000, 0.1, 'square', 0.3), 50);
  setTimeout(() => playTone(2000, 0.15, 'sine', 0.2), 100);
}

// ===== Ambient Drone (placeholder) =====
let droneOscillator: OscillatorNode | null = null;
let droneGain: GainNode | null = null;

export function startAmbientDrone(): void {
  const ctx = getAudioContext();
  if (!ctx || ctx.state === 'suspended' || droneOscillator) return;

  try {
    droneOscillator = ctx.createOscillator();
    droneGain = ctx.createGain();

    droneOscillator.type = 'sine';
    droneOscillator.frequency.setValueAtTime(55, ctx.currentTime); // Low A
    droneGain.gain.setValueAtTime(0.02, ctx.currentTime); // Very quiet

    droneOscillator.connect(droneGain);
    droneGain.connect(ctx.destination);
    droneOscillator.start();
  } catch {
    // Ignore
  }
}

export function stopAmbientDrone(): void {
  if (droneOscillator) {
    try {
      droneOscillator.stop();
    } catch {
      // Ignore
    }
    droneOscillator = null;
    droneGain = null;
  }
}

// ===== Ticking for Excommunicado =====
let tickingInterval: ReturnType<typeof setInterval> | null = null;

export function startTicking(): void {
  stopTicking();
  tickingInterval = setInterval(() => {
    playTick();
  }, 1000);
}

export function stopTicking(): void {
  if (tickingInterval) {
    clearInterval(tickingInterval);
    tickingInterval = null;
  }
}

export function isTickingActive(): boolean {
  return tickingInterval !== null;
}
