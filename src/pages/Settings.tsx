import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { 
  Smartphone, 
  Download, 
  QrCode, 
  Info,
  Loader2,
  ExternalLink,
  Mail,
  Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { CompanySettings } from "@/components/CompanySettings";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const { companyId, isLoading: isLoadingRole } = useUserRole();

  const { data: apps, isLoading: isLoadingApps } = useQuery({
    queryKey: ["company-apps", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from("apps")
        .select(`
          *,
          app_companies!inner (
            company_id
          )
        `)
        .eq("app_companies.company_id", companyId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!companyId
  });

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4 overflow-y-auto">
      <PageHeader title="Configurações" description="Preferências da empresa, integrações e aplicativos." />
      
      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="integracoes">Integrações</TabsTrigger>
          <TabsTrigger value="aplicativo">Aplicativo</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="geral">
            <CompanySettings />

          </TabsContent>

          <TabsContent value="usuarios">
            <Card className="border-border/60 bg-background/50">
              <CardHeader>
                <CardTitle className="font-bold text-lg font-bold">Gestão de Usuários</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground font-medium italic">
                Em breve. Utilize o menu lateral para gerenciar usuários.
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integracoes">
            <Card className="border-border/60 bg-background/50">
              <CardHeader>
                <CardTitle className="font-bold text-lg font-bold">Integrações</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground font-medium italic">
                Em breve. Configure integrações com sistemas externos aqui.
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="aplicativo">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {isLoadingApps ? (
                <div className="col-span-2 flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : apps && apps.length > 0 ? (
                apps.map((app) => {
                  const downloadUrl = `${window.location.origin}/download/app/${app.id}`;
                  return (
                    <Card key={app.id} className="border-border/60 bg-background/50 overflow-hidden">
                      <CardHeader className="bg-primary/5 pb-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary text-primary-foreground">
                              <Smartphone className="h-6 w-6" />
                            </div>
                            <div>
                              <CardTitle className="text-xl font-bold">{app.name}</CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary">Versão {app.version}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {app.file_size ? `${(app.file_size / 1024 / 1024).toFixed(2)} MB` : ""}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row gap-6">
                          <div className="flex-1 space-y-4">
                            <div>
                              <h4 className="text-sm font-semibold mb-1 flex items-center gap-2">
                                <Info className="h-4 w-4" /> Sobre
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {app.description || "Nenhuma descrição fornecida."}
                              </p>
                            </div>

                            <div className="space-y-2 pt-2">
                              <Button className="w-full bg-gradient-primary text-primary-foreground flex gap-2" asChild>
                                <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4" /> Baixar APK
                                </a>
                              </Button>
                              <Button 
                                variant="outline" 
                                className="w-full flex gap-2"
                                onClick={() => handleCopyLink(downloadUrl)}
                              >
                                <ExternalLink className="h-4 w-4" /> Copiar Link Direto
                              </Button>
                            </div>
                          </div>

                          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border">
                            <QRCodeSVG 
                              value={downloadUrl} 
                              size={120}
                              level="H"
                              includeMargin={true}
                            />
                            <p className="text-[10px] font-bold text-black mt-2 uppercase tracking-wider">
                              Escanear para baixar
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Card className="col-span-2 border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Smartphone className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                    <h3 className="text-lg font-medium">Nenhum aplicativo disponível</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                      Sua empresa ainda não possui aplicativos APK vinculados. Entre em contato com o administrador global.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
