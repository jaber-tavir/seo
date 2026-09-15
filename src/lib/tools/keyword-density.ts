/** Keyword density analysis - n-gram extraction with stop-word filtering */

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "had", "has", "have",
  "he", "her", "his", "i", "if", "in", "into", "is", "it", "its", "of", "on", "or", "our",
  "she", "so", "that", "the", "their", "them", "then", "there", "these", "they", "this", "to",
  "up", "was", "we", "were", "what", "when", "which", "who", "will", "with", "you", "your",
  "not", "can", "do", "does", "did", "how", "all", "any", "been", "because", "been", "also",
  "about", "after", "again", "am", "being", "between", "both", "each", "few", "more", "most",
  "no", "nor", "only", "other", "out", "over", "own", "same", "some", "such", "than", "too",
  "very", "us", "just", "get", "got", "would", "could", "should", "one", "two", "dont", "won",
]);

export interface KeywordStat {
  phrase: string;
  count: number;
  density: number; // percentage of total n-grams
  words: number;
}

export interface KeywordDensityResult {
  totalWords: number;
  sentences: number;
  avgWordsPerSentence: number;
  single: KeywordStat[];
  twoWord: KeywordStat[];
  threeWord: KeywordStat[];
  overOptimised: KeywordStat[];
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ""))
    .filter((w) => w.length > 1);
}

function countNgrams(tokens: string[], n: number): KeywordStat[] {
  if (tokens.length < n) return [];
  const total = tokens.length - n + 1;
  const counts = new Map<string, number>();

  for (let i = 0; i <= tokens.length - n; i++) {
    const gram = tokens.slice(i, i + n);
    // skip n-grams made entirely of stop words (meaningless)
    if (gram.every((w) => STOP_WORDS.has(w))) continue;
    const key = gram.join(" ");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([phrase, count]) => ({ phrase, count, density: (count / Math.max(total, 1)) * 100, words: n }))
    .filter((s) => s.count >= 2 || n === 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
}

export function analyzeKeywordDensity(text: string): KeywordDensityResult {
  const clean = text.replace(/<[^>]*>/g, " ");
  const tokens = tokenize(clean);
  const sentenceParts = clean.split(/[.!?]+/).filter((s) => s.trim().length > 2);

  const single = countNgrams(tokens, 1);
  const twoWord = countNgrams(tokens, 2);
  const threeWord = countNgrams(tokens, 3);

  const overOptimised = single.filter((s) => s.density > 3);

  return {
    totalWords: tokens.length,
    sentences: sentenceParts.length,
    avgWordsPerSentence: sentenceParts.length ? Math.round(tokens.length / sentenceParts.length) : 0,
    single,
    twoWord,
    threeWord,
    overOptimised,
  };
}
