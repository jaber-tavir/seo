/**
 * Deterministic readability analysis (Flesch Reading Ease + Flesch-Kincaid).
 * No AI / external calls - pure text statistics used by the AI assistant UI.
 */

export interface ReadabilityResult {
  words: number;
  sentences: number;
  syllables: number;
  avgWordsPerSentence: number;
  avgSyllablesPerWord: number;
  fleshReadingEase: number; // 0-100, higher = easier
  gradeLevel: number; // Flesch-Kincaid grade
  complexity: "very_easy" | "easy" | "fairly_easy" | "standard" | "fairly_difficult" | "difficult" | "very_difficult";
  longWordRatio: number; // share of words with 3+ syllables
}

const SENTENCE_END = /[.!?]+(\s|$)/;
const WORD_SPLIT = /[^\p{L}\p{N}']+/u;

/** Split text into sentences (fallback to whole text as one sentence). */
export function splitSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const parts = trimmed.split(SENTENCE_END).map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [trimmed];
}

/** Estimate syllable count of a single word (vowel-group heuristic). */
export function countSyllables(word: string): number {
  const lower = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!lower) return 0;
  // Remove silent final "e" (but keep -le endings like "table")
  let w = lower;
  if (w.length > 2 && w.endsWith("e") && !w.endsWith("le")) {
    w = w.slice(0, -1);
  }
  const groups = w.match(/[aeiouy]+/g) ?? [];
  return Math.max(1, groups.length);
}

/** Analyze readability of a text. */
export function analyzeReadability(text: string): ReadabilityResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      words: 0,
      sentences: 0,
      syllables: 0,
      avgWordsPerSentence: 0,
      avgSyllablesPerWord: 0,
      fleshReadingEase: 0,
      gradeLevel: 0,
      complexity: "very_difficult",
      longWordRatio: 0,
    };
  }

  const sentences = trimmed.split(SENTENCE_END).filter((s) => s.trim().length > 0);
  const words = trimmed.split(WORD_SPLIT).filter(Boolean);
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const longWords = words.filter((w) => countSyllables(w) >= 3).length;

  const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0;
  const avgSyllablesPerWord = words.length > 0 ? totalSyllables / words.length : 0;

  // Flesch Reading Ease
  const fleshReadingEase = Math.max(
    0,
    Math.min(100, 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord)
  );
  // Flesch-Kincaid Grade Level (clamped to 0-20)
  const gradeLevel = Math.max(
    0,
    Math.min(20, 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59)
  );

  let complexity: ReadabilityResult["complexity"];
  if (fleshReadingEase >= 90) complexity = "very_easy";
  else if (fleshReadingEase >= 80) complexity = "easy";
  else if (fleshReadingEase >= 70) complexity = "fairly_easy";
  else if (fleshReadingEase >= 60) complexity = "standard";
  else if (fleshReadingEase >= 50) complexity = "fairly_difficult";
  else if (fleshReadingEase >= 30) complexity = "difficult";
  else complexity = "very_difficult";

  return {
    words: words.length,
    sentences: sentences.length,
    syllables: totalSyllables,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 10) / 10,
    fleshReadingEase: Math.round(fleshReadingEase * 10) / 10,
    gradeLevel: Math.round(gradeLevel * 10) / 10,
    complexity,
    longWordRatio: words.length > 0 ? Math.round((longWords / words.length) * 100) / 100 : 0,
  };
}