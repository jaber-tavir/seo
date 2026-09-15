"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { analyzeKeywordDensity, type KeywordStat } from "@/lib/tools/keyword-density";

const SAMPLE = `Lisbon airport transfer made simple. Our private Lisbon airport transfer service connects the airport with your hotel in minutes.
Booking an airport transfer Lisbon travellers recommend is easy: choose your vehicle, add your flight number and we track your landing.
Fixed prices, no surge fees, and a free waiting period make this Lisbon airport shuttle the stress-free option for families and business travellers alike.`;

function StatTable({ title, stats }: { title: string; stats: KeywordStat[] }) {
  if (!stats.length) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">{title}</h4>
      <div className="grid gap-1.5">
        {stats.slice(0, 10).map((s) => (
          <div key={s.phrase} className="flex items-center gap-3 text-sm">
            <span className="w-40 truncate font-mono text-xs">{s.phrase}</span>
            <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
              <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(100, (s.count / (stats[0]?.count || 1)) * 100)}%` }} />
            </div>
            <span className="text-muted-foreground w-16 text-right text-xs">{s.count}x · {s.density.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function KeywordDensityTool() {
  const [text, setText] = useState(SAMPLE);
  const [focus, setFocus] = useState("lisbon airport transfer");

  const result = useMemo(() => analyzeKeywordDensity(text), [text]);

  const focusCount = useMemo(() => {
    const term = focus.trim().toLowerCase();
    if (!term) return null;
    const occurrences = text.toLowerCase().split(term).length - 1;
    const termWords = term.split(/\s+/).filter(Boolean).length;
    return { term, occurrences, density: result.totalWords ? (occurrences * termWords / result.totalWords) * 100 : 0 };
  }, [focus, text, result.totalWords]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} className="min-h-56" placeholder="Paste your content here (plain text or HTML)..." />
        <div className="space-y-3">
          <Input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="Focus keyword (optional)" />
          {focusCount ? (
            <div className="rounded-lg border p-3 text-sm">
              <div className="font-medium">{focusCount.term}</div>
              <div className="text-muted-foreground text-xs">Found {focusCount.occurrences} time(s)</div>
              <Badge variant={focusCount.density > 3 ? "destructive" : focusCount.density > 0.5 ? "default" : "secondary"} className="mt-2">
                {focusCount.density.toFixed(2)}% density
              </Badge>
              <p className="text-muted-foreground mt-2 text-xs">
                {focusCount.density > 3 ? "Above 3% risks keyword stuffing - reduce usage or use synonyms." : "Within the recommended 0.5%-3% range."}
              </p>
            </div>
          ) : null}
          <div className="rounded-lg border p-3 text-sm">
            <div className="flex justify-between"><span>Words</span><span className="font-medium">{result.totalWords}</span></div>
            <div className="flex justify-between"><span>Sentences</span><span className="font-medium">{result.sentences}</span></div>
            <div className="flex justify-between"><span>Avg words/sentence</span><span className="font-medium">{result.avgWordsPerSentence}</span></div>
          </div>
          <Button variant="outline" className="w-full" onClick={() => setText("")}>Clear</Button>
        </div>
      </div>

      {result.overOptimised.length ? (
        <div className="text-destructive rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          Over-optimised: {result.overOptimised.map((s) => `${s.phrase} (${s.density.toFixed(1)}%)`).join(", ")} exceed the 3% density guideline.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <StatTable title="Single keywords" stats={result.single} />
        <StatTable title="2-word phrases" stats={result.twoWord} />
        <StatTable title="3-word phrases" stats={result.threeWord} />
      </div>
    </div>
  );
}
