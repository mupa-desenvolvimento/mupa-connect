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
    <div className="flex flex-col h-full bg-card rounded-xl border border-border/60 overflow-hidden">
      <div className="p-4 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="font-bold text-lg">Timeline Diária</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-1 rounded-full">
            <Clock className="h-4 w-4" />
            {format(scrollDate, "dd 'de' MMMM", { locale: ptBR })}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setZoom(Math.max(0.5, zoom - 0.2))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setZoom(Math.min(3, zoom + 0.2))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-px h-8 bg-border/40 mx-2" />
          <Button variant="outline" size="sm" onClick={() => setScrollDate(addDays(scrollDate, -1))}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" onClick={() => setScrollDate(new Date())}>
            Hoje
          </Button>
          <Button variant="outline" size="sm" onClick={() => setScrollDate(addDays(scrollDate, 1))}>
            Próximo
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto relative" ref={timelineRef}>
        {/* Time Labels Header */}
        <div className="sticky top-0 z-20 bg-card border-b border-border/40 flex h-10">
          <div className="w-32 flex-shrink-0 border-r border-border/40 bg-muted/10 flex items-center px-4 font-bold text-xs uppercase text-muted-foreground">
            Campanha
          </div>
          <div className="flex" style={{ width: 24 * hourWidth }}>
            {hours.map(h => (
              <div 
                key={h} 
                className="border-r border-border/20 flex-shrink-0 text-[10px] text-muted-foreground flex items-center px-2"
                style={{ width: hourWidth }}
              >
                {h.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        <div className="flex flex-col min-h-full">
          {visibleCampaigns.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12 gap-2">
              <Layers className="h-10 w-10 opacity-10" />
              <p>Nenhuma campanha para este dia.</p>
            </div>
          ) : (
            visibleCampaigns.map(c => {
              // Calculate position and width
              const [startH, startM] = c.start_time.split(':').map(Number);
              const [endH, endM] = c.end_time.split(':').map(Number);
              
              const startOffset = (startH * 60 + startM) * (hourWidth / 60);
              const duration = ((endH * 60 + endM) - (startH * 60 + startM)) * (hourWidth / 60);

              return (
                <div key={c.id} className="flex border-b border-border/20 group hover:bg-muted/5">
                  <div className="w-32 flex-shrink-0 border-r border-border/40 p-3 bg-muted/5 truncate font-medium text-xs">
                    {c.name}
                  </div>
                  <div className="flex-1 relative h-16" style={{ width: 24 * hourWidth }}>
                    {/* Background grid lines */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {hours.map(h => (
                        <div key={h} className="border-r border-border/10 flex-shrink-0" style={{ width: hourWidth }} />
                      ))}
                    </div>
                    
                    {/* Campaign Block */}
                    <div
                      className="absolute top-2 bottom-2 rounded-lg border-2 shadow-sm transition-all cursor-pointer hover:scale-[1.01] hover:shadow-md flex flex-col justify-center px-3"
                      style={{
                        left: startOffset,
                        width: Math.max(20, duration),
                        backgroundColor: `${c.color}20`,
                        borderColor: c.color,
                        color: c.color
                      }}
                      onClick={() => onSelectCampaign(c.id)}
                    >
                      <div className="text-[10px] font-bold truncate">{c.name}</div>
                      <div className="text-[8px] opacity-70 flex items-center gap-1">
                        <Clock className="h-2 w-2" />
                        {c.start_time.substring(0, 5)} - {c.end_time.substring(0, 5)}
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
