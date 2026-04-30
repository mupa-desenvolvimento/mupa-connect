import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Store,
  Layers,
  Users,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FIREBASE_BASE = "https://comandos-1621d-default-rtdb.firebaseio.com";

export interface BulkDevice {
  id: string | number;
  serial?: string | null;
  apelido_interno?: string | null;
  num_filial?: string | null;
  grupo_dispositivos?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devices: BulkDevice[];
  stores: { code: string; name: string }[];
  groups: string[];
}

type CommandKey =
  | "abrir_app"
  | "consulta_ean"
  | "ip_server"
  | "img_delete"
  | "reset_app"
  | "fecha_app";

interface CommandConfig {
  key: CommandKey;
  comando: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  field?: "package" | "codbar" | "ip";
  placeholder?: string;
  destructive?: boolean;
}

const COMMANDS: CommandConfig[] = [
  { key: "abrir_app",    comando: "abrir_app",     label: "Abrir Aplicativo",       icon: Rocket, field: "package", placeholder: "com.android.settings" },
  { key: "consulta_ean", comando: "consulta_ean",  label: "Consulta Produto (EAN)", icon: Search, field: "codbar",  placeholder: "7894650014202" },
  { key: "ip_server",    comando: "ip_server",     label: "Configurar IP Servidor", icon: Globe,  field: "ip",      placeholder: "192.168.0.10" },
  { key: "img_delete",   comando: "img_delete",    label: "Deletar Imagem",         icon: Trash2, field: "codbar",  placeholder: "7894650014202", destructive: true },
  { key: "reset_app",    comando: "reset_app",     label: "Resetar Aplicação",      icon: RotateCcw },
  { key: "fecha_app",    comando: "fecha_app",     label: "Fechar Aplicação",       icon: XCircle, destructive: true },
];

type TargetMode = "store" | "group" | "manual";

