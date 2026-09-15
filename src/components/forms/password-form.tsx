"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/client";
import { passwordChangeSchema } from "@/validators/auth";

interface PasswordFormValues {
  current_password: string;
  new_password: string;
}

export function PasswordForm() {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormValues>({ resolver: zodResolver(passwordChangeSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const data = await apiFetch<{ message: string }>("/api/account/password", {
        method: "PATCH",
        body: JSON.stringify(values),
      });
      toast.success(data.message ?? "Password updated");
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="current-password">Current password</Label>
        <Input id="current-password" type="password" autoComplete="current-password" {...register("current_password")} />
        {errors.current_password ? <p className="text-destructive text-xs">{errors.current_password.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <Input id="new-password" type="password" autoComplete="new-password" {...register("new_password")} />
        {errors.new_password ? <p className="text-destructive text-xs">{errors.new_password.message}</p> : null}
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        Update password
      </Button>
    </form>
  );
}
