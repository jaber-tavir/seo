import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";
import { VerifyEmailView } from "@/components/forms/verify-email-view";

export const metadata: Metadata = {
  title: "Verify email",
  robots: { index: false, follow: false },
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Skeleton className="h-72 w-full max-w-sm" />}>
      <VerifyEmailView />
    </Suspense>
  );
}
