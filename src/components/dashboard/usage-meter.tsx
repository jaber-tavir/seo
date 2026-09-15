import { Progress } from "@/components/ui/progress";
import { formatNumber } from "@/lib/utils";

interface UsageMeterProps {
  label: string;
  used: number;
  limit: number; // -1 = unlimited
  percent: number | null;
}

export function UsageMeter({ label, used, limit, percent }: UsageMeterProps) {
  const unlimited = limit === -1;
  const displayLimit = unlimited ? "Unlimited" : formatNumber(limit);

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground text-xs">
          {formatNumber(used)} / {displayLimit}
        </span>
      </div>
      {unlimited ? (
        <div className="bg-primary/15 text-primary dark:text-primary-foreground h-2 w-full rounded-full text-center text-[10px] leading-2">∞</div>
      ) : (
        <Progress value={percent ?? 0} aria-label={`${label} usage`} />
      )}
    </div>
  );
}
