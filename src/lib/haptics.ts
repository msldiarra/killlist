"use client";

/**
 * Check if vibration API is available
 * (Not supported on iOS Safari)
 */
export function hasHaptics(): boolean {
  return typeof navigator !== "undefined" && "vibrate" in navigator;
}

/**
 * Light haptic feedback
 */
export function hapticLight(): void {
  if (hasHaptics()) {
    navigator.vibrate(10);
  }
}

/**
 * Medium haptic feedback
 */
export function hapticMedium(): void {
  if (hasHaptics()) {
    navigator.vibrate(25);
  }
}

/**
 * Heavy haptic feedback - for important actions
 */
export function hapticHeavy(): void {
  if (hasHaptics()) {
    navigator.vibrate(50);
  }
}

/**
 * Impact haptic - sharp, crisp for completion
 */
export function hapticImpact(): void {
  if (hasHaptics()) {
    navigator.vibrate([30, 20, 50]);
  }
}

/**
 * Error haptic - double buzz
 */
export function hapticError(): void {
  if (hasHaptics()) {
    navigator.vibrate([50, 50, 50]);
  }
}

/**
 * Progressive haptic - increasing intensity
 * Used for hold-to-unlock
 */
export function hapticProgressive(intensity: number): void {
  if (hasHaptics()) {
    const duration = Math.floor(10 + intensity * 40); // 10-50ms
    navigator.vibrate(duration);
  }
}

/**
 * Success pattern - celebratory
 */
export function hapticSuccess(): void {
  if (hasHaptics()) {
    navigator.vibrate([20, 30, 40, 30, 60]);
  }
}

