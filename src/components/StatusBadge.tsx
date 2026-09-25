import { cn } from "@/lib/utils";

type Tone = "muted" | "info" | "success" | "warning" | "destructive" | "primary";

const toneClass: Record<Tone, string> = {
  muted: "bg-muted text-muted-foreground",
  info: "bg-info/12 text-info",
  success: "bg-success/12 text-success",
  warning: "bg-warning/18 text-warning-foreground dark:text-warning",
  destructive: "bg-destructive/12 text-destructive",
  primary: "bg-primary/12 text-primary",
};

export function StatusBadge({
  label,
  tone = "muted",
  className,
}: {
  label: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        toneClass[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
