"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import type { ApiResult } from "@/types";

interface SearchResult {
  type: "project" | "keyword" | "report" | "competitor" | "issue";
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  project: "Project",
  keyword: "Keyword",
  report: "Report",
  competitor: "Competitor",
  issue: "SEO Issue",
};

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [inputValue, setInputValue] = useState("");
  const debouncedQuery = useDebounce(inputValue, 300);

  const { data, isFetching } = useQuery<{ results: SearchResult[] }>({
    queryKey: ["global-search", debouncedQuery],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
      const json = (await res.json()) as ApiResult<{ results: SearchResult[] }>;
      if (!json.success) throw new Error(json.error.message);
      return json.data;
    },
    enabled: open && debouncedQuery.trim().length >= 2,
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) setInputValue("");
  }, [open]);

  const results = data?.results ?? [];

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-muted-foreground hidden h-8 w-56 justify-start gap-2 font-normal md:flex"
        onClick={() => onOpenChange(true)}
      >
        <SearchIcon className="size-4" />
        Search…
        <kbd className="bg-muted ml-auto rounded border px-1.5 font-mono text-[10px]">Ctrl K</kbd>
      </Button>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => onOpenChange(true)} aria-label="Search">
        <SearchIcon className="size-5" />
      </Button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Global search</DialogTitle>
            <DialogDescription>Search projects, keywords, reports, competitors and issues</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Search projects, keywords, reports…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {inputValue.trim().length < 2 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">Type at least 2 characters to search</p>
            ) : isFetching ? (
              <p className="text-muted-foreground py-6 text-center text-sm">Searching…</p>
            ) : results.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">No results found</p>
            ) : (
              results.map((r) => (
                <Link
                  key={`${r.type}-${r.id}`}
                  href={r.href}
                  onClick={() => onOpenChange(false)}
                  className="hover:bg-accent flex items-center gap-3 rounded-md px-3 py-2"
                >
                  <span className="bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 text-[10px] font-medium">
                    {TYPE_LABELS[r.type]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{r.title}</span>
                    {r.subtitle ? <span className="text-muted-foreground block truncate text-xs">{r.subtitle}</span> : null}
                  </span>
                </Link>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
