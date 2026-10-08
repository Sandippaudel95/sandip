import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sublabel,
  tone = "default",
}: {
  label: string;
  value: string;
  sublabel?: string;
  /** `warn` marks a figure that wants action, such as money outstanding. */
  tone?: "default" | "warn";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5",
        tone === "warn" && "border-warning/30 bg-warning/10",
      )}
    >
      <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-display text-3xl font-semibold tabular-nums",
          tone === "warn" ? "text-warning" : "text-brand",
        )}
      >
        {value}
      </p>
      {sublabel && (
        <p className="mt-1 text-sm text-muted-foreground">{sublabel}</p>
      )}
    </div>
  );
}
