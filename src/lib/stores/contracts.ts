import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import {
  db,
  type Contract,
  type AppSettings,
  DEFAULT_SETTINGS,
  generateId,
  getSettings,
  getTodayActiveContracts,
  getKilledContracts,
  getAllContracts,
  getClientTodayISODate
} from '$lib/db';
import { checkBurnProtocol, deleteBurnedContracts } from '$lib/burnProtocol';

// ===== Core Stores =====
export const contracts = writable<Contract[]>([]);
export const settings = writable<AppSettings>(DEFAULT_SETTINGS);
export const isLoading = writable(true);

// ===== Today Store =====
export const todayDate = writable(getClientTodayISODate());

export function refreshTodayDate(): void {
  todayDate.set(getClientTodayISODate());
}

// ===== Morning Report State (Burn Protocol) =====
export const morningReportOpen = writable(false);
export const morningReportBurned = writable<Contract[]>([]);

// ===== Derived Stores =====

// Registry contracts (backlog - no timer yet)
export const registryContracts = derived(contracts, ($contracts) =>
  $contracts
    .filter((c) => c.status === 'registry')
    .sort((a, b) => {
      // Sort by creation date, newest first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
);

// Registry count
export const registryCount = derived(registryContracts, ($registry) => $registry.length);

// Today's active contracts only
export const todayActiveContracts = derived(
  [contracts, todayDate],
  ([$contracts, $today]) =>
    $contracts
      .filter((c) => c.targetDate === $today && c.status === 'active')
      .sort((a, b) => {
        // Sort by terminusTime if available
        const aTime = a.terminusTime || '23:59';
        const bTime = b.terminusTime || '23:59';
        return aTime.localeCompare(bTime);
      })
);

// Killed (completed) contracts for archive
export const killedContracts = derived(contracts, ($contracts) =>
  $contracts
    .filter((c) => c.status === 'killed')
    .sort((a, b) => {
      const aTime = a.killedAt || a.createdAt;
      const bTime = b.killedAt || b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    })
);

// Vault count
export const vaultCount = derived(settings, ($settings) => $settings.vaultCount);

// Open count (today's active)
export const openCount = derived(todayActiveContracts, ($active) => $active.length);

// ===== Initialize Stores from DB =====
export async function initializeStores(): Promise<void> {
  if (!browser) return;
  
  isLoading.set(true);
  
  try {
    // Refresh today's date
    refreshTodayDate();
    
    const [loadedSettings, allContracts] = await Promise.all([
      getSettings(),
      getAllContracts()
    ]);
    
    settings.set(loadedSettings);
    contracts.set(allContracts);
  } catch (error) {
    console.error('Failed to initialize stores:', error);
  } finally {
    isLoading.set(false);
  }
}

// ===== Burn Protocol on App Start =====
/**
 * Run the Burn Protocol on app start.
 * - Burns stale active contracts from previous days
 * - Opens Mission Report modal if any were burned
 * @returns Number of contracts burned
 */
export async function runBurnProtocolOnStart(): Promise<number> {
  if (!browser) return 0;

  // Refresh today's date
  refreshTodayDate();

  // Run the cleaner
  const burned = await checkBurnProtocol();

  if (burned.length > 0) {
    // Update local store to reflect burned status
    contracts.update((list) =>
      list.map((c) =>
        burned.some((b) => b.id === c.id) ? { ...c, status: 'burned' as const } : c
      )
    );

    // Open the Mission Report modal
    morningReportBurned.set(burned);
    morningReportOpen.set(true);
  }
  
  return burned.length;
}

/**
 * Clean House - Delete all burned contracts and close the Mission Report modal.
 * Called when user acknowledges the burned tasks.
 */
export async function cleanHouse(): Promise<void> {
  if (!browser) return;

  // Get the burned contract IDs
  let burnedIds: string[] = [];
  morningReportBurned.subscribe((burned) => {
    burnedIds = burned.map((c) => c.id);
  })();

  // Delete from database
  await deleteBurnedContracts(burnedIds);

  // Remove from local store
  contracts.update((list) => list.filter((c) => !burnedIds.includes(c.id)));

  // Close modal and clear state
  morningReportOpen.set(false);
  morningReportBurned.set([]);
}

// ===== Optimistic Contract Operations =====

/**
 * Add a new contract to the Registry (backlog) - Optimistic UI pattern
 * Contracts start in 'registry' status with no targetDate.
 * The 24h burn timer only starts when accepted.
 * Deadline is always 23:59 (end of day) - user doesn't choose.
 */
/**
 * Create a new contract.
 * @param title - Contract title
 * @param priority - Priority level (normal or highTable)
 * @param status - Contract status ('registry' or 'active'). Defaults to 'registry'.
 *                 If 'active', targetDate is set to today and terminusTime to 23:59.
 */
export function addContract(
  title: string,
  priority: 'normal' | 'highTable' = 'normal',
  status: 'registry' | 'active' = 'registry'
): Contract {
  const today = getClientTodayISODate();
  const acceptedAt = status === 'active' ? new Date().toISOString() : undefined;
  
  const newContract: Contract = {
    id: generateId(),
    title,
    priority,
    status,
    createdAt: new Date().toISOString(),
    // If active, set deadline immediately
    ...(status === 'active' ? {
      targetDate: today,
      terminusTime: '23:59',
      acceptedAt
    } : {
      // Registry contracts have no deadline until accepted
      targetDate: undefined,
      terminusTime: undefined
    })
  };

  // INSTANT: Update store immediately
  contracts.update((list) => [...list, newContract]);

  // ASYNC: Write to IndexedDB (non-blocking)
  db.contracts.add(newContract).catch((err) => {
    console.error('Failed to persist contract:', err);
    // Rollback on failure
    contracts.update((list) => list.filter((c) => c.id !== newContract.id));
  });

  return newContract;
}

/**
 * Accept a contract from the Registry - Optimistic UI pattern
 * Sets status to 'active', targetDate to today, and terminusTime to 23:59.
 * The deadline is always tonight at 23:59:59 - user doesn't choose.
 */
export function acceptContractOptimistic(id: string): void {
  const today = getClientTodayISODate();
  const acceptedAt = new Date().toISOString();
  const terminusTime = '23:59'; // Always end of day

  // INSTANT: Update store immediately
  contracts.update((list) =>
    list.map((c) =>
      c.id === id
        ? { ...c, status: 'active' as const, targetDate: today, terminusTime, acceptedAt }
        : c
    )
  );

  // ASYNC: Persist to DB
  db.contracts.update(id, { 
    status: 'active', 
    targetDate: today,
    terminusTime,
    acceptedAt 
  }).catch((err) => {
    console.error('Failed to accept contract:', err);
    // Rollback on failure
    contracts.update((list) =>
      list.map((c) =>
        c.id === id
          ? { ...c, status: 'registry' as const, targetDate: undefined, acceptedAt: undefined }
          : c
      )
    );
  });
}

/**
 * Kill a contract (complete it) - Optimistic UI pattern
 */
export function killContractOptimistic(id: string): void {
  const killedAt = new Date().toISOString();

  // INSTANT: Update store immediately
  contracts.update((list) =>
    list.map((c) =>
      c.id === id ? { ...c, status: 'killed' as const, killedAt } : c
    )
  );

  // Increment vault count immediately
  settings.update((s) => ({ ...s, vaultCount: s.vaultCount + 1 }));

  // ASYNC: Persist to DB
  Promise.all([
    db.contracts.update(id, { status: 'killed', killedAt }),
    db.settings.get('settings').then(async (s) => {
      if (s) {
        await db.settings.put({ ...s, vaultCount: s.vaultCount + 1 });
      }
    })
  ]).catch((err) => {
    console.error('Failed to persist kill:', err);
  });
}

/**
 * Abort a contract - Move it back to Registry
 * The contract returns to backlog, deadline is cleared.
 */
export function abortContractOptimistic(id: string): void {
  // INSTANT: Update store immediately
  contracts.update((list) =>
    list.map((c) =>
      c.id === id
        ? { ...c, status: 'registry' as const, targetDate: undefined, terminusTime: undefined, acceptedAt: undefined }
        : c
    )
  );

  // ASYNC: Persist to DB
  db.contracts.update(id, { 
    status: 'registry', 
    targetDate: undefined, 
    terminusTime: undefined,
    acceptedAt: undefined 
  }).catch((err) => {
    console.error('Failed to abort contract:', err);
  });
}

/**
 * Delete a contract - Optimistic UI pattern
 */
export function deleteContractOptimistic(id: string): void {
  let removedContract: Contract | undefined;

  // INSTANT: Remove from store, keep reference for rollback
  contracts.update((list) => {
    removedContract = list.find((c) => c.id === id);
    return list.filter((c) => c.id !== id);
  });

  // ASYNC: Persist
  db.contracts.delete(id).catch((err) => {
    console.error('Failed to delete contract:', err);
    // Rollback
    if (removedContract) {
      contracts.update((list) => [...list, removedContract!]);
    }
  });
}

/**
 * Complete onboarding - Optimistic
 */
export function completeOnboardingOptimistic(): void {
  // INSTANT
  settings.update((s) => ({ ...s, onboardingComplete: true }));

  // ASYNC
  db.settings.get('settings').then(async (s) => {
    if (s) {
      await db.settings.put({ ...s, onboardingComplete: true });
    }
  });
}

// ===== Real-Time Deadline Monitoring =====

let deadlineCheckInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Check if a contract has passed its deadline
 * Registry contracts (no targetDate) are never considered passed.
 */
function isDeadlinePassed(contract: Contract): boolean {
  // Registry contracts have no targetDate - they can't be overdue
  if (!contract.targetDate) return false;
  
  const now = new Date();
  const today = getClientTodayISODate();
  
  // If targetDate is before today, it's definitely passed
  if (contract.targetDate < today) return true;
  
  // If targetDate is today, check the terminus time
  if (contract.targetDate === today) {
    const [hours, minutes] = (contract.terminusTime || '23:59').split(':').map(Number);
    const deadlineTime = new Date();
    deadlineTime.setHours(hours, minutes, 0, 0);
    return now > deadlineTime;
  }
  
  return false;
}

/**
 * Burn contracts that have passed their deadline in real-time
 */
export async function burnExpiredContracts(): Promise<Contract[]> {
  if (!browser) return [];
  
  let expiredContracts: Contract[] = [];
  
  // Get current active contracts from store
  contracts.subscribe(($contracts) => {
    expiredContracts = $contracts.filter(
      (c) => c.status === 'active' && isDeadlinePassed(c)
    );
  })();
  
  if (expiredContracts.length === 0) return [];
  
  const ids = expiredContracts.map((c) => c.id);
  
  // Update in store immediately (optimistic)
  contracts.update((list) =>
    list.map((c) =>
      ids.includes(c.id) ? { ...c, status: 'burned' as const } : c
    )
  );
  
  // Persist to database
  try {
    await Promise.all(
      ids.map((id) => db.contracts.update(id, { status: 'burned' }))
    );
  } catch (err) {
    console.error('Failed to burn expired contracts:', err);
  }
  
  return expiredContracts.map((c) => ({ ...c, status: 'burned' as const }));
}

/**
 * Start real-time deadline monitoring
 * Checks every 30 seconds for expired contracts
 */
export function startDeadlineMonitoring(): void {
  if (!browser || deadlineCheckInterval) return;
  
  // Check immediately on start
  burnExpiredContracts().then((burned) => {
    if (burned.length > 0) {
      console.log(`[BURN] ${burned.length} contract(s) burned in real-time`);
      // Show Mission Report if contracts were burned during monitoring
      morningReportBurned.set(burned);
      morningReportOpen.set(true);
    }
  });
  
  // Then check every 30 seconds
  deadlineCheckInterval = setInterval(async () => {
    const burned = await burnExpiredContracts();
    if (burned.length > 0) {
      console.log(`[BURN] ${burned.length} contract(s) burned in real-time`);
      morningReportBurned.set(burned);
      morningReportOpen.set(true);
    }
  }, 30000); // 30 seconds
}

/**
 * Stop deadline monitoring
 */
export function stopDeadlineMonitoring(): void {
  if (deadlineCheckInterval) {
    clearInterval(deadlineCheckInterval);
    deadlineCheckInterval = null;
  }
}

// ===== Formatting Helpers =====

export function formatTerminusTime(time: string | undefined): string {
  if (!time) return '23:59';
  return time;
}
