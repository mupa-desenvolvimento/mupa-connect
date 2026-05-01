import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Monitor, 
  XCircle, 
  RotateCcw, 
  Search, 
  Rocket, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  ExternalLink 
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";

type DeviceStatus = "online" | "unstable" | "offline";

export default function QuickAccessPage() {
  const { token } = useParams<{ token: string }>();
  const [tokenData, setTokenData] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingCommand, setSendingCommand] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!token) return;

      try {
        const { data: tData, error: tError } = await supabase
          .from("quick_access_tokens")
          .select("*")
          .eq("token", token)
          .maybeSingle();

        if (tError || !tData) {
          setError("Acesso inválido ou expirado.");
          return;
        }

        setTokenData(tData);

        let query = supabase.from("dispositivos").select("*");
        
        if (tData.device_id) {
          query = query.eq("id", tData.device_id);
        } else if (tData.store_id) {
          query = query.eq("store_id", tData.store_id);
        }

        const { data: dData, error: dError } = await query;
        if (dError) throw dError;
        setDevices(dData || []);

      } catch (err) {
        console.error("Error fetching quick access data:", err);
        setError("Erro ao carregar dispositivos.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [token]);

  const getDeviceStatus = (lastHeartbeat: string | null, lastProof: string | null): DeviceStatus => {
    if (!lastHeartbeat) return "offline";
    const now = new Date().getTime();
    const heartbeatTime = new Date(lastHeartbeat).getTime();
    // Aumentado para 5 minutos para ser mais tolerante a variações de conexão
    const isHeartbeatRecent = (now - heartbeatTime) < 300000;
    return isHeartbeatRecent ? "online" : "offline";
  };

  const sendQuickCommand = async (device: any, command: string, label: string, codbar?: string) => {
    if (!device.serial) {
      toast.error("Dispositivo sem serial.");
      return;
    }

    const commandId = `${device.id}-${command}`;
    setSendingCommand(commandId);

    try {
      const timestamp = Date.now();
      const payload = {
        comando: command,
        codbar: codbar || "",
        id_grupo: device.grupo_dispositivos || "",
        time: `${timestamp}_${device.serial}`,
      };

      const res = await fetch(
        `https://comandos-1621d-default-rtdb.firebaseio.com/${encodeURIComponent(device.serial)}.json`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error("Erro no envio");

      // Log do comando
      await supabase.from("quick_access_logs").insert({
        token_id: tokenData.id,
        device_id: device.id,
        command: label,
        payload: payload
      });

      toast.success(`${label} enviado com sucesso!`);
    } catch (err) {
      toast.error(`Falha ao enviar ${label}`);
    } finally {
      setSendingCommand(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-xl font-bold mb-2">Acesso Restrito</h1>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="bg-white border-b px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <img 
            src="/logo.svg" 
            alt="MupaMídias" 
            className="h-10 w-auto"
          />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Acesso Rápido</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {devices.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Nenhum dispositivo encontrado para esta loja.
          </div>
        ) : (
          devices.map((device) => {
            const status = getDeviceStatus(device.last_heartbeat_at, device.last_proof_at);
            return (
              <Card key={device.id} className="overflow-hidden border-none shadow-md">
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{device.apelido_interno || "Dispositivo"}</CardTitle>
                      <CardDescription className="text-xs font-mono">{device.serial}</CardDescription>
                    </div>
                    <StatusBadge status={status} />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-4">
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <QuickButton
                      icon={ExternalLink}
                      label="Abrir Player"
                      variant="primary"
                      onClick={() => window.open(`${window.location.origin}/play/${device.serial}`, "_blank")}
                    />
                    <QuickButton
                      icon={XCircle}
                      label="Fechar App"
                      variant="destructive"
                      loading={sendingCommand === `${device.id}-consulta_ean-040816`}
                      onClick={() => sendQuickCommand(device, "consulta_ean", "Fechar App", "040816")}
                    />
                    <QuickButton
                      icon={RotateCcw}
                      label="Restaurar App"
                      variant="warning"
                      loading={sendingCommand === `${device.id}-consulta_ean-050223`}
                      onClick={() => sendQuickCommand(device, "consulta_ean", "Restaurar App", "050223")}
                    />
                    <QuickButton
                      icon={Search}
                      label="Consultar EAN"
                      variant="primary"
                      loading={sendingCommand === `${device.id}-consulta_ean`}
                      onClick={() => {
                        const code = window.prompt("Digite o código EAN:");
                        if (code) sendQuickCommand(device, "consulta_ean", "Consulta EAN", code);
                      }}
                    />
                    <QuickButton
                      icon={Rocket}
                      label="Abrir App"
                      variant="primary"
                      loading={sendingCommand === `${device.id}-abrir_app`}
                      onClick={() => {
                        const pkg = window.prompt("Digite o package (ex: com.android.settings):");
                        if (pkg) sendQuickCommand(device, "abrir_app", "Abrir App", pkg);
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </main>
    </div>
  );
}

function QuickButton({ 
  icon: Icon, 
  label, 
  onClick, 
  variant = "primary", 
  loading = false 
}: { 
  icon: any; 
  label: string; 
  onClick: () => void; 
  variant?: "primary" | "destructive" | "warning";
  loading?: boolean;
}) {
  const variants = {
    primary: "bg-blue-600 active:bg-blue-700 text-white shadow-blue-200",
    destructive: "bg-red-600 active:bg-red-700 text-white shadow-red-200",
    warning: "bg-amber-500 active:bg-amber-600 text-white shadow-amber-200",
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all active:scale-95 shadow-lg h-24",
        variants[variant],
        loading && "opacity-80 scale-95"
      )}
    >
      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : (
        <Icon className="h-6 w-6" />
      )}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}
