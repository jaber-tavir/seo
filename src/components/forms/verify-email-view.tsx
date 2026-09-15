"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/client";

export function VerifyEmailView() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const sent = searchParams.get("sent") === "1";

  const [status, setStatus] = useState<"idle" | "sent" | "verifying" | "success" | "error">(
    token ? "verifying" : sent ? "sent" : "idle"
  );
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);

  const verify = async (value: string) => {
    setStatus("verifying");
    try {
      await apiFetch("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token: value }) });
      setStatus("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Verification failed");
      setStatus("error");
    }
  };

  // Auto-verify once when a token is present
  if (token && status === "verifying" && !message) {
    void verify(token);
  }

  const resend = async () => {
    setResending(true);
    try {
      await apiFetch("/api/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }) });
      toast.success("If that email can be verified, a new link has been sent.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend");
    } finally {
      setResending(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Verify your email</CardTitle>
        <CardDescription>Confirm your address to activate your account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "verifying" ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" /> Verifying your email…
          </div>
        ) : null}

        {status === "sent" ? (
          <div className="space-y-3">
            <div className="bg-secondary/60 flex items-start gap-2 rounded-md px-3 py-2 text-sm">
              <MailCheck className="mt-0.5 size-4 shrink-0" />
              <p>Check your inbox — we sent you a verification link. It expires in 24 hours.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resend-email">Didn&apos;t get it? Resend to</Label>
              <div className="flex gap-2">
                <Input
                  id="resend-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button type="button" variant="outline" onClick={resend} disabled={resending || !email.includes("@")}>
                  {resending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Resend
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {status === "success" ? (
          <div className="space-y-3">
            <p className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-md px-3 py-2 text-sm">
              Your email has been verified and you are now signed in.
            </p>
            <Button className="w-full" asChild>
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="space-y-3">
            <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">{message}</p>
            <div className="space-y-2">
              <Label htmlFor="retry-email">Request a new link</Label>
              <div className="flex gap-2">
                <Input id="retry-email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Button type="button" variant="outline" onClick={resend} disabled={resending || !email.includes("@")}>
                  {resending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Resend
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {status === "idle" ? (
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Open the verification link from your inbox, or request a new one below.
            </p>
            <div className="flex gap-2">
              <Input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Button type="button" variant="outline" onClick={resend} disabled={resending || !email.includes("@")}>
                {resending ? <Loader2 className="size-4 animate-spin" /> : null}
                Resend
              </Button>
            </div>
          </div>
        ) : null}

        <p className="text-muted-foreground text-center text-sm">
          <Link href="/login" className="text-foreground font-medium underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
