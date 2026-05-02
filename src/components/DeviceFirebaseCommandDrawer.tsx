import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
  Wrench,
  Save,
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
  is_maintenance?: boolean;
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
  /** Quando definido, envia esse codbar fixo sem solicitar input do usuário */
  fixedCodbar?: string;
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
    comando: "consulta_ean",
    fixedCodbar: "050223",
    label: "Restaurar App",
    description: "Restaura o aplicativo no dispositivo",
    icon: RotateCcw,
    accent: "text-warning",
  },
  {
    key: "fechar",
    comando: "consulta_ean",
    fixedCodbar: "040816",
    label: "Fechar App",
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
  
  // States for device editing
  const [deviceName, setDeviceName] = useState("");
  const [numFilial, setNumFilial] = useState("");
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (device) {
      setDeviceName(device.apelido_interno || "");
      setNumFilial(device.num_filial || "");
      setIsMaintenance(!!device.is_maintenance);
    }
  }, [device]);

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

    const codbarValue = cfg.fixedCodbar ?? (cfg.field === "codbar" ? value : "");
    const payload: Record<string, string> = {
      comando: cfg.comando,
      id_grupo: device.grupo_dispositivos ?? "",
      codbar: codbarValue,
      package: cfg.field === "package" ? value : "",
      ip: cfg.field === "ip" ? value : "",
      time: `${Date.now()}`,
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

  const handleUpdateDevice = async () => {
    if (!device?.id) return;
    
    setSaving(true);
    const { error } = await supabase
      .from("dispositivos")
      .update({ 
        apelido_interno: deviceName,
        num_filial: numFilial,
        is_maintenance: isMaintenance
      })
      .eq("id", Number(device.id));

    if (error) {
      toast.error("Erro ao atualizar o dispositivo");
      console.error(error);
    } else {
      toast.success("Dispositivo atualizado com sucesso");
    }
    setSaving(false);
  };

  const toggleMaintenance = async (checked: boolean) => {
    if (!device?.id) return;
    
    setIsMaintenance(checked);
    const { error } = await supabase
      .from("dispositivos")
      .update({ is_maintenance: checked })
      .eq("id", Number(device.id));

    if (error) {
      toast.error("Erro ao atualizar modo manutenção");
      setIsMaintenance(!checked);
      console.error(error);
    } else {
      toast.success(checked ? "Modo manutenção ativado" : "Modo manutenção desativado");
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
                  {deviceName || "Dispositivo"}
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
            {isMaintenance && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500 rounded-lg overflow-hidden border border-yellow-500/50 bg-yellow-500/5">
                <img 
                  src="https://pub-0e15cc358ba84ff2a24226b12278433b.r2.dev/Banner%20Manutenc%CC%A7a%CC%83o.jpg" 
                  alt="Banner Manutenção" 
                  className="w-full h-auto object-cover max-h-[150px]"
                />
                <div className="p-3 flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                  <Wrench className="h-4 w-4 animate-pulse" />
                  <p className="text-xs font-medium">Em modo de manutenção.</p>
                </div>
              </div>
            )}

            {/* EDIÇÃO RÁPIDA */}
            <section className="space-y-4">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Configurações
              </h3>
              <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                <div className="space-y-2">
                  <Label htmlFor="drawer_device_name" className="text-xs">Nome do Dispositivo</Label>
                  <Input
                    id="drawer_device_name"
                    placeholder="Ex: Terminal 01"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="drawer_num_filial" className="text-xs">Número da Filial / Loja</Label>
                  <Input
                    id="drawer_num_filial"
                    placeholder="Ex: 001"
                    value={numFilial}
                    onChange={(e) => setNumFilial(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="flex items-center justify-between py-2 border-t mt-2">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium flex items-center gap-2">
                      <Wrench className="h-3 w-3" /> Modo Manutenção
                    </Label>
                  </div>
                  <Switch 
                    checked={isMaintenance}
                    onCheckedChange={toggleMaintenance}
                  />
                </div>

                <Button 
                  className="w-full h-9 text-xs"
                  onClick={handleUpdateDevice} 
                  disabled={saving || (deviceName === device?.apelido_interno && numFilial === device?.num_filial && isMaintenance === !!device?.is_maintenance)}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar Alterações
                </Button>
              </div>
            </section>

            <Separator />

            {/* DETALHES TÉCNICOS */}
            <section className="space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Informações Técnicas
              </h3>
              <div className="grid grid-cols-1 gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
                <DetailRow
                  icon={Hash}
                  label="Serial"
                  value={device?.serial || "—"}
                  mono
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
                Comandos de Diagnóstico
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
