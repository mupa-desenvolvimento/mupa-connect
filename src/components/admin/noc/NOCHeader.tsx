import { Activity, Share2, LayoutGrid, Maximize2, Minimize2, X, Globe, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuRadioGroup, 
  DropdownMenuRadioItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface NOCHeaderProps {
  lastUpdate: Date;
  loading: boolean;
  isFullscreen: boolean;
  layout: string;
  onLayoutChange: (layout: any) => void;
  onFullscreenToggle: () => void;
  onShare: () => void;
  onExit: () => void;
  sharing: boolean;
}

export function NOCHeader({ 
  lastUpdate, 
  loading, 
  isFullscreen, 
  layout, 
  onLayoutChange, 
  onFullscreenToggle, 
  onShare, 
  onExit,
  sharing
}: NOCHeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-[#0a0a0c] border-b border-white/5 shrink-0">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]">
            <Activity className="h-6 w-6" />
          </div>
          <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-[#0a0a0c] flex items-center justify-center shadow-lg">
            <ShieldCheck className="h-2.5 w-2.5 text-white" />
          </div>
        </div>
        
        <div className="flex flex-col">
          <h1 className="text-xl font-black uppercase tracking-tighter text-white leading-none">
            Mupa <span className="text-primary">NOC</span> <span className="text-white/20 font-light">Central</span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1">
              <Globe className="h-3 w-3 text-white/20" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Global Ops</span>
            </div>
            <div className="h-1 w-1 rounded-full bg-white/10" />
            <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
              Last Sync: {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-4 px-4 h-9 rounded-full bg-white/5 border border-white/5 mr-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Sistemas OK</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">API Latency:</span>
            <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">24ms</span>
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="h-9 gap-2 bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
          onClick={onShare}
          disabled={sharing}
        >
          {sharing ? <Activity className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
          <span className="hidden sm:inline">Compartilhar</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2 bg-white/5 border-white/10 text-white/70">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Grid</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-[#111114] border-white/10 text-white">
            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest opacity-40">Estrutura</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuRadioGroup value={layout} onValueChange={onLayoutChange}>
              <DropdownMenuRadioItem value="auto" className="text-xs">Auto Adaptável</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="4" className="text-xs">4 Painéis (2x2)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="6" className="text-xs">6 Painéis (3x2)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="9" className="text-xs">9 Painéis (3x3)</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button 
          variant="secondary" 
          size="sm" 
          className={cn(
            "h-9 gap-2 font-bold uppercase tracking-widest text-[10px]",
            isFullscreen ? "bg-white/20" : "bg-primary text-primary-foreground"
          )}
          onClick={onFullscreenToggle}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          <span className="hidden sm:inline">{isFullscreen ? "Sair TV" : "Modo TV"}</span>
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 text-white/40 hover:text-white"
          onClick={onExit}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
