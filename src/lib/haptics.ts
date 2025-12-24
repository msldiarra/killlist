/**
 * Haptics Manager - Vibration API Wrapper
 * Provides haptic feedback functions with graceful fallbacks
 */

import { browser } from '$app/environment';

/**
 * Check if vibration API is available
 */
function isVibrationSupported(): boolean {
  return browser && typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Vibrate with a custom pattern
 * @param pattern - Vibration pattern (array of milliseconds)
 * @returns true if vibration was successful, false otherwise
 */
export function vibrate(pattern: number | number[]): boolean {
  if (!isVibrationSupported()) {
    return false;
  }
  
  try {
    return navigator.vibrate(pattern);
  } catch (error) {
    console.warn('[Haptics] Failed to vibrate:', error);
    return false;
  }
}

/**
 * Stop any ongoing vibration
 */
export function stopVibration(): void {
  if (isVibrationSupported()) {
    try {
      navigator.vibrate(0);
    } catch {
      // Silently fail
    }
  }
}

// ===== Preset Patterns =====

/**
 * Heavy impact feedback
 * Pattern: [50] - Single strong vibration
 */
export function impact(): boolean {
  return vibrate([50]);
}

/**
 * Light click feedback
 * Pattern: [10] - Single short vibration
 */
export function click(): boolean {
  return vibrate([10]);
}

/**
 * Success flutter feedback
 * Pattern: [10, 30, 10] - Quick flutter pattern
 */
export function success(): boolean {
  return vibrate([10, 30, 10]);
}

/**
 * Legacy compatibility function
 * @param intensity - 'light' | 'medium' | 'heavy'
 */
export function triggerHapticFeedback(intensity: 'light' | 'medium' | 'heavy' = 'heavy'): boolean {
  const patterns: Record<string, number[]> = {
    light: [10],
    medium: [20, 10, 20],
    heavy: [50, 20, 50, 20, 50]
  };
  
  return vibrate(patterns[intensity]);
}

