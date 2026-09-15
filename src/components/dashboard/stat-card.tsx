import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  href?: string;
  className?: string;
}

export function StatCard({ title, value, hint, icon: Icon, href, className }: StatCardProps) {
  const content = (
    <Card className={cn("gap-0 py-4 transition-colors", href && "hover:bg-accent/40", className)}>
      <CardContent className="flex items-center gap-4 px-4">
        <span className="bg-secondary text-secondary-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-muted-foreground truncate text-xs font-medium">{title}</p>
          <p className="text-xl font-semibold tracking-tight">{value}</p>
          {hint ? <p className="text-muted-foreground truncate text-xs">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
