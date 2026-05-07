import { useState } from "react";
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, AlertTriangle, Clock, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Campaign {
  id: string;
  name: string;
  color: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  priority: number;
  is_active: boolean;
}

interface CampaignCalendarProps {
  campaigns: Campaign[];
  onSelectCampaign: (id: string) => void;
}

export function CampaignCalendar({ campaigns, onSelectCampaign }: CampaignCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-xl font-bold capitalize bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-9 px-4 font-bold" onClick={() => setCurrentMonth(new Date())}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const date = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="text-center font-bold text-[10px] text-muted-foreground/60 uppercase py-3 tracking-widest bg-muted/20">
          {date[i]}
        </div>
      );
    }
    return <div className="grid grid-cols-7 border-b border-border/40">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;
        
        // Find campaigns for this day
        const dayCampaigns = campaigns.filter(c => {
          const start = new Date(c.start_date);
          const end = new Date(c.end_date);
          const d = new Date(cloneDay);
          d.setHours(0,0,0,0);
          start.setHours(0,0,0,0);
          end.setHours(0,0,0,0);
          return d >= start && d <= end;
        });

        const hasConflict = dayCampaigns.length > 2;

        days.push(
          <div
            key={day.toString()}
            className={cn(
              "min-h-[140px] p-3 border-r border-b border-border/40 transition-all duration-300",
              !isSameMonth(day, monthStart) ? "bg-muted/5 opacity-40" : "bg-card hover:bg-muted/10",
              isSameDay(day, new Date()) && "bg-primary/5 ring-1 ring-inset ring-primary/20"
            )}
          >
            <div className="flex justify-between items-center mb-2">
              <span className={cn(
                "text-xs font-bold tracking-tight",
                !isSameMonth(day, monthStart) ? "text-muted-foreground/40" : "text-muted-foreground",
                isSameDay(day, new Date()) && "bg-primary text-primary-foreground h-6 w-6 flex items-center justify-center rounded-lg shadow-glow-sm scale-110"
              )}>
                {formattedDate}
              </span>
              {hasConflict && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="bg-amber-500/10 p-1 rounded">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-bold text-[10px]">ALTA DENSIDADE</p>
                      <p className="text-[10px]">Múltiplas campanhas agendadas.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="space-y-1.5 overflow-hidden">
              {dayCampaigns.slice(0, 4).map(c => (
                <div
                  key={c.id}
                  onClick={() => onSelectCampaign(c.id)}
                  className="text-[10px] p-1.5 rounded-lg border-l-4 shadow-sm hover:scale-[1.02] cursor-pointer truncate font-black uppercase tracking-tight transition-all"
                  style={{ 
                    backgroundColor: `${c.color}15`, 
                    color: c.color, 
                    borderLeftColor: c.color,
                    borderRight: `1px solid ${c.color}30`,
                    borderTop: `1px solid ${c.color}30`,
                    borderBottom: `1px solid ${c.color}30`
                  }}
                >
                  {c.name}
                </div>
              ))}
              {dayCampaigns.length > 4 && (
                <div className="text-[9px] text-center font-bold text-muted-foreground bg-muted/30 py-0.5 rounded-full">
                  + {dayCampaigns.length - 4} mais
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="flex-1 overflow-y-auto custom-scrollbar">{rows}</div>;
  };

  return (
    <div className="flex flex-col h-full">
      {renderHeader()}
      <div className="border border-border/60 rounded-2xl overflow-hidden shadow-sm flex flex-col flex-1 bg-card/50 backdrop-blur-sm">
        {renderDays()}
        {renderCells()}
      </div>
    </div>
  );
}
