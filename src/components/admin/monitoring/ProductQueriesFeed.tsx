import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Store, 
  Monitor, 
  TrendingUp,
  BarChart3,
  List
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ProductQuery {
  id: number;
  device_id: string;
  apelido: string;
  ean: string;
  descricao_produto: string;
  loja: string;
  status_code: number;
  created_at: string;
}

interface ProductQueriesFeedProps {
  storeId?: string;
  storeCode?: string;
  tenantId?: string | null;
  isSuperAdmin?: boolean;
}

export function ProductQueriesFeed({ storeId, storeCode, tenantId, isSuperAdmin }: ProductQueriesFeedProps) {
  const [queries, setQueries] = useState<ProductQuery[]>([]);
  const [viewMode, setViewMode] = useState<'feed' | 'summary'>('feed');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    errors: 0,
    topProducts: [] as { name: string, count: number }[],
    activeDevices: [] as { name: string, count: number }[]
  });

  useEffect(() => {
    fetchInitialQueries();

    const channel = supabase
      .channel('product_queries_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'product_queries_log'
        },
        (payload) => {
          const newQuery = payload.new as ProductQuery;
          
          // Apply filtering if necessary
          if (storeCode && newQuery.loja !== storeCode) return;
          
          setQueries(prev => {
            const updated = [newQuery, ...prev].slice(0, 50);
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeCode]);

  useEffect(() => {
    if (viewMode === 'summary') {
      calculateStats();
    }
  }, [viewMode, queries]);

  async function fetchInitialQueries() {
    setLoading(true);
    let query = supabase
      .from("product_queries_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (storeCode) {
      query = query.eq("loja", storeCode);
    }

    const { data } = await query;
    if (data) {
      setQueries(data);
    }
    setLoading(false);
  }

  function calculateStats() {
    const total = queries.length;
    const success = queries.filter(q => q.status_code === 200).length;
    const errors = total - success;

    const productMap = new Map<string, number>();
    const deviceMap = new Map<string, number>();

    queries.forEach(q => {
      productMap.set(q.descricao_produto || 'Desconhecido', (productMap.get(q.descricao_produto || 'Desconhecido') || 0) + 1);
      deviceMap.set(q.apelido || q.device_id || 'Desconhecido', (deviceMap.get(q.apelido || q.device_id || 'Desconhecido') || 0) + 1);
    });

    const topProducts = Array.from(productMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const activeDevices = Array.from(deviceMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setStats({ total, success, errors, topProducts, activeDevices });
  }

  if (loading && queries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex gap-1">
          <Button 
            variant={viewMode === 'feed' ? 'secondary' : 'ghost'} 
            size="sm" 
            className="h-7 px-2 text-[10px] font-bold uppercase"
            onClick={() => setViewMode('feed')}
          >
            <List className="h-3 w-3 mr-1" />
            Feed
          </Button>
          <Button 
            variant={viewMode === 'summary' ? 'secondary' : 'ghost'} 
            size="sm" 
            className="h-7 px-2 text-[10px] font-bold uppercase"
            onClick={() => setViewMode('summary')}
          >
            <BarChart3 className="h-3 w-3 mr-1" />
            Resumo
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[9px] font-bold bg-green-500/10 text-green-500 border-green-500/20">
            {queries.filter(q => q.status_code === 200).length} OK
          </Badge>
          <Badge variant="outline" className="text-[9px] font-bold bg-destructive/10 text-destructive border-destructive/20">
            {queries.filter(q => q.status_code !== 200).length} ERRO
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {viewMode === 'feed' ? (
          <div className="space-y-1.5 p-1">
            {queries.map((query) => (
              <div 
                key={query.id} 
                className={cn(
                  "group relative flex flex-col gap-1 p-2 rounded border bg-background/20 transition-all duration-300 animate-in fade-in slide-in-from-top-2",
                  query.status_code !== 200 ? "border-destructive/30 bg-destructive/5" : "border-border/40"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-0.5 max-w-[70%]">
                    <span className="font-bold text-[11px] leading-tight line-clamp-1 uppercase">
                      {query.descricao_produto || 'Produto não identificado'}
                    </span>
                    <span className="text-[9px] opacity-60 font-mono tracking-tight">
                      {query.ean}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {query.status_code === 200 ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-destructive animate-pulse" />
                    )}
                    <span className="text-[9px] opacity-40 flex items-center gap-1 font-bold whitespace-nowrap">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDistanceToNow(new Date(query.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1 border-t border-border/10 mt-1">
                  <div className="flex items-center gap-1 text-[9px] font-bold opacity-60 uppercase truncate">
                    <Monitor className="h-2.5 w-2.5" />
                    {query.apelido || query.device_id.substring(0, 8)}
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-bold opacity-60 uppercase">
                    <Store className="h-2.5 w-2.5" />
                    Loja {query.loja}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4 p-2">
            <div className="grid grid-cols-1 gap-2">
              <div className="p-3 rounded-lg border bg-background/20 space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase opacity-60">
                  <TrendingUp className="h-3 w-3" />
                  Produtos mais buscados
                </div>
                <div className="space-y-1.5">
                  {stats.topProducts.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px]">
                      <span className="truncate max-w-[180px] opacity-80">{p.name}</span>
                      <Badge variant="secondary" className="h-4 px-1 text-[9px]">{p.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg border bg-background/20 space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase opacity-60">
                  <Monitor className="h-3 w-3" />
                  Dispositivos Ativos
                </div>
                <div className="space-y-1.5">
                  {stats.activeDevices.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px]">
                      <span className="truncate opacity-80">{d.name}</span>
                      <Badge variant="secondary" className="h-4 px-1 text-[9px]">{d.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
