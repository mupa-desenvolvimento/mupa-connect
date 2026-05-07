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
        <h2 className="text-xl font-bold capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
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
        <div key={i} className="text-center font-bold text-xs text-muted-foreground uppercase py-2">
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
          // Zero out time for comparison
          const d = new Date(cloneDay);
          d.setHours(0,0,0,0);
          start.setHours(0,0,0,0);
          end.setHours(0,0,0,0);
          return d >= start && d <= end;
        });

        // Detect conflicts (overlapping campaigns)
        const hasConflict = dayCampaigns.length > 1;

        days.push(
          <div
            key={day.toString()}
            className={cn(
              "min-h-[120px] p-2 border-r border-b border-border/40 transition-colors",
              !isSameMonth(day, monthStart) ? "bg-muted/20" : "bg-card hover:bg-muted/10",
              isSameDay(day, new Date()) && "bg-primary/5"
            )}
          >
            <div className="flex justify-between items-start mb-1">
              <span className={cn(
                "text-sm font-medium",
                !isSameMonth(day, monthStart) ? "text-muted-foreground/50" : "text-foreground",
                isSameDay(day, new Date()) && "bg-primary text-primary-foreground h-6 w-6 flex items-center justify-center rounded-full"
              )}>
                {formattedDate}
              </span>
              {hasConflict && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Múltiplas campanhas agendadas para este dia.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="space-y-1 overflow-y-auto max-h-[80px] scrollbar-none">
              {dayCampaigns.map(c => (
                <div
                  key={c.id}
                  onClick={() => onSelectCampaign(c.id)}
                  className="text-[10px] p-1 rounded border border-transparent hover:border-foreground/20 cursor-pointer truncate font-medium transition-all"
                  style={{ backgroundColor: `${c.color}20`, color: c.color, borderLeftColor: c.color, borderLeftWidth: '3px' }}
                >
                  {c.name}
                </div>
              ))}
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
    return <div className="flex-1 overflow-y-auto">{rows}</div>;
  };

  return (
    <div className="flex flex-col h-full">
      {renderHeader()}
      <div className="border border-border/60 rounded-xl overflow-hidden shadow-sm flex flex-col flex-1">
        {renderDays()}
        {renderCells()}
      </div>
    </div>
  );
}
