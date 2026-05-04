import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Download, 
  Smartphone, 
  Globe,
  Loader2,
  QrCode
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUserRole } from "@/hooks/use-user-role";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";

export default function CompanyAppsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedApp, setSelectedApp] = useState<{ id: string, name: string } | null>(null);
  const { companyId, isSuperAdmin } = useUserRole();

  // Fetch apps linked to the user's company
  const { data: apps, isLoading } = useQuery({
    queryKey: ["company-apps", companyId],
    queryFn: async () => {
      let query = supabase
        .from("apps")
        .select(`
          *,
          app_companies!inner (
            company_id
          )
        `);
      
      if (!isSuperAdmin && companyId) {
        query = query.eq("app_companies.company_id", companyId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!companyId || isSuperAdmin
  });

  const filteredApps = apps?.filter(app => 
    app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.version.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDownloadUrl = (appId: string) => `${window.location.origin}/download/app/${appId}`;

  return (
    <>
      <PageHeader
        title="Download de Aplicativos"
        description="Acesse as versões oficiais do player para seus dispositivos."
      />

      <div className="flex items-center gap-2 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar aplicativos..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aplicativo</TableHead>
                <TableHead>Versão</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Data de Lançamento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredApps?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Nenhum aplicativo disponível para sua empresa.
                  </TableCell>
                </TableRow>
              ) : filteredApps?.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Smartphone className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{app.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                          {app.description || "Instalador oficial do player Mupa."}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{app.version}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {app.file_size ? `${(app.file_size / 1024 / 1024).toFixed(2)} MB` : "N/A"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(app.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex gap-2"
                        onClick={() => setSelectedApp({ id: app.id, name: app.name })}
                      >
                        <QrCode className="h-4 w-4" /> QR Code
                      </Button>
                      <Button variant="default" size="sm" className="flex gap-2 bg-gradient-primary text-primary-foreground" asChild>
                        <a href={getDownloadUrl(app.id)} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" /> Baixar APK
                        </a>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="Copiar Link"
                        onClick={() => {
                          navigator.clipboard.writeText(getDownloadUrl(app.id));
                          toast.success("Link de download copiado!");
                        }}
                      >
                        <Globe className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">QR Code de Instalação</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            <div className="bg-white p-4 rounded-xl border-4 border-primary/20">
              {selectedApp && (
                <QRCodeSVG 
                  value={getDownloadUrl(selectedApp.id)} 
                  size={240}
                  level="H"
                  includeMargin={true}
                />
              )}
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">{selectedApp?.name}</p>
              <p className="text-sm text-muted-foreground">Aponte a câmera do dispositivo para iniciar o download direto.</p>
            </div>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => {
                const canvas = document.querySelector('svg');
                if (canvas) {
                  // In a real app we might want to export as image, but for now simple close is fine
                  // or just tell them they can screenshot
                  toast.info("Você pode tirar um print deste QR Code para compartilhar.");
                }
              }}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}