import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { DeviceCommandPanel } from "@/components/DeviceCommandPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ExternalLink, Loader2, Save, Store, Wrench, Monitor } from "lucide-react";
import { toast } from "sonner";
import { FirebaseRealtimeService } from "@/services/FirebaseRealtimeService";

interface DeviceRow {
  id: string;
  name: string;
  device_code: string | null;
  status: string;
  resolution: string | null;
  num_filial: string | null;
  is_maintenance: boolean;
}

export default function DeviceDetailPage() {
  const { id } = useParams();
  const [device, setDevice] = useState<DeviceRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [numFilial, setNumFilial] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [isMaintenance, setIsMaintenance] = useState(false);

  const fetchDevice = async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("dispositivos")
      .select("id, apelido_interno, serial, online, num_filial, is_maintenance")
      .eq("id", Number(id))
      .maybeSingle();

    if (error) {
      toast.error("Erro ao carregar dispositivo");
      setLoading(false);
      return;
    }

    if (data) {
      setDevice({
        id: String(data.id),
        name: data.apelido_interno ?? "Dispositivo",
        device_code: data.serial ?? null,
        status: data.online ? "online" : "offline",
        resolution: null,
        num_filial: data.num_filial ?? "",
        is_maintenance: !!data.is_maintenance,
      });
      setNumFilial(data.num_filial ?? "");
      setDeviceName(data.apelido_interno ?? "");
      setIsMaintenance(!!data.is_maintenance);
    } else {
      setDevice(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDevice();
  }, [id]);

  const handleUpdateDevice = async () => {
    if (!id || !device) return;
    
    setSaving(true);
    const { error } = await supabase
      .from("dispositivos")
      .update({ 
        apelido_interno: deviceName,
        num_filial: numFilial,
        is_maintenance: isMaintenance
      })
      .eq("id", Number(id));

    if (error) {
      toast.error("Erro ao atualizar o dispositivo");
      console.error(error);
    } else {
      toast.success("Dispositivo atualizado com sucesso");
      setDevice(prev => prev ? { 
        ...prev, 
        name: deviceName,
        num_filial: numFilial,
        is_maintenance: isMaintenance
      } : null);
    }
    setSaving(false);
  };

  const toggleMaintenance = async (checked: boolean) => {
    if (!id || !device) return;
    
    setIsMaintenance(checked);
    const { error } = await supabase
      .from("dispositivos")
      .update({ is_maintenance: checked })
      .eq("id", Number(id));

    if (error) {
      toast.error("Erro ao atualizar modo manutenção");
      setIsMaintenance(!checked);
      console.error(error);
    } else {
      toast.success(checked ? "Modo manutenção ativado" : "Modo manutenção desativado");
      setDevice(prev => prev ? { ...prev, is_maintenance: checked } : null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando dispositivo…
      </div>
    );
  }

  if (!device) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Dispositivo não encontrado.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/dispositivos"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        title={device.name}
        description={`${device.device_code ?? "—"} · ${device.status}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/dispositivos"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link>
            </Button>
            {device.device_code && (
              <Button asChild className="bg-gradient-primary text-primary-foreground shadow-glow">
                <Link to={`/play/${device.device_code}`} target="_blank">
                  Abrir player <ExternalLink className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            )}
          </>
        }
      />

      {device.is_maintenance && (
        <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <Card className="overflow-hidden border-yellow-500/50 bg-yellow-500/5">
            <img 
              src="https://pub-0e15cc358ba84ff2a24226b12278433b.r2.dev/Banner%20Manutenc%CC%A7a%CC%83o.jpg" 
              alt="Banner Manutenção" 
              className="w-full h-auto object-cover max-h-[300px]"
            />
            <CardContent className="p-4 flex items-center gap-3 text-yellow-700 dark:text-yellow-400">
              <Wrench className="h-5 w-5 animate-pulse" />
              <p className="font-medium text-lg">Este dispositivo está em modo de manutenção.</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              Informações do Dispositivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="device_name">Nome do Dispositivo</Label>
              <Input
                id="device_name"
                placeholder="Ex: Terminal 01"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="num_filial">Número da Filial / Loja</Label>
              <Input
                id="num_filial"
                placeholder="Ex: 001"
                value={numFilial}
                onChange={(e) => setNumFilial(e.target.value)}
              />
            </div>

            <Button 
              className="w-full"
              onClick={handleUpdateDevice} 
              disabled={saving || (deviceName === device.name && numFilial === device.num_filial)}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Alterações
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              Estado de Manutenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-base">Bloquear para manutenção</Label>
                <p className="text-sm text-muted-foreground">
                  Quando ativo, o dispositivo exibirá o banner de manutenção e suspenderá as operações normais.
                </p>
              </div>
              <Switch 
                checked={isMaintenance}
                onCheckedChange={toggleMaintenance}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <DeviceCommandPanel deviceId={device.id} deviceName={device.name} />
      </div>
    </>
  );
}


