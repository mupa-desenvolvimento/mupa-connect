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
import { ArrowLeft, ExternalLink, Loader2, Save, Store, Wrench, Monitor, Layers, Check, ChevronsUpDown, Play } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { usePlaylists, useTenant } from "@/hooks/use-playlist-data";
import { toast } from "sonner";

interface DeviceRow {
  id: string;
  name: string;
  device_code: string | null;
  status: string;
  resolution: string | null;
  num_filial: string | null;
  is_maintenance: boolean;
  playlist_id: string | null;
  appearance_config: any;
}

export default function DeviceDetailPage() {
  const { id } = useParams();
  const [device, setDevice] = useState<DeviceRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [numFilial, setNumFilial] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [deviceSerial, setDeviceSerial] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);

  const { data: contextId, tenantId, companyId, isSuperAdmin } = useTenant();
  const { data: playlists } = usePlaylists(tenantId || undefined, isSuperAdmin);

  const fetchDevice = async () => {
    if (!id) return;
    setLoading(true);
    
    // Se for SuperAdmin, carregar lista de empresas para permitir troca
    if (isSuperAdmin) {
      const { data: cos } = await supabase.from("companies").select("id, name").order("name");
      if (cos) setCompanies(cos);
    }

    let query = supabase
      .from("dispositivos")
      .select("id, apelido_interno, serial, online, num_filial, is_maintenance, playlist_id, last_player_activity_at, company_id, tenant_id")
      .eq("id", Number(id));
    
    if (!isSuperAdmin) {
      if (companyId) query = query.eq("company_id", companyId);
      else if (tenantId) query = query.eq("tenant_id", tenantId);
      else {
        setLoading(false);
        return;
      }
    }

    const { data, error } = await query.maybeSingle();

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
        status: (data.last_player_activity_at && (new Date().getTime() - new Date(data.last_player_activity_at).getTime() < 300000)) ? "online" : "offline",
        resolution: null,
        num_filial: data.num_filial ?? "",
        is_maintenance: !!data.is_maintenance,
        playlist_id: data.playlist_id,
      });
      setNumFilial(data.num_filial ?? "");
      setDeviceName(data.apelido_interno ?? "");
      setDeviceSerial(data.serial ?? "");
      setSelectedCompanyId(data.company_id);
      setIsMaintenance(!!data.is_maintenance);
      setSelectedPlaylistId(data.playlist_id);
    } else {
      setDevice(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDevice();
  }, [id, isSuperAdmin]);

  const handlePreview = () => {
    if (!device?.device_code) return;
    const width = window.innerWidth * 0.7;
    const height = window.innerHeight * 0.7;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;

    const popup = window.open(
      `/play/${device.device_code}?preview=true`,
      "preview_player",
      `width=${width},height=${height},top=${top},left=${left},toolbar=no,menubar=no,location=no,status=no,resizable=yes,scrollbars=no`
    );

    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      toast.error("Seu navegador bloqueou o preview. Permita popups para visualizar.");
    }
  };

  const handleUpdateDevice = async () => {
    if (!id || !device) return;
    
    setSaving(true);
    
    // Preparar dados para auditoria
    const oldData = {
      apelido_interno: device.name,
      num_filial: device.num_filial,
      serial: device.device_code,
      company_id: device.playlist_id, // Usando campos disponíveis no state device para o mock
      playlist_id: device.playlist_id
    };

    const updateData: any = { 
      apelido_interno: deviceName,
      num_filial: numFilial,
      is_maintenance: isMaintenance,
      playlist_id: selectedPlaylistId
    };

    // SuperAdmin pode alterar serial e empresa
    if (isSuperAdmin) {
      updateData.serial = deviceSerial;
      updateData.company_id = selectedCompanyId;
    }

    let updateQuery = supabase
      .from("dispositivos")
      .update(updateData)
      .eq("id", Number(id));

    if (!isSuperAdmin) {
      if (companyId) updateQuery = updateQuery.eq("company_id", companyId);
      else if (tenantId) updateQuery = updateQuery.eq("tenant_id", tenantId);
      else {
        toast.error("Sem permissão para atualizar este dispositivo");
        setSaving(false);
        return;
      }
    }

    const { error } = await updateQuery;

    if (error) {
      toast.error("Erro ao atualizar o dispositivo");
      console.error(error);
    } else {
      // Registrar auditoria se for SuperAdmin
      if (isSuperAdmin) {
        await supabase.rpc('log_audit_action', {
          p_action: 'update_device_properties',
          p_device_id: Number(id),
          p_old_value: oldData,
          p_new_value: updateData,
          p_metadata: { source: 'DeviceDetail', user_role: 'admin_global' }
        });
      }

      toast.success("Dispositivo atualizado com sucesso");
      setDevice(prev => prev ? { 
        ...prev, 
        name: deviceName,
        device_code: deviceSerial,
        num_filial: numFilial,
        is_maintenance: isMaintenance,
        playlist_id: selectedPlaylistId
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
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <span className="text-[10px] px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full font-bold animate-pulse">
                MODO SUPERADMIN
              </span>
            )}
            <Button asChild variant="outline">
              <Link to="/dispositivos"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link>
            </Button>
            {device.device_code && (
              <Button onClick={handlePreview} className="bg-gradient-primary text-primary-foreground shadow-glow">
                Preview Real <Play className="h-4 w-4 ml-1 fill-current" />
              </Button>
            )}
          </div>
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

            {isSuperAdmin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="device_serial">Serial / Identificador Único</Label>
                  <Input
                    id="device_serial"
                    placeholder="Ex: ABC-123-XYZ"
                    value={deviceSerial}
                    onChange={(e) => setDeviceSerial(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Empresa Vinculada</Label>
                  <Select value={selectedCompanyId || "none"} onValueChange={(val) => setSelectedCompanyId(val === "none" ? null : val)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione a empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem empresa (Global)</SelectItem>
                      {companies.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="num_filial">Número da Filial / Loja</Label>
              <Input
                id="num_filial"
                placeholder="Ex: 001"
                value={numFilial}
                onChange={(e) => setNumFilial(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Playlist Vinculada</Label>
              <Select value={selectedPlaylistId || "none"} onValueChange={(val) => setSelectedPlaylistId(val === "none" ? null : val)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma playlist" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem playlist (usar padrão)</SelectItem>
                  {playlists?.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        {p.is_company_default && <Layers className="h-3 w-3 text-[#085CF0]" />}
                        {p.name}
                        {p.is_company_default && <span className="text-[10px] bg-[#085CF0]/10 text-[#085CF0] px-1 rounded ml-1 font-bold">DEFAULT</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedPlaylistId && (
                <p className="text-[10px] text-yellow-600 font-medium">
                  Este dispositivo usará a playlist padrão da empresa como fallback.
                </p>
              )}
            </div>

            <Button 
              className="w-full"
              onClick={handleUpdateDevice} 
              disabled={saving || (
                deviceName === device.name && 
                numFilial === device.num_filial && 
                selectedPlaylistId === device.playlist_id &&
                (!isSuperAdmin || (deviceSerial === device.device_code && selectedCompanyId === (device as any).company_id))
              )}
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


