"use client";

import Dexie, { type EntityTable } from "dexie";

// ===== Contract Types =====
export type Priority = "normal" | "highTable";
export type ContractStatus = "active" | "completed" | "failed";

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
  id: "settings";
  onboardingComplete: boolean;
  vaultCount: number;
  excommunicadoDurationMs: number; // countdown duration after overdue (default 45min)
}

// ===== Database Schema =====
class KillListDB extends Dexie {
  contracts!: EntityTable<Contract, "id">;
  settings!: EntityTable<AppSettings, "id">;

  constructor() {
    super("KillListDB");

    this.version(1).stores({
      contracts: "id, status, deadlineAt, createdAt",
      settings: "id",
    });
  }
}

export const db = new KillListDB();

// ===== Default Settings =====
const DEFAULT_SETTINGS: AppSettings = {
  id: "settings",
  onboardingComplete: false,
  vaultCount: 0,
  excommunicadoDurationMs: 45 * 60 * 1000, // 45 minutes
};

// ===== Settings CRUD =====
export async function getSettings(): Promise<AppSettings> {
  const settings = await db.settings.get("settings");
  if (!settings) {
    await db.settings.put(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  return settings;
}

export async function updateSettings(
  updates: Partial<Omit<AppSettings, "id">>
): Promise<void> {
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

// ===== Contract CRUD =====
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function createContract(
  title: string,
  deadlineAt: Date,
  priority: Priority = "normal"
): Promise<Contract> {
  const contract: Contract = {
    id: generateId(),
    title,
    deadlineAt: deadlineAt.toISOString(),
    priority,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  await db.contracts.add(contract);
  return contract;
}

export async function getActiveContracts(): Promise<Contract[]> {
  return db.contracts
    .where("status")
    .equals("active")
    .sortBy("deadlineAt");
}

export async function getCompletedContracts(): Promise<Contract[]> {
  return db.contracts
    .where("status")
    .equals("completed")
    .reverse()
    .sortBy("completedAt");
}

/**
 * Get all archived (non-active) contracts: completed + failed
 * Sorted by completedAt descending (fallback to deadlineAt)
 */
export async function getArchivedContracts(): Promise<Contract[]> {
  const allContracts = await db.contracts.toArray();
  
  // Filter non-active contracts
  const archived = allContracts.filter((c) => c.status !== "active");
  
  // Sort by completedAt descending, fallback to deadlineAt
  archived.sort((a, b) => {
    const aTime = a.completedAt || a.deadlineAt;
    const bTime = b.completedAt || b.deadlineAt;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });
  
  return archived;
}

export async function completeContract(id: string): Promise<void> {
  await db.contracts.update(id, {
    status: "completed",
    completedAt: new Date().toISOString(),
  });
  await incrementVault();
}

export async function failContract(id: string): Promise<void> {
  await db.contracts.update(id, {
    status: "failed",
  });
}

export async function deleteContract(id: string): Promise<void> {
  await db.contracts.delete(id);
}

// ===== Hooks-friendly subscription =====
export function subscribeToContracts(
  callback: (contracts: Contract[]) => void
): () => void {
  const subscription = db.contracts.hook("creating", () => {
    getActiveContracts().then(callback);
  });

  // Initial load
  getActiveContracts().then(callback);

  // Also subscribe to updates
  const updateSub = db.contracts.hook("updating", () => {
    getActiveContracts().then(callback);
  });

  const deleteSub = db.contracts.hook("deleting", () => {
    getActiveContracts().then(callback);
  });

  return () => {
    db.contracts.hook("creating").unsubscribe(subscription);
    db.contracts.hook("updating").unsubscribe(updateSub);
    db.contracts.hook("deleting").unsubscribe(deleteSub);
  };
}

