import { cn } from "@/lib/utils";
import type { DeviceStatus } from "@/lib/mock-data";

export function StatusBadge({ status }: { status: DeviceStatus | "active" | "scheduled" | "ended" }) {
  const map: Record<string, { label: string; cls: string }> = {
    online:    { label: "Online",    cls: "text-success bg-success/10" },
    offline:   { label: "Offline",   cls: "text-destructive bg-destructive/10" },
    active:    { label: "Ativa",     cls: "text-success bg-success/10" },
    scheduled: { label: "Agendada",  cls: "text-warning bg-warning/15" },
    ended:     { label: "Encerrada", cls: "text-muted-foreground bg-muted" },
  };
  const m = map[status];
  return (
    <span className={cn("status-dot inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full", m.cls)}>
      {m.label}
    </span>
  );
}
