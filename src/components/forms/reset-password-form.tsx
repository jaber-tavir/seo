"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/client";
import { resetPasswordSchema, type ResetPasswordInput } from "@/validators/auth";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await apiFetch("/api/auth/reset-password", { method: "POST", body: JSON.stringify(values) });
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setSubmitting(false);
    }
  });

  if (done) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Password updated</CardTitle>
          <CardDescription>Your password has been changed. You can now sign in with the new password.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" asChild>
            <Link href="/login">Go to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Choose a new password</CardTitle>
        <CardDescription>Make it strong — at least 8 characters with a letter and a number.</CardDescription>
      </CardHeader>
      <CardContent>
        {token ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <input type="hidden" {...register("token")} />
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
              {errors.password ? <p className="text-destructive text-xs">{errors.password.message}</p> : null}
              {errors.token ? <p className="text-destructive text-xs">{errors.token.message}</p> : null}
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Reset password
            </Button>
          </form>
        ) : (
          <p className="text-destructive text-sm">This link is missing its token. Please request a new password reset.</p>
        )}
        <p className="text-muted-foreground mt-4 text-center text-sm">
          <Link href="/forgot-password" className="text-foreground font-medium underline-offset-4 hover:underline">
            Request a new link
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
