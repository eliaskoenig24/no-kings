/**
 * Daily question mechanics: one question per day, answer first, then guess
 * what the network thinks, then see the truth. Streaks reward the habit —
 * never the opinion (participation is gamified, positions are not).
 * All state is local; nothing here is published.
 */

export type DailyEntry = {
  questionId: string;
  stance: 'for' | 'against';
  guess: number; // 0–100: guessed % of network support
};

export type DailyStore = Record<string, DailyEntry>; // key: YYYY-MM-DD

const STORE_KEY = 'nk-daily';

export function dateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Deterministic question index for a given day — same for everyone. */
export function dailyIndex(agendaLength: number, d: Date = new Date()): number {
  const days = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
  return ((days % agendaLength) + agendaLength) % agendaLength;
}

export function readDaily(): DailyStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}');
    return typeof raw === 'object' && raw !== null ? raw : {};
  } catch {
    return {};
  }
}

export function saveDailyEntry(entry: DailyEntry, d: Date = new Date()): DailyStore {
  const store = readDaily();
  store[dateKey(d)] = entry;
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
  return store;
}

/** Consecutive days answered, counting backwards from today (or yesterday if today is open). */
export function streak(store: DailyStore, today: Date = new Date()): number {
  let count = 0;
  const cursor = new Date(today);
  if (!store[dateKey(cursor)]) cursor.setDate(cursor.getDate() - 1); // today not answered yet — streak still alive
  while (store[dateKey(cursor)]) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
