import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, WifiOff, Monitor, RefreshCw, AlertCircle, Heart } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

interface Event {
  id: string;
  created_at: string;
  event_type: string;
  payload: any;
  serial: string;
  dispositivo_id?: number;
}

export function EventsFeed({ tenantId }: { tenantId?: string }) {
  const [events, setEvents] = useState<Event[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchEvents();

    const channel = supabase
      .channel("device_events")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "device_logs" },
        (payload) => {
          const newEvent = payload.new as Event;
          setEvents((prev) => [newEvent, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  async function fetchEvents() {
    let query = supabase
      .from("device_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    const { data } = await query;
    if (data) setEvents(data);
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case "heartbeat": return <Heart className="h-3 w-3 text-red-500 fill-red-500/20" />;
      case "offline": return <WifiOff className="h-3 w-3 text-red-600" />;
      case "online": return <Activity className="h-3 w-3 text-green-500" />;
      case "playlist_change": return <RefreshCw className="h-3 w-3 text-blue-500" />;
      case "media_error": return <AlertCircle className="h-3 w-3 text-orange-500" />;
      case "proof": return <Monitor className="h-3 w-3 text-purple-500" />;
      default: return <Activity className="h-3 w-3 text-primary" />;
    }
  };

  const getEventDescription = (event: Event) => {
    const payload = event.payload || {};
    switch (event.event_type) {
      case "heartbeat": return `Heartbeat received from ${event.serial}`;
      case "proof": return `Playing: ${payload.media_name || 'Media'}`;
      case "playlist_change": return `Playlist updated to ${payload.playlist_name}`;
      case "media_error": return `Error playing ${payload.media_name}: ${payload.error}`;
      default: return `${event.event_type} on ${event.serial}`;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] border-l border-white/5">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest text-white/60">
          Eventos em Tempo Real
        </h3>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">LIVE</span>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <AnimatePresence initial={false}>
            {events.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-3 group"
              >
                <div className="flex flex-col items-center">
                  <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    {getEventIcon(event.event_type)}
                  </div>
                  <div className="w-px flex-1 bg-white/5 my-1" />
                </div>
                
                <div className="flex flex-col flex-1 min-w-0 pb-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase text-white/40 tracking-wider truncate">
                      {event.serial}
                    </span>
                    <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest shrink-0">
                      {format(new Date(event.created_at), "HH:mm:ss", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-white/70 leading-relaxed mt-0.5 line-clamp-2">
                    {getEventDescription(event)}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {events.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 opacity-20">
              <Activity className="h-10 w-10 mb-2" />
              <span className="text-[10px] font-black uppercase tracking-widest">Aguardando eventos...</span>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
