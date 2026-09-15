"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { apiPost } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResearchResults, type ResearchResultData } from "@/components/dashboard/keyword-research";

/** Client host that wires the research form to its results (page itself is a server component). */
export function ResearchHost({ projectId }: { projectId: string }) {
  const [keyword, setKeyword] = useState("");
  const [country, setCountry] = useState("us");
  const [result, setResult] = useState<ResearchResultData | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      apiPost<ResearchResultData>("/api/keywords/research", { keyword: keyword.trim(), country, language: "en", limit: 20 }),
    onSuccess: (res) => {
      if (res.success) setResult(res.data);
      else toast.error(res.error.message);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-52 flex-1 space-y-1.5">
          <Label htmlFor="kr-seed">Seed keyword</Label>
          <Input
            id="kr-seed"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="e.g. airport transfer Lisbon"
            onKeyDown={(e) => {
              if (e.key === "Enter" && keyword.trim() && !mutation.isPending) mutation.mutate();
            }}
          />
        </div>
        <div className="w-32 space-y-1.5">
          <Label>Country</Label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["us", "gb", "de", "fr", "es", "it", "tr", "ca", "au", "br", "in", "nl"].map((c) => (
                <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !keyword.trim()}>
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Research
        </Button>
      </div>

      {result?.demo ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
          Demo data source: no keyword provider credentials are configured, so metrics are unavailable.
          Set DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD to enable live search volume, difficulty and CPC.
        </p>
      ) : null}

      {result ? <ResearchResults result={result} projectId={projectId} /> : null}
    </div>
  );
}

