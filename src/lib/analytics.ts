/**
 * PostHog Analytics - Privacy-First Implementation
 * 
 * All text and element attributes are masked in session recordings.
 * We track actions, not content.
 */

import { browser } from '$app/environment';
import {
  PUBLIC_POSTHOG_KEY,
  PUBLIC_POSTHOG_HOST
} from '$env/static/public';

let posthogInstance: typeof import('posthog-js').default | null = null;
let isInitialized = false;

/**
 * Initialize PostHog analytics (call once in +layout.svelte onMount)
 * Safe to call multiple times - will only initialize once
 */
export async function initAnalytics(): Promise<void> {
  if (!browser || isInitialized) return;
  
  // Skip if no API key configured
  if (!PUBLIC_POSTHOG_KEY) {
    console.warn('[Analytics] PostHog key not configured. Skipping initialization.');
    return;
  }

  try {
    const posthog = (await import('posthog-js')).default;
    
    posthog.init(PUBLIC_POSTHOG_KEY, {
      api_host: PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      
      // Privacy Guard: Mask everything in session recordings
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '*', // Mask all text content
      },
      
      // Additional privacy settings
      mask_all_text: true,
      mask_all_element_attributes: true,
      
      // Disable automatic page views (we control when to track)
      capture_pageview: false,
      
      // Respect Do Not Track
      respect_dnt: true,
      
      // Disable personal identifiable info capture
      disable_session_recording: false, // Enable recordings but with masking
      
      // Bootstrap for faster initial load
      bootstrap: {
        distinctID: undefined, // Anonymous by default
      },
      
      // Persistence
      persistence: 'localStorage',
      
      // Load lazily
      loaded: (ph) => {
        // Identify as anonymous user
        if (process.env.NODE_ENV === 'development') {
          console.log('[Analytics] PostHog initialized (dev mode)');
        }
      }
    });

    posthogInstance = posthog;
    isInitialized = true;
  } catch (error) {
    console.error('[Analytics] Failed to initialize PostHog:', error);
  }
}

/**
 * Get the PostHog instance (may be null if not initialized)
 */
function getPostHog() {
  return posthogInstance;
}

// ===== Event Tracking Functions =====

/**
 * Track Dead Drop usage (quick add from input)
 */
export function trackDeadDropUsed(): void {
  getPostHog()?.capture('dead_drop_used');
}

/**
 * Track Dossier filed (full modal creation)
 */
export function trackDossierFiled(properties?: { is_executive_order?: boolean }): void {
  getPostHog()?.capture('dossier_filed', properties);
}

/**
 * Track contract accepted from Registry
 */
export function trackContractAccepted(): void {
  getPostHog()?.capture('contract_accepted');
}

/**
 * Track contract killed (completed)
 * @param timeToKillMs - Time from creation/acceptance to completion in milliseconds
 */
export function trackContractKilled(properties?: { 
  time_to_kill_ms?: number;
  is_executive_order?: boolean;
  method?: 'swipe' | 'spacebar';
}): void {
  getPostHog()?.capture('contract_killed', properties);
}

/**
 * Track contract aborted (sent back to Registry)
 */
export function trackContractAborted(): void {
  getPostHog()?.capture('contract_aborted');
}

/**
 * Track contracts burned (missed deadline)
 * @param count - Number of contracts burned
 */
export function trackContractsBurned(count: number): void {
  if (count > 0) {
    getPostHog()?.capture('contracts_burned', { count });
  }
}

/**
 * Track page views manually
 */
export function trackPageView(pageName: string): void {
  getPostHog()?.capture('$pageview', { page: pageName });
}

/**
 * Track oath completion (onboarding)
 */
export function trackOathCompleted(): void {
  getPostHog()?.capture('oath_completed');
}

/**
 * Identify user (optional - for logged in users)
 * We dont use this for privacy reasons, but its available
 */
export function identifyUser(userId: string, properties?: Record<string, unknown>): void {
  getPostHog()?.identify(userId, properties);
}

/**
 * Reset user identity (on logout)
 */
export function resetAnalytics(): void {
  getPostHog()?.reset();
}

