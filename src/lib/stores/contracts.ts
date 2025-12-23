import { writable, derived, get } from 'svelte/store';
import {
  db,
  type Contract,
  type AppSettings,
  DEFAULT_SETTINGS,
  generateId,
  getSettings,
  getActiveContracts,
  getArchivedContracts as fetchArchivedContracts
} from '$lib/db';

// ===== Core Stores =====
export const contracts = writable<Contract[]>([]);
export const settings = writable<AppSettings>(DEFAULT_SETTINGS);
export const isLoading = writable(true);

// ===== Derived Stores =====
export const activeContracts = derived(contracts, ($contracts) =>
  $contracts
    .filter((c) => c.status === 'active')
    .sort((a, b) => new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime())
);

export const archivedContracts = derived(contracts, ($contracts) =>
  $contracts.filter((c) => c.status !== 'active')
);

export const vaultCount = derived(settings, ($settings) => $settings.vaultCount);

export const hasOverdue = derived(activeContracts, ($active) =>
  $active.some((c) => new Date() > new Date(c.deadlineAt))
);

// ===== Initialize Stores from DB =====
export async function initializeStores(): Promise<void> {
  isLoading.set(true);
  
  try {
    const [loadedSettings, activeList, archivedList] = await Promise.all([
      getSettings(),
      getActiveContracts(),
      fetchArchivedContracts()
    ]);
    
    settings.set(loadedSettings);
    contracts.set([...activeList, ...archivedList]);
  } catch (error) {
    console.error('Failed to initialize stores:', error);
  } finally {
    isLoading.set(false);
  }
}

// ===== Optimistic Contract Operations =====

/**
 * Add a new contract - Optimistic UI pattern
 * Updates the store INSTANTLY, then writes to DB asynchronously
 */
export function addContract(
  title: string,
  deadlineAt: Date,
  priority: 'normal' | 'highTable' = 'normal'
): Contract {
  const newContract: Contract = {
    id: generateId(),
    title,
    deadlineAt: deadlineAt.toISOString(),
    priority,
    status: 'active',
    createdAt: new Date().toISOString()
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
 * Complete a contract - Optimistic UI pattern
 * Updates store instantly, then persists
 */
export function completeContractOptimistic(id: string): void {
  const completedAt = new Date().toISOString();

  // INSTANT: Update store immediately
  contracts.update((list) =>
    list.map((c) =>
      c.id === id ? { ...c, status: 'completed' as const, completedAt } : c
    )
  );

  // Increment vault count immediately
  settings.update((s) => ({ ...s, vaultCount: s.vaultCount + 1 }));

  // ASYNC: Persist to DB
  Promise.all([
    db.contracts.update(id, { status: 'completed', completedAt }),
    db.settings.get('settings').then(async (s) => {
      if (s) {
        await db.settings.put({ ...s, vaultCount: s.vaultCount + 1 });
      }
    })
  ]).catch((err) => {
    console.error('Failed to persist completion:', err);
  });
}

/**
 * Fail a contract - Optimistic UI pattern
 */
export function failContractOptimistic(id: string): void {
  // INSTANT: Update store
  contracts.update((list) =>
    list.map((c) => (c.id === id ? { ...c, status: 'failed' as const } : c))
  );

  // ASYNC: Persist
  db.contracts.update(id, { status: 'failed' }).catch((err) => {
    console.error('Failed to persist failure:', err);
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

// ===== Contract Status Helpers =====
export function isOverdue(contract: Contract): boolean {
  if (contract.status !== 'active') return false;
  return new Date() > new Date(contract.deadlineAt);
}

export function getExcommunicadoRemainingMs(
  contract: Contract,
  durationMs: number = 45 * 60 * 1000
): number {
  if (!isOverdue(contract)) return durationMs;

  const deadline = new Date(contract.deadlineAt).getTime();
  const excommunicadoEnd = deadline + durationMs;
  const remaining = excommunicadoEnd - Date.now();

  return Math.max(0, remaining);
}

export function hasFailed(
  contract: Contract,
  durationMs: number = 45 * 60 * 1000
): boolean {
  return isOverdue(contract) && getExcommunicadoRemainingMs(contract, durationMs) === 0;
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((n) => n.toString().padStart(2, '0')).join(':');
}

export function formatDeadline(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  if (isToday) return `Today ${timeStr}`;
  if (isTomorrow) return `Tomorrow ${timeStr}`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

