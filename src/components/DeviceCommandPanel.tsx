import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  fetchRecentCommands,
  fetchRecentExecutionLogs,
  issueDeviceCommand,
  subscribeToCommandUpdates,
  subscribeToExecutionLogs,
  type DeviceCommand,
  type DeviceCommandKind,
  type DeviceExecutionLog,
} from "@/lib/device-commands";
import { toast } from "sonner";
import { Loader2, Send, Activity, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  deviceId: string;
  deviceName?: string;
}

const COMMANDS: { value: DeviceCommandKind; label: string }[] = [
  { value: "reload_playlist", label: "Recarregar playlist" },
  { value: "play_campaign",   label: "Iniciar campanha" },
  { value: "set_volume",      label: "Ajustar volume" },
  { value: "screenshot",      label: "Capturar tela" },
  { value: "clear_cache",     label: "Limpar cache" },
  { value: "reboot",          label: "Reiniciar player" },
  { value: "ping",            label: "Ping" },
];

export function DeviceCommandPanel({ deviceId, deviceName }: Props) {
  const [command, setCommand] = useState<DeviceCommandKind>("reload_playlist");
  const [campaignId, setCampaignId] = useState("");
  const [volume, setVolume] = useState(60);
  const [sending, setSending] = useState(false);
  const [commands, setCommands] = useState<DeviceCommand[]>([]);
  const [logs, setLogs] = useState<DeviceExecutionLog[]>([]);

  useEffect(() => {
    fetchRecentCommands(deviceId, 20).then(setCommands).catch(() => {});
    fetchRecentExecutionLogs(deviceId, 20).then(setLogs).catch(() => {});

    const offUpd = subscribeToCommandUpdates((c) => {
      if (c.device_id !== deviceId) return;
      setCommands((prev) => prev.map((p) => (p.id === c.id ? c : p)));
    });
    const offLog = subscribeToExecutionLogs((l) => {
      if (l.device_id !== deviceId) return;
      setLogs((prev) => [l, ...prev].slice(0, 50));
    });
    return () => { offUpd(); offLog(); };
  }, [deviceId]);

  const send = async () => {
    setSending(true);
    try {
      const payload: Record<string, unknown> = {};
      if (command === "play_campaign") {
        if (!campaignId) throw new Error("Informe a campanha");
        payload.campaign_id = campaignId;
      }
      if (command === "set_volume") payload.volume = volume;

      const c = await issueDeviceCommand(deviceId, command, payload);
      setCommands((prev) => [c, ...prev]);
      toast.success("Comando enviado", { description: COMMANDS.find(x => x.value === command)?.label });
    } catch (e) {
      toast.error("Falha ao enviar", { description: e instanceof Error ? e.message : "Erro" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            Enviar comando {deviceName ? `· ${deviceName}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Comando</Label>
            <Select value={command} onValueChange={(v) => setCommand(v as DeviceCommandKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMMANDS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {command === "play_campaign" && (
            <div>
              <Label>ID da campanha</Label>
              <Input
                placeholder="UUID da campanha"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
              />
            </div>
          )}

          {command === "set_volume" && (
            <div>
              <Label>Volume: <span className="font-mono text-primary">{volume}%</span></Label>
              <Slider
                value={[volume]}
                onValueChange={([v]) => setVolume(v)}
                min={0} max={100} step={5}
                className="mt-2"
              />
            </div>
          )}

          <Button
            onClick={send}
            disabled={sending}
            className="w-full bg-gradient-primary text-primary-foreground shadow-glow"
          >
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar via Realtime
          </Button>

          <div className="border-t border-border pt-3">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Comandos recentes</h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {commands.length === 0 && <p className="text-xs text-muted-foreground">Nenhum comando ainda.</p>}
              {commands.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-xs gap-2">
                  <span className="font-mono truncate">{c.command}</span>
                  <StatusPill status={c.status} />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Logs de execução (ao vivo)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {logs.length === 0 && (
              <p className="text-sm text-muted-foreground">Aguardando execuções do dispositivo…</p>
            )}
            {logs.map((l) => (
              <div key={l.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/40 border border-border">
                {l.result === "success"
                  ? <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  : <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs">{l.command}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  {l.message && <p className="text-xs text-muted-foreground truncate">{l.message}</p>}
                  {l.duration_ms != null && (
                    <p className="text-[10px] text-muted-foreground font-mono">{l.duration_ms} ms</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusPill({ status }: { status: DeviceCommand["status"] }) {
  const map: Record<DeviceCommand["status"], string> = {
    pending:   "bg-muted text-muted-foreground",
    delivered: "bg-primary/10 text-primary",
    ack:       "bg-primary/15 text-primary",
    done:      "bg-success/15 text-success",
    error:     "bg-destructive/15 text-destructive",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${map[status]}`}>{status}</span>;
}
