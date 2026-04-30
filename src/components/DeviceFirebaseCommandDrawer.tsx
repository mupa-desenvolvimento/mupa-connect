import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Loader2,
  Send,
  Rocket,
  Search,
  Globe,
  Trash2,
  RotateCcw,
  XCircle,
  Monitor,
  Store,
  Hash,
  Activity,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DeviceStatus = "online" | "unstable" | "offline";

interface DeviceLike {
  id: string | number;
  serial?: string | null;
  apelido_interno?: string | null;
  num_filial?: string | null;
  grupo_dispositivos?: string | null;
  last_heartbeat_at?: string | null;
  last_proof_at?: string | null;
}

interface Props {
  device: DeviceLike | null;
  status: DeviceStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formatDate: (d: string | null | undefined) => string;
}

const FIREBASE_BASE =
  "https://comandos-1621d-default-rtdb.firebaseio.com";

type CommandKey =
  | "abrir_app"
  | "consulta_ean"
  | "config_ip"
  | "deletar_imagem"
  | "resetar"
  | "fechar";

interface CommandConfig {
  key: CommandKey;
  comando: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  field?: "package" | "codbar" | "ip";
  placeholder?: string;
  accent: string;
}

const COMMANDS: CommandConfig[] = [
  {
    key: "abrir_app",
    comando: "abrir_app",
    label: "Abrir Aplicativo",
    description: "Abre um app instalado no dispositivo",
    icon: Rocket,
    field: "package",
    placeholder: "com.android.settings",
    accent: "text-primary",
  },
  {
    key: "consulta_ean",
    comando: "consulta_ean",
    label: "Consulta Produto (EAN)",
    description: "Consulta produto por código de barras",
    icon: Search,
    field: "codbar",
    placeholder: "7894650014202",
    accent: "text-primary",
  },
  {
    key: "config_ip",
    comando: "config_ip",
    label: "Configurar IP do Servidor",
    description: "Define o IP/URL do servidor",
    icon: Globe,
    field: "ip",
    placeholder: "192.168.0.10 ou https://servidor.com",
    accent: "text-primary",
  },
  {
    key: "deletar_imagem",
    comando: "deletar_imagem",
    label: "Deletar Imagem",
    description: "Remove imagem pelo nome (código de barras)",
    icon: Trash2,
    field: "codbar",
    placeholder: "7894650014202",
    accent: "text-destructive",
  },
  {
    key: "resetar",
    comando: "resetar_app",
    label: "Resetar Aplicação",
    description: "Reinicia o aplicativo no dispositivo",
    icon: RotateCcw,
    accent: "text-warning",
  },
  {
    key: "fechar",
    comando: "fechar_app",
    label: "Fechar Aplicação",
    description: "Encerra o aplicativo no dispositivo",
    icon: XCircle,
    accent: "text-destructive",
  },
];

export function DeviceFirebaseCommandDrawer({
  device,
  status,
  open,
  onOpenChange,
  formatDate,
}: Props) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<CommandKey | null>(null);

  const setInput = (key: CommandKey, value: string) =>
    setInputs((prev) => ({ ...prev, [key]: value }));

  const send = async (cfg: CommandConfig) => {
    if (!device?.serial) {
      toast.error("Dispositivo sem serial — não é possível enviar comando.");
      return;
    }

    let value = "";
    if (cfg.field) {
      value = (inputs[cfg.key] ?? "").trim();
      if (!value) {
        toast.error("Informe o valor antes de enviar.");
        return;
      }
    }

    const payload: Record<string, string> = {
      comando: cfg.comando,
      id_grupo: device.grupo_dispositivos ?? "",
      codbar: cfg.field === "codbar" ? value : "",
      package: cfg.field === "package" ? value : "",
      ip: cfg.field === "ip" ? value : "",
      time: new Date().toISOString(),
    };

    setSending(cfg.key);
    try {
      const res = await fetch(
        `${FIREBASE_BASE}/${encodeURIComponent(device.serial)}.json`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      toast.success(`${cfg.label} enviado`, {
        description: `Serial ${device.serial}`,
      });
      if (cfg.field) setInput(cfg.key, "");
    } catch (e) {
      toast.error("Falha ao enviar comando", {
        description: e instanceof Error ? e.message : "Erro desconhecido",
      });
    } finally {
      setSending(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col"
      >
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
                <Monitor className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="font-display text-lg truncate">
                  {device?.apelido_interno || "Dispositivo"}
                </SheetTitle>
                <SheetDescription className="text-xs">
                  Painel de controle remoto
                </SheetDescription>
              </div>
            </div>
            <StatusBadge status={status} />
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* DETALHES */}
            <section className="space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Detalhes
              </h3>
              <div className="grid grid-cols-1 gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
                <DetailRow
                  icon={Hash}
                  label="Serial"
                  value={device?.serial || "—"}
                  mono
                />
                <DetailRow
                  icon={Store}
                  label="Loja"
                  value={device?.num_filial ? `Loja ${device.num_filial}` : "—"}
                />
                <DetailRow
                  icon={Layers}
                  label="Grupo"
                  value={device?.grupo_dispositivos || "—"}
                />
                <DetailRow
                  icon={Activity}
                  label="Última atividade"
                  value={formatDate(device?.last_heartbeat_at)}
                />
              </div>
            </section>

            <Separator />

            {/* COMANDOS */}
            <section className="space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Comandos
              </h3>
              <div className="space-y-3">
                {COMMANDS.map((cfg) => {
                  const Icon = cfg.icon;
                  const isSending = sending === cfg.key;
                  const value = inputs[cfg.key] ?? "";
                  return (
                    <div
                      key={cfg.key}
                      className="rounded-lg border bg-card p-3 space-y-2.5 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-md bg-muted shrink-0">
                          <Icon className={cn("h-4 w-4", cfg.accent)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-tight">
                            {cfg.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {cfg.description}
                          </p>
                        </div>
                      </div>

                      {cfg.field && (
                        <div>
                          <Label className="sr-only">{cfg.label}</Label>
                          <Input
                            placeholder={cfg.placeholder}
                            value={value}
                            onChange={(e) => setInput(cfg.key, e.target.value)}
                            className="h-9 text-sm"
                            disabled={isSending}
                          />
                        </div>
                      )}

                      <Button
                        size="sm"
                        onClick={() => send(cfg)}
                        disabled={isSending || !device?.serial}
                        className="w-full h-9"
                        variant={
                          cfg.key === "fechar" || cfg.key === "deletar_imagem"
                            ? "destructive"
                            : "default"
                        }
                      >
                        {isSending ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                            Enviando…
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5 mr-2" />
                            Enviar
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <span
        className={cn(
          "text-sm text-right truncate max-w-[60%]",
          mono && "font-mono text-xs"
        )}
      >
        {value}
      </span>
    </div>
  );
}
