import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "@/components/forms/login-form";
import { env } from "@/config/env";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your SEO Tools account.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full max-w-sm" />}>
      <LoginForm googleEnabled={env.googleOAuthEnabled} />
    </Suspense>
  );
}
