/** Pure ranking math helpers - shared by rank tracker service, API and UI */

export interface PositionPoint {
  position: number | null; // null = not found in top results
  checked_at: string | Date;
}

/** Position change: positive = improved (moved up) */
export function positionChange(current: number | null, previous: number | null): number | null {
  if (current === null && previous === null) return 0;
  if (current === null) return -(previous as number); // dropped out
  if (previous === null) return current; // newly found
  return previous - current;
}

/** Average position across a history; "not found" counts as NOT_FOUND_POSITION */
export const NOT_FOUND_POSITION = 101;

export function averagePosition(history: PositionPoint[]): number | null {
  const found = history.filter((h) => h.position !== null) as Array<{ position: number; checked_at: string | Date }>;
  if (found.length === 0) return null;
  return found.reduce((sum, h) => sum + h.position, 0) / found.length;
}

export function bestPosition(history: PositionPoint[]): number | null {
  const found = history.map((h) => h.position).filter((p): p is number => p !== null);
  return found.length ? Math.min(...found) : null;
}

export function visibilityScore(history: PositionPoint[]): number {
  // Share-of-visibility model: position 1 => 100%, 2 => 50, 3 => 33... not found => 0.
  // Visibility = average over history of 100 / position, capped at 100.
  if (history.length === 0) return 0;
  const total = history.reduce((sum, h) => {
    if (h.position === null || h.position <= 0) return sum;
    return sum + Math.min(100, 100 / h.position);
  }, 0);
  return Math.round((total / history.length) * 10) / 10;
}

export interface PositionBuckets {
  top3: number;
  top10: number;
  top20: number;
  top100: number;
  notRanked: number;
}

export function bucketPosition(position: number | null): keyof PositionBuckets {
  if (position === null) return "notRanked";
  if (position <= 3) return "top3";
  if (position <= 10) return "top10";
  if (position <= 20) return "top20";
  return "top100";
}

export function bucketCounts(latestPositions: Array<number | null>): PositionBuckets {
  const buckets: PositionBuckets = { top3: 0, top10: 0, top20: 0, top100: 0, notRanked: 0 };
  for (const p of latestPositions) buckets[bucketPosition(p)]++;
  return buckets;
}
