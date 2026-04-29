import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, Plus, Loader2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";

export default function DevicesPage() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  const { data: devices, isLoading, refetch } = useQuery({
    queryKey: ["dispositivos-stock-center"],
    queryFn: async () => {
      // First, get user's company or a default one for this demo
      // In a real scenario, we'd use the user's tenant/company
      const stockCenterId = "1728965891007x215886838679286700";
      
      const { data, error } = await supabase
        .from("dispositivos")
        .select("*")
        .eq("empresa", stockCenterId)
        .order("apelido_interno");
      
      if (error) throw error;
      return data;
    },
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <>
      <PageHeader
        title="Dispositivos - Stock Center"
        description="Monitoramento em tempo real dos terminais da rede Stock Center."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
              <Plus className="h-4 w-4 mr-1" /> Novo dispositivo
            </Button>
          </div>
        }
      />

      <Card className="overflow-hidden border-border/60 shadow-elegant">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando dispositivos...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Apelido Interno</TableHead>
                  <TableHead>Serial / Pin</TableHead>
                  <TableHead>Licença</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Última Sinc.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices && devices.length > 0 ? (
                  devices.map((d) => (
                    <TableRow key={d.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-[10px] text-muted-foreground">{d.id}</TableCell>
                      <TableCell className="font-semibold">{d.apelido_interno || "Sem nome"}</TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <span className="text-muted-foreground">SN:</span> {d.serial || "-"}
                        </div>
                        <div className="text-xs">
                          <span className="text-muted-foreground">PIN:</span> {d.pin || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] uppercase font-bold">
                          {d.tipo_da_licenca || d.type || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Store className="h-3 w-3 text-primary" />
                          <span className="text-sm font-medium">Loja {d.num_filial || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(d.atualizado)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={d.online ? "online" : "offline"} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <Link to={`/dispositivos/${d.id}`} title="Detalhes">
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="outline" className="h-8">
                            <Link to={`/play/${d.serial}`} target="_blank">
                              Player
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      Nenhum dispositivo encontrado para esta empresa.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </>
  );
}

// Simple Badge component since it might not be imported or available exactly as expected
function Badge({ children, variant, className }: { children: React.ReactNode, variant?: string, className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
      variant === 'secondary' ? 'bg-secondary/20 text-secondary-foreground ring-secondary/30' : 'bg-primary/10 text-primary ring-primary/20'
    } ${className}`}>
      {children}
    </span>
  );
}

function Store({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
      <path d="M2 7h20" />
      <path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 10V7" />
    </svg>
  );
}
