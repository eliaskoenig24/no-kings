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

/** A published daily answer as seen on the network (pseudonymous). */
export type PublishedDaily = {
  pubkey: string;
  stance: 'for' | 'against';
  guess: number; // 0–100
};

/**
 * Aggregates published daily answers: one voice per pubkey; optionally only
 * pubkeys that also published a twin count (spam costs a proof-of-work twin).
 * Returns support share (0–1), mean guess (0–100) and the perception gap.
 */
export function aggregateDailyEntries(
  entries: PublishedDaily[],
  knownPubkeys?: Set<string>,
): { n: number; support: number; meanGuess: number; gap: number } {
  const byPubkey = new Map<string, PublishedDaily>();
  for (const e of entries) {
    if (knownPubkeys && !knownPubkeys.has(e.pubkey)) continue;
    if (e.guess < 0 || e.guess > 100) continue;
    byPubkey.set(e.pubkey, e); // last one wins — addressable events replace anyway
  }
  const list = [...byPubkey.values()];
  if (list.length === 0) return { n: 0, support: 0.5, meanGuess: 50, gap: 0 };
  const support = list.filter(e => e.stance === 'for').length / list.length;
  const meanGuess = list.reduce((s, e) => s + e.guess, 0) / list.length;
  const gap = Math.round(support * 100 - meanGuess);
  return { n: list.length, support, meanGuess, gap };
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
