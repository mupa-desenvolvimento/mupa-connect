import { useState, useRef, useEffect } from "react";
import { format, addHours, startOfDay, addDays, differenceInMinutes, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Layers, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Campaign {
  id: string;
  name: string;
  color: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  priority: number;
}

interface CampaignTimelineProps {
  campaigns: Campaign[];
  onSelectCampaign: (id: string) => void;
}

export function CampaignTimeline({ campaigns, onSelectCampaign }: CampaignTimelineProps) {
  const [zoom, setZoom] = useState(1); // 1 = 1 hour is 100px
  const [scrollDate, setScrollDate] = useState(startOfDay(new Date()));
  const timelineRef = useRef<HTMLDivElement>(null);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const hourWidth = 100 * zoom;

  // Filter campaigns that overlap with the current day view
  const visibleCampaigns = campaigns.filter(c => {
    const start = new Date(`${c.start_date}T00:00:00`);
    const end = new Date(`${c.end_date}T23:59:59`);
    return isWithinInterval(scrollDate, { start, end });
  });

  return (
    <div className="flex flex-col h-full bg-[#0c0c0e]/40 rounded-2xl border border-white/5 overflow-hidden shadow-premium backdrop-blur-md">
      <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs font-black text-primary bg-primary/10 px-5 py-2 rounded-xl border border-primary/20 uppercase tracking-[0.2em] italic">
            <Clock className="h-4 w-4 text-primary" />
            {format(scrollDate, "dd 'de' MMMM", { locale: ptBR })}
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/5 mr-4">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10" onClick={() => setZoom(Math.max(0.5, zoom - 0.2))}>
              <ZoomOut className="h-4 w-4 text-white/40" />
            </Button>
            <div className="text-[10px] font-black px-3 text-white/40 uppercase tracking-widest">{Math.round(zoom * 100)}%</div>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10" onClick={() => setZoom(Math.min(3, zoom + 0.2))}>
              <ZoomIn className="h-4 w-4 text-white/40" />
            </Button>
          </div>
          <Button variant="secondary" size="sm" className="h-10 text-[10px] font-black uppercase tracking-widest px-6" onClick={() => setScrollDate(addDays(scrollDate, -1))}>
            Anterior
          </Button>
          <Button variant="secondary" size="sm" className="h-10 text-[10px] font-black uppercase tracking-widest px-6" onClick={() => setScrollDate(new Date())}>
            Hoje
          </Button>
          <Button variant="secondary" size="sm" className="h-10 text-[10px] font-black uppercase tracking-widest px-6" onClick={() => setScrollDate(addDays(scrollDate, 1))}>
            Próximo
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto relative custom-scrollbar" ref={timelineRef}>
        {/* Time Labels Header */}
        <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-sm border-b border-border/40 flex h-10">
          <div className="w-48 flex-shrink-0 border-r border-border/40 bg-muted/30 flex items-center px-4 font-bold text-xs uppercase text-muted-foreground tracking-wider">
            Campanha
          </div>
          <div className="flex" style={{ width: 24 * hourWidth }}>
            {hours.map(h => (
              <div 
                key={h} 
                className="border-r border-border/20 flex-shrink-0 text-[10px] font-bold text-muted-foreground/70 flex items-center justify-center"
                style={{ width: hourWidth }}
              >
                {h.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        <div className="flex flex-col min-h-full divide-y divide-border/10">
          {visibleCampaigns.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12 gap-3 opacity-40">
              <Layers className="h-12 w-12" />
              <p className="font-medium">Nenhuma campanha programada para este dia.</p>
            </div>
          ) : (
            visibleCampaigns.map(c => {
              const [startH, startM] = c.start_time.split(':').map(Number);
              const [endH, endM] = (c.end_time || "23:59").split(':').map(Number);
              
              const startOffset = (startH * 60 + startM) * (hourWidth / 60);
              const duration = ((endH * 60 + endM) - (startH * 60 + startM)) * (hourWidth / 60);

              return (
                <div key={c.id} className="flex group hover:bg-muted/5 transition-colors">
                  <div className="w-48 flex-shrink-0 border-r border-border/40 p-4 bg-muted/5 flex items-center gap-3">
                    <div className="h-8 w-1.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: c.color }} />
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate group-hover:text-primary transition-colors">{c.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">P{c.priority}</div>
                    </div>
                  </div>
                  <div className="flex-1 relative h-20" style={{ width: 24 * hourWidth }}>
                    {/* Background grid lines */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {hours.map(h => (
                        <div key={h} className="border-r border-border/5 flex-shrink-0 h-full" style={{ width: hourWidth }} />
                      ))}
                    </div>
                    
                    {/* Campaign Block */}
                    <div
                      className="absolute top-3 bottom-3 rounded-xl border-2 shadow-sm transition-all cursor-pointer hover:scale-[1.01] hover:shadow-glow-sm flex flex-col justify-center px-4 overflow-hidden"
                      style={{
                        left: startOffset,
                        width: Math.max(40, duration),
                        backgroundColor: `${c.color}15`,
                        borderColor: c.color,
                        color: c.color,
                        boxShadow: `0 0 15px ${c.color}10`
                      }}
                      onClick={() => onSelectCampaign(c.id)}
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 opacity-40" style={{ backgroundColor: c.color }} />
                      <div className="text-[11px] font-black truncate uppercase tracking-tight">{c.name}</div>
                      <div className="text-[9px] font-bold opacity-80 flex items-center gap-1.5 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {c.start_time.substring(0, 5)} - {c.end_time?.substring(0, 5) || "23:59"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
