/**
 * Audio Manager - Howler.js Implementation
 * Preloads sound files and provides simple playback functions
 */

import { Howl } from 'howler';
import { browser } from '$app/environment';

// ===== Sound Definitions =====
interface SoundDefinition {
  src: string[];
  volume: number;
  preload: boolean;
}

const SOUNDS: Record<string, SoundDefinition> = {
  load: {
    src: ['/sound/load.mp3'],
    volume: 0.5,
    preload: true
  },
  execute: {
    src: ['/sound/execute.mp3'],
    volume: 1.0,
    preload: true
  },
  upload: {
    src: ['/sound/upload.mp3'],
    volume: 0.5,
    preload: true
  }
};

// ===== Sound Instances =====
const soundInstances: Map<string, Howl> = new Map();
let isInitialized = false;

/**
 * Initialize and preload all sounds
 * Call this once on app startup (e.g., in +layout.svelte)
 */
export function initAudio(): void {
  if (!browser || isInitialized) return;
  
  try {
    // Create Howl instances for each sound
    Object.entries(SOUNDS).forEach(([key, config]) => {
      const howl = new Howl({
        src: config.src,
        volume: config.volume,
        preload: config.preload,
        html5: false, // Use Web Audio API for better performance
        onloaderror: (id, error) => {
          console.warn(`[Audio] Failed to load sound "${key}":`, error);
        }
      });
      
      soundInstances.set(key, howl);
    });
    
    isInitialized = true;
  } catch (error) {
    console.error('[Audio] Failed to initialize audio:', error);
  }
}

/**
 * Get a sound instance by key
 */
function getSound(key: string): Howl | null {
  if (!browser || !isInitialized) {
    console.warn(`[Audio] Audio not initialized. Call initAudio() first.`);
    return null;
  }
  
  return soundInstances.get(key) || null;
}

/**
 * Play a sound by key
 */
function playSound(key: string): void {
  const sound = getSound(key);
  if (!sound) return;
  
  try {
    sound.play();
  } catch (error) {
    console.warn(`[Audio] Failed to play sound "${key}":`, error);
  }
}

// ===== Public API =====

/**
 * Play the "load" sound (weapon cocking / lock and load)
 * Volume: 0.5
 */
export function playLoad(): void {
  playSound('load');
}

/**
 * Play the "execute" sound (gunshot / completion)
 * Volume: 1.0
 */
export function playExecute(): void {
  playSound('execute');
}

/**
 * Play the "upload" sound (data transfer / submission)
 * Volume: 0.5
 */
export function playUpload(): void {
  playSound('upload');
}

/**
 * Check if audio is initialized
 */
export function isAudioInitialized(): boolean {
  return isInitialized;
}

/**
 * Unlock audio (for compatibility with existing code)
 * Howler handles this automatically, but we keep this for API compatibility
 */
export async function unlockAudio(): Promise<void> {
  // Howler automatically handles audio context unlocking
  // But we can trigger a silent play to ensure it's ready
  if (!isInitialized) {
    initAudio();
  }
  
  // Play a silent sound to unlock audio context (iOS requirement)
  const sound = getSound('load');
  if (sound) {
    try {
      const id = sound.play();
      sound.stop(id);
    } catch {
      // Silently fail
    }
  }
}

/**
 * Check if audio is unlocked (for compatibility)
 */
export function isAudioUnlocked(): boolean {
  return isInitialized;
}

// ===== Legacy Compatibility Functions =====
// These are kept for backward compatibility with existing code

export function playLock(): void {
  playLoad();
}

export function playTick(): void {
  // No tick sound defined, silently skip
}

export function playThrum(intensity: number = 0.5): void {
  // No thrum sound defined, silently skip
}

export function playCoin(): void {
  playUpload();
}

export function playChargeUp(): void {
  playLoad();
}

export function playKillConfirm(): void {
  playExecute();
}

export function playAcceptContract(): void {
  playLoad();
}

export function startAmbientDrone(): void {
  // No ambient drone sound defined
}

export function stopAmbientDrone(): void {
  // No ambient drone sound defined
}

export function startTicking(): void {
  // No ticking sound defined
}

export function stopTicking(): void {
  // No ticking sound defined
}

export function isTickingActive(): boolean {
  return false;
}
