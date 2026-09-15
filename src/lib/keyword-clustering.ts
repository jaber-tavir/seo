/** Pure keyword-clustering helpers: group keywords sharing a normalized stem word. */

export interface KeywordCluster {
  /** Primary keyword: shortest member of the cluster (representative) */
  primary: string;
  members: string[];
}

const CLUSTER_STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "for", "of", "in", "on", "to", "with", "best", "top",
  "near", "me", "buy", "cheap", "free", "how", "what", "why", "vs",
]);

function normalize(word: string): string {
  let w = word.toLowerCase();
  // light stemming for common plural/gerund endings
  if (w.length > 5 && w.endsWith("ies")) w = `${w.slice(0, -3)}y`;
  else if (w.length > 4 && w.endsWith("es")) w = w.slice(0, -2);
  else if (w.length > 4 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  else if (w.length > 6 && w.endsWith("ing")) w = w.slice(0, -3);
  return w;
}

function contentWords(keyword: string): string[] {
  return keyword
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((w) => w.length > 2 && !CLUSTER_STOP_WORDS.has(w))
    .map(normalize);
}

/**
 * Cluster keywords: two keywords join a cluster when they share at least two
 * significant stemmed words, or one significant word when both keywords are
 * short (<= 2 significant words). Single-member clusters are returned as-is.
 */
export function clusterKeywords(keywords: string[]): KeywordCluster[] {
  const unique = [...new Set(keywords.map((k) => k.trim()).filter(Boolean))];
  const words = new Map<string, string[]>();
  for (const kw of unique) words.set(kw, contentWords(kw));

  const assigned = new Set<string>();
  const clusters: KeywordCluster[] = [];

  for (const seed of unique) {
    if (assigned.has(seed)) continue;
    const seedWords = new Set(words.get(seed) ?? []);
    const members = [seed];
    assigned.add(seed);

    for (const candidate of unique) {
      if (assigned.has(candidate)) continue;
      const candWords = words.get(candidate) ?? [];
      const overlap = candWords.filter((w) => seedWords.has(w)).length;
      const minLen = Math.min(seedWords.size, new Set(candWords).size);
      if (overlap >= 2 || (minLen <= 2 && overlap >= 1 && candWords.length > 0 && seedWords.size > 0)) {
        members.push(candidate);
        assigned.add(candidate);
        for (const w of candWords) seedWords.add(w);
      }
    }

    const primary = [...members].sort((a, b) => a.length - b.length)[0] ?? seed;
    clusters.push({ primary, members });
  }

  return clusters.sort((a, b) => b.members.length - a.members.length);
}

/** Map a cluster list back onto enriched keyword rows by keyword text. */
export function attachClusters<T extends { keyword: string }>(
  rows: T[],
  clusters: KeywordCluster[]
): Array<T & { cluster: string | null }> {
  const memberToPrimary = new Map<string, string>();
  for (const cluster of clusters) {
    for (const member of cluster.members) {
      if (cluster.members.length > 1) memberToPrimary.set(member.toLowerCase(), cluster.primary);
    }
  }
  return rows.map((row) => ({
    ...row,
    cluster: memberToPrimary.get(row.keyword.toLowerCase()) ?? null,
  }));
}
