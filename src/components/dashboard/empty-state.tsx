import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-14 text-center">
      <span className="bg-secondary text-muted-foreground flex size-12 items-center justify-center rounded-full">
        <Icon className="size-6" />
      </span>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      {description ? <p className="text-muted-foreground mt-1 max-w-sm text-sm">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
