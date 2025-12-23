import { browser } from '$app/environment';

// ===== Contract Types =====
export type Priority = 'normal' | 'highTable';
export type ContractStatus = 'active' | 'completed' | 'failed';

export interface Contract {
  id: string;
  title: string;
  deadlineAt: string; // ISO string
  priority: Priority;
  status: ContractStatus;
  createdAt: string;
  completedAt?: string;
}

export interface AppSettings {
  id: 'settings';
  onboardingComplete: boolean;
  vaultCount: number;
  excommunicadoDurationMs: number;
}

// ===== Default Settings =====
export const DEFAULT_SETTINGS: AppSettings = {
  id: 'settings',
  onboardingComplete: false,
  vaultCount: 0,
  excommunicadoDurationMs: 45 * 60 * 1000 // 45 minutes
};

// ===== ID Generator =====
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ===== Lazy Database Initialization (Browser Only) =====
let dbInstance: any = null;

async function getDb() {
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
        this.version(1).stores({
          contracts: 'id, status, deadlineAt, createdAt',
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
export async function createContract(
  title: string,
  deadlineAt: Date,
  priority: Priority = 'normal'
): Promise<Contract> {
  const contract: Contract = {
    id: generateId(),
    title,
    deadlineAt: deadlineAt.toISOString(),
    priority,
    status: 'active',
    createdAt: new Date().toISOString()
  };
  
  if (browser) {
    const db = await getDb();
    await db.contracts.add(contract);
  }
  
  return contract;
}

export async function getActiveContracts(): Promise<Contract[]> {
  if (!browser) return [];
  
  const db = await getDb();
  return db.contracts.where('status').equals('active').sortBy('deadlineAt');
}

export async function getCompletedContracts(): Promise<Contract[]> {
  if (!browser) return [];
  
  const db = await getDb();
  return db.contracts.where('status').equals('completed').reverse().sortBy('completedAt');
}

export async function getArchivedContracts(): Promise<Contract[]> {
  if (!browser) return [];
  
  const db = await getDb();
  const allContracts = await db.contracts.toArray();
  const archived = allContracts.filter((c: Contract) => c.status !== 'active');
  
  archived.sort((a: Contract, b: Contract) => {
    const aTime = a.completedAt || a.deadlineAt;
    const bTime = b.completedAt || b.deadlineAt;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });
  
  return archived;
}

export async function completeContract(id: string): Promise<void> {
  if (!browser) return;
  
  const db = await getDb();
  await db.contracts.update(id, {
    status: 'completed',
    completedAt: new Date().toISOString()
  });
  await incrementVault();
}

export async function failContract(id: string): Promise<void> {
  if (!browser) return;
  
  const db = await getDb();
  await db.contracts.update(id, { status: 'failed' });
}

export async function deleteContract(id: string): Promise<void> {
  if (!browser) return;
  
  const db = await getDb();
  await db.contracts.delete(id);
}

// Export a proxy for direct db access (for stores)
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
