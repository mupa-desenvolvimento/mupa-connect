import { Activity, WifiOff, AlertTriangle, Monitor, Store, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface NOCStatsBarProps {
  stats: {
    online: number;
    offline: number;
    unstable: number;
    noPlaylist: number;
    playerStuck: number;
    criticalStores: number;
    queryErrors: number;
  };
}

export function NOCStatsBar({ stats }: NOCStatsBarProps) {
  return (
    <div className="flex items-center gap-6 px-4 py-2 bg-[#111114] border-y border-white/5 overflow-x-auto no-scrollbar">
      <StatItem 
        label="Online" 
        value={stats.online} 
        color="text-green-500" 
        icon={Activity} 
        glow="bg-green-500/10"
      />
      <StatItem 
        label="Offline" 
        value={stats.offline} 
        color="text-red-500" 
        icon={WifiOff} 
        glow="bg-red-500/10"
        pulse
      />
      <StatItem 
        label="Instáveis" 
        value={stats.unstable} 
        color="text-yellow-500" 
        icon={AlertTriangle} 
        glow="bg-yellow-500/10"
      />
      <StatItem 
        label="Sem Playlist" 
        value={stats.noPlaylist} 
        color="text-orange-500" 
        icon={Monitor} 
        glow="bg-orange-500/10"
      />
      <StatItem 
        label="Player Travado" 
        value={stats.playerStuck} 
        color="text-purple-500" 
        icon={AlertCircle} 
        glow="bg-purple-500/10"
      />
      <StatItem 
        label="Lojas Críticas" 
        value={stats.criticalStores} 
        color="text-red-600" 
        icon={Store} 
        glow="bg-red-600/10"
        pulse
      />
    </div>
  );
}

function StatItem({ label, value, color, icon: Icon, glow, pulse }: any) {
  return (
    <div className="flex items-center gap-3 shrink-0 py-1">
      <div className={cn(
        "h-9 w-9 rounded-lg flex items-center justify-center border border-white/5",
        glow
      )}>
        <Icon className={cn("h-5 w-5", color, pulse && "animate-pulse")} />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 leading-none mb-1">
          {label}
        </span>
        <span className={cn("text-xl font-black leading-none tracking-tight", color)}>
          {value}
        </span>
      </div>
    </div>
  );
}
