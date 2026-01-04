import { browser } from '$app/environment';

// ===== Date Helpers =====
/**
 * Get the current client calendar day as YYYY-MM-DD (local timezone, NOT UTC)
 */
export function getClientTodayISODate(d = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ===== Contract Types =====
export type Priority = 'normal' | 'highTable';
export type ContractStatus = 'registry' | 'active' | 'killed' | 'burned';

export interface Contract {
  id: string;
  title: string;
  targetDate?: string; // YYYY-MM-DD (local calendar day) - null/undefined for registry contracts
  terminusTime?: string; // HH:MM (optional time within the day)
  priority: Priority;
  status: ContractStatus;
  createdAt: string;
  killedAt?: string; // When the task was completed/killed
  acceptedAt?: string; // When the contract was accepted from registry
  order?: number; // Visual sort order (ascending)
  frozenUntil?: string; // ISO Date string for snoozed/frozen contracts
}

export interface AppSettings {
  id: 'settings';
  onboardingComplete: boolean;
  vaultCount: number;
}

// ===== Default Settings =====
export const DEFAULT_SETTINGS: AppSettings = {
  id: 'settings',
  onboardingComplete: false,
  vaultCount: 0
};

// ===== ID Generator =====
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ===== Lazy Database Initialization (Browser Only) =====
let dbInstance: any = null;

/**
 * Get the Dexie database instance (browser-only, lazy initialized)
 * Exported for use by burnProtocol and other modules that need direct DB access
 */
export async function getDb() {
  if (!browser) {
    throw new Error('Database can only be accessed in browser');
  }

  if (!dbInstance) {
    const { Dexie } = await import('dexie');

    class KillListDB extends Dexie {
      contracts!: any;
      settings!: any;

      constructor() {
        super('KillListDB');

        // Version 1: Original schema
        this.version(1).stores({
          contracts: 'id, status, deadlineAt, createdAt',
          settings: 'id'
        });

        // Version 2: Burn Protocol - add targetDate, change status values
        this.version(2).stores({
          contracts: 'id, targetDate, status, createdAt, [targetDate+status]',
          settings: 'id'
        }).upgrade(async (tx: any) => {
          const table = tx.table('contracts');

          await table.toCollection().modify((c: any) => {
            // Compute targetDate from deadlineAt or createdAt (local calendar day)
            const baseDate = c.deadlineAt ?? c.createdAt;
            const dt = baseDate ? new Date(baseDate) : new Date();
            c.targetDate = getClientTodayISODate(dt);

            // Extract time from deadlineAt if present
            if (c.deadlineAt) {
              const deadline = new Date(c.deadlineAt);
              c.terminusTime = deadline.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });
            }

            // Migrate status values
            if (c.status === 'completed') {
              c.status = 'killed';
              c.killedAt = c.completedAt;
            } else if (c.status === 'failed') {
              c.status = 'burned';
            }
            // 'active' stays 'active'

            // Clean up old fields
            delete c.deadlineAt;
            delete c.completedAt;
          });
        });

        // Version 3: Registry - add 'registry' status for backlog items
        // Registry contracts have no targetDate until accepted
        this.version(3).stores({
          contracts: 'id, targetDate, status, createdAt, [targetDate+status]',
          settings: 'id'
        });
        // No data migration needed - existing contracts remain as-is
        // New contracts will be created with status: 'registry'

        // Version 4: Tactical Control - add 'order' and 'frozenUntil'
        this.version(4).stores({
          contracts: 'id, targetDate, status, createdAt, order, [targetDate+status]',
          settings: 'id'
        });
      }
    }

    dbInstance = new KillListDB();
  }

  return dbInstance;
}

