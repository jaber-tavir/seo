import Link from "next/link";
import { APP_NAME } from "@/constants";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
        <nav className="flex flex-wrap items-center gap-4">
          <Link href="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link href="/register" className="hover:text-foreground">
            Create account
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Sign in
          </Link>
          <a href="/api/health" className="hover:text-foreground">
            System status
          </a>
        </nav>
      </div>
    </footer>
  );
}
