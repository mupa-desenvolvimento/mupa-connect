import { cn } from "@/lib/utils";
import type { DeviceStatus } from "@/lib/mock-data";

export function StatusBadge({ status }: { status: DeviceStatus | "active" | "scheduled" | "ended" | "online" | "offline" | "unstable" }) {
  const map: Record<string, { label: string; cls: string }> = {
    online:    { label: "Online",    cls: "text-success bg-success/15 border-success/30 shadow-[0_0_8px_rgba(34,197,94,0.1)]" },
    offline:   { label: "Offline",   cls: "text-destructive bg-destructive/15 border-destructive/30 shadow-[0_0_8px_rgba(239,68,68,0.1)]" },
    unstable:  { label: "Instável",  cls: "text-warning bg-warning/20 border-warning/40 shadow-[0_0_8px_rgba(234,179,8,0.1)]" },
    active:    { label: "Ativa",     cls: "text-success bg-success/15 border-success/30 shadow-[0_0_8px_rgba(34,197,94,0.1)]" },
    scheduled: { label: "Agendada",  cls: "text-warning bg-warning/20 border-warning/40 shadow-[0_0_8px_rgba(234,179,8,0.1)]" },
    ended:     { label: "Encerrada", cls: "text-white/60 bg-white/5 border-white/20" },

  };
  const m = map[status];
  return (
    <span className={cn("inline-flex items-center text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border", m.cls)}>
      <div className={cn("w-1 h-1 rounded-full mr-1.5", m.cls.split(' ')[0].replace('text-', 'bg-'))} />
      {m.label}
    </span>
  );
}
