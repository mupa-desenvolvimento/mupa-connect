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
    <span className={cn("inline-flex items-center text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border", m.cls)}>
      <div className={cn("w-1 h-1 rounded-full mr-1.5", m.cls.split(' ')[0].replace('text-', 'bg-'))} />
      {m.label}
    </span>
  );
}
