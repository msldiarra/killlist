/**
 * Haptic Pattern Definitions
 */
export const HapticPatterns = {
  Light: 10,       // UI Taps
  Medium: 40,      // Accept Contract
  Heavy: [50, 50, 50] // Kill Confirmed
} as const;

export type HapticPattern = number | number[];

/**
 * Trigger haptic feedback (vibration)
 * Safely fails if navigator.vibrate is not supported
 */
export function vibrate(pattern: HapticPattern): void {
  if (typeof window === 'undefined' || !navigator.vibrate) return;

  try {
    navigator.vibrate(pattern);
  } catch {
    // Silently fail if vibration not supported or blocked
  }
}
