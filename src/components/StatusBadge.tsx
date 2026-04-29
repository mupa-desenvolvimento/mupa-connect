import { cn } from "@/lib/utils";
import type { DeviceStatus } from "@/lib/mock-data";

export function StatusBadge({ status }: { status: DeviceStatus | "active" | "scheduled" | "ended" | "online" | "offline" | "unstable" }) {
  const map: Record<string, { label: string; cls: string }> = {
    online:    { label: "Online",    cls: "text-success bg-success/10 border-success/20" },
    offline:   { label: "Offline",   cls: "text-destructive bg-destructive/10 border-destructive/20" },
    unstable:  { label: "Instável",  cls: "text-warning bg-warning/15 border-warning/20" },
    active:    { label: "Ativa",     cls: "text-success bg-success/10 border-success/20" },
    scheduled: { label: "Agendada",  cls: "text-warning bg-warning/15 border-warning/20" },
    ended:     { label: "Encerrada", cls: "text-muted-foreground bg-muted border-muted-foreground/10" },
  };
  const m = map[status];
  return (
    <span className={cn("status-dot inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full", m.cls)}>
      {m.label}
    </span>
  );
}