// ===== Settings Operations =====
export async function getSettings(): Promise<AppSettings> {
  if (!browser) return DEFAULT_SETTINGS;

  const db = await getDb();
  const settings = await db.settings.get('settings');
  if (!settings) {
    await db.settings.put(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  return settings;
}

export async function updateSettings(
  updates: Partial<Omit<AppSettings, 'id'>>
): Promise<void> {
  if (!browser) return;

  const db = await getDb();
  const current = await getSettings();
  await db.settings.put({ ...current, ...updates });
}

export async function completeOnboarding(): Promise<void> {
  await updateSettings({ onboardingComplete: true });
}

export async function incrementVault(): Promise<number> {
  const settings = await getSettings();
  const newCount = settings.vaultCount + 1;
  await updateSettings({ vaultCount: newCount });
  return newCount;
}

// ===== Contract Operations =====

/**
 * Create a new contract in the Registry (backlog).
 * Contracts start with status: 'registry' and no targetDate.
 * The 24h burn timer only starts when the contract is accepted.
 */
export async function createContract(
  title: string,
  terminusTime: string = '23:59',
  priority: Priority = 'normal'
): Promise<Contract> {
  const contract: Contract = {
    id: generateId(),
    title,
    // No targetDate - will be set when accepted
    terminusTime,
    priority,
    status: 'registry', // Start in backlog
    createdAt: new Date().toISOString()
  };

  if (browser) {
    const db = await getDb();
    await db.contracts.add(contract);
  }

  return contract;
}

/**
 * Accept a contract from the Registry.
 * Sets status to 'active' and targetDate to today.
 * The 24h burn timer starts from this moment.
 */
export async function acceptContract(id: string): Promise<void> {
  if (!browser) return;

  const today = getClientTodayISODate();
  const db = await getDb();

  await db.contracts.update(id, {
    status: 'active',
    targetDate: today,
    acceptedAt: new Date().toISOString()
  });
}

/**
 * Get all contracts in the Registry (backlog).
 */
export async function getRegistryContracts(): Promise<Contract[]> {
  if (!browser) return [];

  const db = await getDb();
  return db.contracts
    .where('status')
    .equals('registry')
    .toArray();
}

export async function getTodayActiveContracts(): Promise<Contract[]> {
  if (!browser) return [];

  const db = await getDb();
  const today = getClientTodayISODate();

  return db.contracts
    .where('[targetDate+status]')
    .equals([today, 'active'])
    .toArray();
}

export async function getKilledContracts(): Promise<Contract[]> {
  if (!browser) return [];

  const db = await getDb();
  const allContracts = await db.contracts.toArray();
  const killed = allContracts.filter((c: Contract) => c.status === 'killed');

  killed.sort((a: Contract, b: Contract) => {
    const aTime = a.killedAt || a.createdAt;
    const bTime = b.killedAt || b.createdAt;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return killed;
}

export async function killContract(id: string): Promise<void> {
  if (!browser) return;

  const db = await getDb();
  await db.contracts.update(id, {
    status: 'killed',
    killedAt: new Date().toISOString()
  });
  await incrementVault();
}

export async function burnContract(id: string): Promise<void> {
  if (!browser) return;

  const db = await getDb();
  await db.contracts.update(id, { status: 'burned' });
}

export async function deleteContract(id: string): Promise<void> {
  if (!browser) return;

  const db = await getDb();
  await db.contracts.delete(id);
}

export async function deleteContracts(ids: string[]): Promise<void> {
  if (!browser || ids.length === 0) return;

  const db = await getDb();
  await db.contracts.bulkDelete(ids);
}

export async function getAllContracts(): Promise<Contract[]> {
  if (!browser) return [];

  const db = await getDb();
  return db.contracts.toArray();
}

// ===== Legacy proxy for stores (backwards compatibility) =====
export const db = {
  contracts: {
    async add(contract: Contract) {
      if (!browser) return;
      const database = await getDb();
      return database.contracts.add(contract);
    },
    async update(id: string, changes: Partial<Contract>) {
      if (!browser) return;
      const database = await getDb();
      return database.contracts.update(id, changes);
    },
    async delete(id: string) {
      if (!browser) return;
      const database = await getDb();
      return database.contracts.delete(id);
    },
    async bulkDelete(ids: string[]) {
      if (!browser) return;
      const database = await getDb();
      return database.contracts.bulkDelete(ids);
    }
  },
  settings: {
    async get(id: string) {
      if (!browser) return null;
      const database = await getDb();
      return database.settings.get(id);
    },
    async put(settings: AppSettings) {
      if (!browser) return;
      const database = await getDb();
      return database.settings.put(settings);
    }
  }
};
