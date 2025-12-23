import { browser } from '$app/environment';
import { getDb, getClientTodayISODate, type Contract } from '$lib/db';

// ===== Types =====
export type KillCountsByDate = Record<string, number>;

export interface MorgueStats {
  totalKills: number;
  currentStreak: number;
  bestStreak: number;
  countsByDate: KillCountsByDate;
  killedContracts: Contract[];
}

// ===== Main Aggregation Function =====

/**
 * Fetch all killed contracts and compute morgue statistics:
 * - Total kills (all-time)
 * - Daily body counts (kills per date)
 * - Current streak (consecutive days ending today with ≥1 kill)
 * - Best streak (personal record)
 */
export async function getMorgueStats(): Promise<MorgueStats> {
  if (!browser) {
    return {
      totalKills: 0,
      currentStreak: 0,
      bestStreak: 0,
      countsByDate: {},
      killedContracts: []
    };
  }

  try {
    const db = await getDb();

    // Query killed contracts (status is indexed)
    const killedContracts: Contract[] = await db.contracts
      .where('status')
      .equals('killed')
      .toArray();

    // Sort newest first (for the detailed list)
    killedContracts.sort((a, b) => {
      const aTime = a.killedAt ?? a.createdAt;
      const bTime = b.killedAt ?? b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    // Aggregate kills by date (local calendar day)
    const countsByDate: KillCountsByDate = {};
    for (const contract of killedContracts) {
      const when = new Date(contract.killedAt ?? contract.createdAt);
      const day = getClientTodayISODate(when); // YYYY-MM-DD local
      countsByDate[day] = (countsByDate[day] ?? 0) + 1;
    }

    const totalKills = killedContracts.length;
    const today = getClientTodayISODate();
    const { currentStreak, bestStreak } = computeStreaks(countsByDate, today);

    return {
      totalKills,
      currentStreak,
      bestStreak,
      countsByDate,
      killedContracts
    };
  } catch (error) {
    console.error('Failed to get morgue stats:', error);
    return {
      totalKills: 0,
      currentStreak: 0,
      bestStreak: 0,
      countsByDate: {},
      killedContracts: []
    };
  }
}

// ===== Streak Calculation =====

/**
 * Compute current and best streaks from kill counts.
 * Current streak: consecutive days ending today (or yesterday) with ≥1 kill.
 * Best streak: max consecutive-day run ever.
 */
function computeStreaks(
  counts: KillCountsByDate,
  todayISO: string
): { currentStreak: number; bestStreak: number } {
  // Get all days with at least one kill, sorted ascending
  const killedDays = Object.keys(counts)
    .filter((d) => (counts[d] ?? 0) > 0)
    .sort();

  if (killedDays.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  const daySet = new Set(killedDays);

  // Helper to convert ISO string to Date at midnight local
  const toDate = (iso: string): Date => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  // Current streak: walk backwards from today
  let currentStreak = 0;
  {
    const cursor = toDate(todayISO);

    // Check if today has kills, if not check yesterday (allow 1-day grace)
    if (!daySet.has(todayISO)) {
      cursor.setDate(cursor.getDate() - 1);
      const yesterdayISO = getClientTodayISODate(cursor);
      if (!daySet.has(yesterdayISO)) {
        // No kills today or yesterday = streak broken
        currentStreak = 0;
      } else {
        // Count from yesterday backwards
        while (daySet.has(getClientTodayISODate(cursor))) {
          currentStreak += 1;
          cursor.setDate(cursor.getDate() - 1);
        }
      }
    } else {
      // Today has kills, count backwards
      while (daySet.has(getClientTodayISODate(cursor))) {
        currentStreak += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
    }
  }

  // Best streak: scan all killed days
  let bestStreak = 0;
  {
    let run = 0;
    let prevDate: Date | null = null;

    for (const day of killedDays) {
      const currentDate = toDate(day);

      if (!prevDate) {
        run = 1;
      } else {
        // Check if current day is exactly 1 day after previous
        const expected = new Date(prevDate);
        expected.setDate(expected.getDate() + 1);

        if (getClientTodayISODate(expected) === day) {
          run += 1;
        } else {
          run = 1;
        }
      }

      prevDate = currentDate;
      bestStreak = Math.max(bestStreak, run);
    }
  }

  return { currentStreak, bestStreak };
}

// ===== Grouping Helper for List View =====

export type MonthGroup = {
  label: string; // e.g., "December 2024"
  contracts: Contract[];
};

/**
 * Group killed contracts by month for the detailed list view.
 * Returns newest months first.
 */
export function groupByMonth(contracts: Contract[]): MonthGroup[] {
  const groups: Map<string, Contract[]> = new Map();

  for (const contract of contracts) {
    const when = new Date(contract.killedAt ?? contract.createdAt);
    const key = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(contract);
  }

  // Sort keys descending (newest first)
  const sortedKeys = [...groups.keys()].sort().reverse();

  const monthFormatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long'
  });

  return sortedKeys.map((key) => {
    const [year, month] = key.split('-').map(Number);
    const date = new Date(year, month - 1, 1);

    return {
      label: monthFormatter.format(date),
      contracts: groups.get(key)!
    };
  });
}

