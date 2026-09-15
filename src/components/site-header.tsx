import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { APP_NAME } from "@/constants";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/session";

/** Public site header - session-aware (server component) */
export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="bg-background/95 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
            <TrendingUp className="size-4" />
          </span>
          {APP_NAME}
        </Link>

        <nav className="ml-6 hidden items-center gap-5 text-sm font-medium text-muted-foreground md:flex">
          <Link href="/#features" className="hover:text-foreground">
            Features
          </Link>
          <Link href="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link href="/tools" className="hover:text-foreground">
            SEO Tools
          </Link>
          <Link href="/register" className="hover:text-foreground">
            Get started
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <Button size="sm" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Start free</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
