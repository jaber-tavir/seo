import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <SearchX className="text-muted-foreground size-10" />
      <h1 className="text-4xl font-bold tracking-tight">404</h1>
      <p className="text-muted-foreground max-w-md text-sm">The page you are looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
      <Link
        href="/"
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center rounded-md px-4 text-sm font-medium"
      >
        Back to home
      </Link>
    </div>
  );
}