export function BulkCommandDialog({
  open,
  onOpenChange,
  devices,
  stores,
  groups,
}: Props) {
  const [mode, setMode] = useState<TargetMode>("store");
  const [storeCode, setStoreCode] = useState<string>("");
  const [groupName, setGroupName] = useState<string>("");
  const [manualIds, setManualIds] = useState<Set<string>>(new Set());
  const [manualSearch, setManualSearch] = useState("");

  const [commandKey, setCommandKey] = useState<CommandKey>("reset_app");
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);

  const selectedCmd = COMMANDS.find((c) => c.key === commandKey)!;

  const targetDevices: BulkDevice[] = useMemo(() => {
    if (mode === "store" && storeCode) {
      return devices.filter((d) => d.num_filial === storeCode);
    }
    if (mode === "group" && groupName) {
      return devices.filter((d) => d.grupo_dispositivos === groupName);
    }
    if (mode === "manual") {
      return devices.filter((d) => manualIds.has(String(d.id)));
    }
    return [];
  }, [mode, storeCode, groupName, manualIds, devices]);

  const validTargets = targetDevices.filter((d) => d.serial);

  const filteredManualList = useMemo(() => {
    const q = manualSearch.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter(
      (d) =>
        d.apelido_interno?.toLowerCase().includes(q) ||
        d.serial?.toLowerCase().includes(q) ||
        d.num_filial?.toLowerCase().includes(q),
    );
  }, [devices, manualSearch]);

  const toggleManual = (id: string) => {
    setManualIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllManual = () => {
    const ids = filteredManualList.map((d) => String(d.id));
    const allSelected = ids.every((id) => manualIds.has(id));
    setManualIds((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const reset = () => {
    setStoreCode("");
    setGroupName("");
    setManualIds(new Set());
    setManualSearch("");
    setInputValue("");
    setCommandKey("reset_app");
    setMode("store");
  };

  const handleSend = async () => {
    if (validTargets.length === 0) {
      toast.error("Selecione ao menos um dispositivo com serial.");
      return;
    }
    let value = "";
    
    // Novas regras de EAN automático para comandos específicos
    if (commandKey === "fecha_app") {
      value = "040816";
    } else if (commandKey === "img_delete") {
      value = "050223";
    } else if (selectedCmd.field) {
      value = inputValue.trim();
      if (!value) {
        toast.error("Informe o valor do comando.");
        return;
      }
    }

    setSending(true);
    const timestamp = Date.now();

    const payload: Record<string, string> = {
      id_grupo: "",
      codbar: selectedCmd.field === "codbar" ? value : "",
      package: selectedCmd.field === "package" ? value : "",
      ip: selectedCmd.field === "ip" ? value : "",
    };

    try {
      const results = await Promise.allSettled(
        validTargets.map((device) =>
          fetch(
            `${FIREBASE_BASE}/${encodeURIComponent(device.serial!)}.json`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                comando: selectedCmd.comando,
                ...payload,
                id_grupo: device.grupo_dispositivos ?? "",
                time: `${timestamp}_${device.serial}`,
              }),
            },
          ).then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r;
          }),
        ),
      );

      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.length - ok;

      if (fail === 0) {
        toast.success(`Comando enviado para ${ok} dispositivo(s)`);
        onOpenChange(false);
        reset();
      } else {
        toast.warning(`Enviado: ${ok} · Falhou: ${fail}`);
      }
    } catch (e) {
      toast.error("Erro inesperado no envio em massa", {
        description: e instanceof Error ? e.message : "Erro",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-3 border-b">
          <DialogTitle className="font-display flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Envio de comando em massa
          </DialogTitle>
          <DialogDescription>
            Selecione um destino e envie comandos para múltiplos dispositivos simultaneamente.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* DESTINO */}
            <section className="space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                1. Destino
              </h3>
              <Tabs value={mode} onValueChange={(v) => setMode(v as TargetMode)}>
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="store"><Store className="h-3.5 w-3.5 mr-1.5" /> Loja</TabsTrigger>
                  <TabsTrigger value="group"><Layers className="h-3.5 w-3.5 mr-1.5" /> Grupo</TabsTrigger>
                  <TabsTrigger value="manual"><Users className="h-3.5 w-3.5 mr-1.5" /> Manual</TabsTrigger>
                </TabsList>

                <TabsContent value="store" className="mt-3">
                  <Select value={storeCode} onValueChange={setStoreCode}>
                    <SelectTrigger><SelectValue placeholder="Selecione uma loja" /></SelectTrigger>
                    <SelectContent>
                      {stores.map((s) => (
                        <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TabsContent>

                <TabsContent value="group" className="mt-3">
                  <Select value={groupName} onValueChange={setGroupName}>
                    <SelectTrigger><SelectValue placeholder="Selecione um grupo" /></SelectTrigger>
                    <SelectContent>
                      {groups.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TabsContent>

                <TabsContent value="manual" className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Buscar dispositivo..."
                      value={manualSearch}
                      onChange={(e) => setManualSearch(e.target.value)}
                      className="h-9"
                    />
                    <Button variant="outline" size="sm" onClick={toggleAllManual}>
                      Alternar todos
                    </Button>
                  </div>
                  <div className="border rounded-lg max-h-56 overflow-y-auto">
                    {filteredManualList.length === 0 && (
                      <p className="text-xs text-muted-foreground p-4 text-center">Nenhum dispositivo.</p>
                    )}
                    {filteredManualList.map((d) => {
                      const id = String(d.id);
                      const checked = manualIds.has(id);
                      return (
                        <label
                          key={id}
                          className={cn(
                            "flex items-center gap-3 p-2 px-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/40",
                            checked && "bg-primary/5"
                          )}
                        >
                          <Checkbox checked={checked} onCheckedChange={() => toggleManual(id)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{d.apelido_interno || "Sem nome"}</p>
                            <p className="text-[10px] font-mono text-muted-foreground truncate">{d.serial || "—"}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px]">Loja {d.num_filial || "—"}</Badge>
                        </label>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>
            </section>

            {/* PREVIEW */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  2. Preview da seleção
                </h3>
                <Badge variant="secondary" className="font-mono">
                  {validTargets.length} dispositivo(s)
                </Badge>
              </div>
              <div className="border rounded-lg bg-muted/20 max-h-40 overflow-y-auto">
                {targetDevices.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-4 text-center">
                    Nenhum dispositivo selecionado.
                  </p>
                ) : (
                  targetDevices.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-2 p-2 px-3 border-b last:border-b-0 text-xs"
                    >
                      <span className="truncate">{d.apelido_interno || "Sem nome"}</span>
                      <span className={cn(
                        "font-mono text-[10px]",
                        d.serial ? "text-muted-foreground" : "text-destructive"
                      )}>
                        {d.serial || "sem serial"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <Separator />

            {/* COMANDO */}
            <section className="space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                3. Comando
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {COMMANDS.map((c) => {
                  const Icon = c.icon;
                  const active = c.key === commandKey;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => { setCommandKey(c.key); setInputValue(""); }}
                      className={cn(
                        "flex items-center gap-2 p-2.5 rounded-lg border text-left text-sm transition-colors",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:bg-muted/40",
                        c.destructive && active && "border-destructive bg-destructive/10 text-destructive"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{c.label}</span>
                    </button>
                  );
                })}
              </div>

              {selectedCmd.field && (
                <div className="space-y-1.5">
                  <Label className="text-xs">{selectedCmd.label}</Label>
                  <Input
                    placeholder={selectedCmd.placeholder}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                </div>
              )}
            </section>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || validTargets.length === 0}
            variant={selectedCmd.destructive ? "destructive" : "default"}
            className={!selectedCmd.destructive ? "bg-gradient-primary text-primary-foreground shadow-glow" : ""}
          >
            {sending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando…</>
            ) : (
              <><Send className="h-4 w-4 mr-2" /> Enviar para {validTargets.length} dispositivo(s)</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
