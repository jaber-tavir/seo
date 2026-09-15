"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SEARCH_ENGINES } from "@/constants";
import { apiFetch } from "@/lib/client";
import { createProjectSchema } from "@/validators/project";

type FormValues = {
  name: string;
  website_url: string;
  country: string;
  language: string;
  search_engine: (typeof SEARCH_ENGINES)[number];
  sitemap_url?: string;
};

interface ProjectFormDialogProps {
  label?: string;
}

export function ProjectFormDialog({ label = "New project" }: ProjectFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: "", website_url: "", country: "us", language: "en", search_engine: "google", sitemap_url: "" },
  });

  const searchEngine = watch("search_engine");

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await apiFetch("/api/projects", { method: "POST", body: JSON.stringify(values) });
      toast.success("Project created");
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a project</DialogTitle>
          <DialogDescription>Connect a website to start tracking its SEO.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input id="project-name" placeholder="My Website" {...register("name")} />
            {errors.name ? <p className="text-destructive text-xs">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-url">Website URL</Label>
            <Input id="project-url" placeholder="https://example.com" {...register("website_url")} />
            {errors.website_url ? <p className="text-destructive text-xs">{errors.website_url.message}</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="project-country">Country</Label>
              <Input id="project-country" placeholder="us" {...register("country")} />
              {errors.country ? <p className="text-destructive text-xs">{errors.country.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-language">Language</Label>
              <Input id="project-language" placeholder="en" {...register("language")} />
              {errors.language ? <p className="text-destructive text-xs">{errors.language.message}</p> : null}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Search engine</Label>
            <Select value={searchEngine} onValueChange={(v) => setValue("search_engine", v as FormValues["search_engine"])}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select search engine" />
              </SelectTrigger>
              <SelectContent>
                {SEARCH_ENGINES.map((engine) => (
                  <SelectItem key={engine} value={engine} className="capitalize">
                    {engine}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
