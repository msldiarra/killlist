"use client";

import type { Contract } from "./db";

// Default excommunicado countdown duration (45 minutes)
export const DEFAULT_EXCOMMUNICADO_DURATION_MS = 45 * 60 * 1000;

/**
 * Check if a contract is overdue
 */
export function isOverdue(contract: Contract): boolean {
  if (contract.status !== "active") return false;
  return new Date() > new Date(contract.deadlineAt);
}

/**
 * Check if any contracts are overdue (triggers Excommunicado state)
 */
export function hasOverdueContracts(contracts: Contract[]): boolean {
  return contracts.some(isOverdue);
}

/**
 * Get the excommunicado countdown remaining time in ms
 * Returns 0 if countdown has expired (FAILED state)
 */
export function getExcommunicadoRemainingMs(
  contract: Contract,
  excommunicadoDurationMs: number = DEFAULT_EXCOMMUNICADO_DURATION_MS
): number {
  if (!isOverdue(contract)) return excommunicadoDurationMs;
  
  const deadline = new Date(contract.deadlineAt).getTime();
  const excommunicadoEnd = deadline + excommunicadoDurationMs;
  const remaining = excommunicadoEnd - Date.now();
  
  return Math.max(0, remaining);
}

/**
 * Check if a contract has failed (countdown expired)
 */
export function hasFailed(
  contract: Contract,
  excommunicadoDurationMs: number = DEFAULT_EXCOMMUNICADO_DURATION_MS
): boolean {
  return isOverdue(contract) && 
    getExcommunicadoRemainingMs(contract, excommunicadoDurationMs) === 0;
}

/**
 * Format time remaining as HH:MM:SS
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return [hours, minutes, seconds]
    .map((n) => n.toString().padStart(2, "0"))
    .join(":");
}

/**
 * Format deadline for display
 */
export function formatDeadline(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  
  if (isToday) {
    return `Today ${timeStr}`;
  } else if (isTomorrow) {
    return `Tomorrow ${timeStr}`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
}

/**
 * Get time until deadline in human readable format
 */
export function getTimeUntilDeadline(dateStr: string): string {
  const deadline = new Date(dateStr).getTime();
  const now = Date.now();
  const diff = deadline - now;
  
  if (diff <= 0) return "OVERDUE";
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

