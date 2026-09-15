"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SCHEMA_TYPES, getSchemaDefinition, validateSchema, type SchemaType } from "@/lib/tools/schema";

export function SchemaGenerator() {
  const [type, setType] = useState<SchemaType>("Article");
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  // stable field list per selected type
  const fieldDefs = useMemo(() => getSchemaDefinition(type).fields, [type]);
  const result = useMemo(() => validateSchema(type, values), [type, values]);

  function switchType(next: string) {
    setType(next as SchemaType);
    setValues({});
  }

  function copy() {
    navigator.clipboard.writeText(result.json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("JSON-LD copied");
    });
  }

  function download() {
    const blob = new Blob([result.json], { type: "application/ld+json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${type.toLowerCase()}-schema.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }


  return (
    <div className="space-y-5">
      <Tabs value={type} onValueChange={switchType}>
        <TabsList className="flex h-auto flex-wrap">
          {SCHEMA_TYPES.map((t) => (
            <TabsTrigger key={t} value={t}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid gap-3 sm:grid-cols-2">
          {fieldDefs.map((field) => (
            <div key={field.name} className={field.type === "textarea" || field.type === "list" ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}>
              <Label htmlFor={`sc-${field.name}`}>
                {field.label} {field.required ? <span className="text-destructive">*</span> : <span className="text-muted-foreground text-xs">(optional)</span>}
              </Label>
              {field.type === "textarea" || field.type === "list" ? (
                <textarea
                  id={`sc-${field.name}`}
                  value={values[field.name] ?? ""}
                  onChange={(e) => setValues((p) => ({ ...p, [field.name]: e.target.value }))}
                  rows={field.type === "list" ? 3 : 2}
                  placeholder={field.placeholder}
                  className="border-input bg-background min-h-16 w-full rounded-md border p-2 text-sm"
                />
              ) : field.type === "select" ? (
                <select
                  id={`sc-${field.name}`}
                  value={values[field.name] ?? field.options?.[0] ?? ""}
                  onChange={(e) => setValues((p) => ({ ...p, [field.name]: e.target.value }))}
                  className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                >
                  {field.options?.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <Input
                  id={`sc-${field.name}`}
                  type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                  value={values[field.name] ?? ""}
                  onChange={(e) => setValues((p) => ({ ...p, [field.name]: e.target.value }))}
                  placeholder={field.placeholder}
                />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm font-medium">JSON-LD output</span>
            <Button size="sm" variant="outline" onClick={copy} disabled={!result.ok}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />} Copy
            </Button>
            <Button size="sm" variant="outline" onClick={download} disabled={!result.ok}>
              <Download className="size-4" /> Download
            </Button>
          </div>
          {result.errors.length ? (
            <ul className="text-destructive space-y-0.5 text-xs">
              {result.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
          <pre className="bg-muted max-h-96 min-h-48 overflow-auto rounded-lg p-4 text-xs leading-relaxed">
            <code>{result.json || "// Fill the required fields to generate JSON-LD"}</code>
          </pre>
          <p className="text-muted-foreground text-xs">
            Add inside the {'<head>'} of your page wrapped in a {'<script type="application/ld+json">'} tag, or validate with Google&apos;s Rich Results Test.
          </p>
        </div>
      </div>
    </div>
  );
}
