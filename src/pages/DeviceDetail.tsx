import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { DeviceCommandPanel } from "@/components/DeviceCommandPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ExternalLink, Loader2, Save, Store } from "lucide-react";
import { toast } from "sonner";

interface DeviceRow {
  id: string;
  name: string;
  device_code: string | null;
  status: string;
  resolution: string | null;
  num_filial: string | null;
}

export default function DeviceDetailPage() {
  const { id } = useParams();
  const [device, setDevice] = useState<DeviceRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [numFilial, setNumFilial] = useState("");

  const fetchDevice = async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("dispositivos")
      .select("id, apelido_interno, serial, online, num_filial")
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
      });
      setNumFilial(data.num_filial ?? "");
    } else {
      setDevice(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDevice();
  }, [id]);

  const handleUpdateStore = async () => {
    if (!id || !device) return;
    
    setSaving(true);
    const { error } = await supabase
      .from("dispositivos")
      .update({ num_filial: numFilial })
      .eq("id", Number(id));

    if (error) {
      toast.error("Erro ao atualizar a loja");
      console.error(error);
    } else {
      toast.success("Loja atualizada com sucesso");
      setDevice(prev => prev ? { ...prev, num_filial: numFilial } : null);
    }
    setSaving(false);
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
        description={`${device.device_code ?? "—"} · ${device.resolution ?? "—"} · ${device.status}`}
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

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Store className="h-5 w-5" />
              Configuração da Loja
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 max-w-sm">
              <div className="space-y-2">
                <Label htmlFor="num_filial">Número da Filial / Loja</Label>
                <div className="flex gap-2">
                  <Input
                    id="num_filial"
                    placeholder="Ex: 001"
                    value={numFilial}
                    onChange={(e) => setNumFilial(e.target.value)}
                  />
                  <Button 
                    onClick={handleUpdateStore} 
                    disabled={saving || numFilial === device.num_filial}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Altere o número da loja associada a este dispositivo.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <DeviceCommandPanel deviceId={device.id} deviceName={device.name} />
      </div>
    </>
  );
}

