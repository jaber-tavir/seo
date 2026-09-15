"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/client";
import { profileSchema } from "@/validators/auth";

interface ProfileFormValues {
  first_name: string;
  last_name: string;
  avatar: string;
}

interface ProfileFormProps {
  defaults: { first_name: string; last_name: string; avatar: string };
}

export function ProfileForm({ defaults }: ProfileFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema) as never,
    defaultValues: defaults,
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await apiFetch("/api/account/profile", {
        method: "PATCH",
        body: JSON.stringify({
          first_name: values.first_name || undefined,
          last_name: values.last_name,
          avatar: values.avatar === "" ? null : values.avatar || undefined,
        }),
      });
      toast.success("Profile updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="profile-first-name">First name</Label>
          <Input id="profile-first-name" {...register("first_name")} />
          {errors.first_name ? <p className="text-destructive text-xs">{errors.first_name.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-last-name">Last name</Label>
          <Input id="profile-last-name" {...register("last_name")} />
          {errors.last_name ? <p className="text-destructive text-xs">{errors.last_name.message}</p> : null}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile-avatar">Avatar URL (optional)</Label>
        <Input id="profile-avatar" type="url" placeholder="https://…" {...register("avatar")} />
        {errors.avatar ? <p className="text-destructive text-xs">{errors.avatar.message}</p> : null}
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        Save changes
      </Button>
    </form>
  );
}
