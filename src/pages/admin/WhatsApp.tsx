import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  Smartphone, 
  Settings, 
  History, 
  Plus, 
  QrCode, 
  RefreshCw,
  Power,
  Users,
  Bell
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function WhatsAppManagement() {
  const [activeTab, setActiveTab] = useState("instances");

  const { data: instances, isLoading: loadingInstances } = useQuery({
    queryKey: ["whatsapp-instances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("*, companies(name)");
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title="WhatsApp Integration" 
        description="Manage WhatsApp instances, automations, and operational alerts."
        actions={
          <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
            <Plus className="mr-2 h-4 w-4" /> Nova Instância
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-background border">
          <TabsTrigger value="instances" className="gap-2">
            <Smartphone className="h-4 w-4" /> Instâncias
          </TabsTrigger>
          <TabsTrigger value="recipients" className="gap-2">
            <Users className="h-4 w-4" /> Destinatários
          </TabsTrigger>
          <TabsTrigger value="automations" className="gap-2">
            <Bell className="h-4 w-4" /> Alertas & Regras
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <History className="h-4 w-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="instances">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {instances?.map((instance) => (
                <Card key={instance.id} className="border-border/60 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{instance.name}</CardTitle>
                        <CardDescription>{instance.companies?.name || "Global"}</CardDescription>
                      </div>
                      <Badge variant={instance.status === "connected" ? "default" : "secondary"} className={instance.status === "connected" ? "bg-green-500 hover:bg-green-600" : ""}>
                        {instance.status === "connected" ? "Conectado" : "Desconectado"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Número:</span>
                        <span className="font-mono">{instance.phone || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Última Conexão:</span>
                        <span>{instance.last_connection_at ? new Date(instance.last_connection_at).toLocaleDateString() : "Nunca"}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      {instance.status !== "connected" ? (
                        <Button variant="outline" className="w-full gap-2 border-primary/20 text-primary hover:bg-primary/5">
                          <QrCode className="h-4 w-4" /> Gerar QR
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full gap-2 border-destructive/20 text-destructive hover:bg-destructive/5">
                          <Power className="h-4 w-4" /> Desconectar
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              <Card className="border-dashed border-2 flex flex-col items-center justify-center p-8 text-center bg-muted/20">
                <Smartphone className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
                <h3 className="font-medium text-muted-foreground mb-2">Adicionar Novo Número</h3>
                <p className="text-xs text-muted-foreground mb-4 max-w-[200px]">Conecte um novo WhatsApp via Evolution API.</p>
                <Button variant="outline" size="sm">
                  Começar Configuração
                </Button>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="recipients">
             {/* Placeholder for recipients management */}
             <Card>
               <CardHeader>
                 <CardTitle>Gerenciar Destinatários</CardTitle>
                 <CardDescription>Configure quem recebe os alertas operacionais.</CardDescription>
               </CardHeader>
               <CardContent>
                 <div className="p-8 text-center text-muted-foreground italic">
                   Módulo de destinatários em desenvolvimento...
                 </div>
               </CardContent>
             </Card>
          </TabsContent>

          <TabsContent value="automations">
             <Card>
               <CardHeader>
                 <CardTitle>Alertas & Automações</CardTitle>
                 <CardDescription>Defina as regras para disparos de mensagens automáticas.</CardDescription>
               </CardHeader>
               <CardContent>
                 <div className="p-8 text-center text-muted-foreground italic">
                   Módulo de automações em desenvolvimento...
                 </div>
               </CardContent>
             </Card>
          </TabsContent>

          <TabsContent value="logs">
             <Card>
               <CardHeader>
                 <CardTitle>Histórico de Mensagens</CardTitle>
                 <CardDescription>Logs de envios e alertas disparados.</CardDescription>
               </CardHeader>
               <CardContent>
                 <div className="p-8 text-center text-muted-foreground italic">
                   Módulo de logs em desenvolvimento...
                 </div>
               </CardContent>
             </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
