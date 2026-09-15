import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { APP_NAME } from "@/constants";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/30 flex min-h-svh flex-col items-center justify-center gap-6 p-4">
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
          <TrendingUp className="size-4" />
        </span>
        {APP_NAME}
      </Link>
      {children}
    </div>
  );
}
