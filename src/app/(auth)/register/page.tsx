import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";
import { RegisterForm } from "@/components/forms/register-form";
import { env } from "@/config/env";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your free SEO Tools account.",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[28rem] w-full max-w-sm" />}>
      <RegisterForm googleEnabled={env.googleOAuthEnabled} />
    </Suspense>
  );
}
