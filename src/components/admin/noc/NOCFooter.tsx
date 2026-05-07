import { Activity, ShieldCheck, Heart, Cpu } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function NOCFooter() {
  const now = new Date();

  return (
    <footer className="flex items-center justify-between px-6 py-2 bg-[#050507] border-t border-white/5 text-white/20 shrink-0">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3 w-3 text-green-500/50" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Secure Session Active</span>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Cpu className="h-3 w-3" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Processing Node: US-EAST-1</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Heart className="h-3 w-3 text-red-500/30 fill-red-500/10 animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">System Heartbeat OK</span>
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.1em]">
          {format(now, "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </div>
      </div>
    </footer>
  );
}
