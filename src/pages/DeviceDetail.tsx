import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { DeviceCommandPanel } from "@/components/DeviceCommandPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";

interface DeviceRow {
  id: string;
  name: string;
  device_code: string | null;
  status: string;
  resolution: string | null;
}

export default function DeviceDetailPage() {
  const { id } = useParams();
  const [device, setDevice] = useState<DeviceRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase
      .from("devices")
      .select("id,name,device_code,status,resolution")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setDevice(data as DeviceRow | null);
        setLoading(false);
      });
  }, [id]);

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

      <DeviceCommandPanel deviceId={device.id} deviceName={device.name} />
    </>
  );
}
