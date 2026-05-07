import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
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
  Bell,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  MoreVertical, 
  ChevronRight,
  FileText,
  Send,
  Building2,
  Pencil
} from "lucide-react";
import { TemplatesPanel } from "@/components/whatsapp/TemplatesPanel";
import { GroupsPanel } from "@/components/whatsapp/GroupsPanel";
import { ManualSendPanel } from "@/components/whatsapp/ManualSendPanel";
import { SendHistoryPanel } from "@/components/whatsapp/SendHistoryPanel";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { usePhoneMask } from "@/hooks/usePhoneMask";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";


export default function WhatsAppManagement() {
  const [activeTab, setActiveTab] = useState("instances");
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [connectingInstance, setConnectingInstance] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddRecipientDialog, setShowAddRecipientDialog] = useState(false);
  const [showTestMessageDialog, setShowTestMessageDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  
  const [newInstance, setNewInstance] = useState({ name: "", description: "" });
  const [newRecipient, setNewRecipient] = useState({ 
    id: "", 
    name: "", 
    phone: "", 
    company_id: "", 
    error_notifications: true, 
    device_status_notifications: true, 
    playlist_notifications: true 
  });
  const [newTemplate, setNewTemplate] = useState({ name: "", content: "", category: "" });
  const [testMessage, setTestMessage] = useState({ instanceName: "", recipientPhone: "", message: "" });
  const [creating, setCreating] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const queryClient = useQueryClient();

  const recipientInputRef = usePhoneMask();
  const testInputRef = usePhoneMask();

  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, name").order("name");
      if (error) throw error;
      return data;
    }
  });

  const callApi = async (action: string, payload: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("whatsapp-evolution", {
      body: { action, ...payload },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const isValidPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    // WhatsApp numbers with country code are usually between 10 and 15 digits
    return /^\d{10,15}$/.test(cleaned);
  };

  const handleGenerateQR = async (instanceName: string) => {
    try {
      setConnectingInstance(instanceName);
      toast.info("Gerando QR Code...");
      const data = await callApi("getQRCode", { instanceName });
      const base64 = data?.base64;
      if (base64) {
        setQrCodeUrl(base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`);
        setShowQrDialog(true);
      } else {
        toast.error("Não foi possível obter o QR Code");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao conectar");
    } finally {
      setConnectingInstance(null);
    }
  };

  const handleCreateInstance = async () => {
    if (!newInstance.name.trim()) return toast.error("Nome obrigatório");
    try {
      setCreating(true);
      await callApi("createInstance", {
        instanceName: newInstance.name.trim().toLowerCase().replace(/\s+/g, "_"),
        description: newInstance.description,
      });
      toast.success("Instância criada");
      setShowCreateDialog(false);
      setNewInstance({ name: "", description: "" });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-instances"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar instância");
    } finally {
      setCreating(false);
    }
  };

  const handleCheckStatus = async (instanceName: string) => {
    try {
      const data = await callApi("connectionState", { instanceName });
      toast.success(`Status: ${data?.state || "desconhecido"}`);
      queryClient.invalidateQueries({ queryKey: ["whatsapp-instances"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleLogout = async (instanceName: string) => {
    try {
      await callApi("logout", { instanceName });
      toast.success("Desconectado");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-instances"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (instanceName: string) => {
    if (!confirm(`Remover instância ${instanceName}?`)) return;
    try {
      await callApi("deleteInstance", { instanceName });
      toast.success("Instância removida");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-instances"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };
  const handleAddRecipient = async () => {
    if (!newRecipient.name.trim() || !newRecipient.phone.trim()) {
      return toast.error("Nome e telefone são obrigatórios");
    }
    const cleanedPhone = newRecipient.phone.replace(/\D/g, "");
    if (!isValidPhone(cleanedPhone)) {
      return toast.error("Por favor, insira um telefone válido com DDI e DDD");
    }
    try {
      setCreating(true);
      const recipientData = {
        name: newRecipient.name.trim(),
        phone: cleanedPhone,
        company_id: newRecipient.company_id || null,
        error_notifications: newRecipient.error_notifications,
        device_status_notifications: newRecipient.device_status_notifications,
        playlist_notifications: newRecipient.playlist_notifications,
        is_active: true,
      };

      let error;
      if (newRecipient.id) {
        const { error: updateError } = await supabase
          .from("whatsapp_recipients")
          .update(recipientData)
          .eq("id", newRecipient.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("whatsapp_recipients")
          .insert(recipientData);
        error = insertError;
      }

      if (error) throw error;
      toast.success(newRecipient.id ? "Destinatário atualizado" : "Destinatário cadastrado");
      setShowAddRecipientDialog(false);
      setNewRecipient({ 
        id: "", 
        name: "", 
        phone: "", 
        company_id: "", 
        error_notifications: true, 
        device_status_notifications: true, 
        playlist_notifications: true 
      });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-recipients"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar destinatário");
    } finally {
      setCreating(false);
    }
  };

  const handleSendTestMessage = async () => {
    const inputPhone = testInputRef.current?.value || testMessage.recipientPhone;
    if (!testMessage.instanceName || !inputPhone || !testMessage.message.trim()) {
      return toast.error("Todos os campos são obrigatórios");
    }
    const cleanedPhone = inputPhone.replace(/\D/g, "");
    if (!isValidPhone(cleanedPhone)) {
      return toast.error("Telefone de destino inválido. Por favor, confira o número.");
    }
    try {
      setSendingTest(true);
      await callApi("sendMessage", {
        instanceName: testMessage.instanceName,
        phone: cleanedPhone,
        message: testMessage.message.trim(),
      });
      toast.success("Mensagem de teste enviada!");
      setShowTestMessageDialog(false);
      setTestMessage({ ...testMessage, message: "" });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-logs"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar mensagem");
    } finally {
      setSendingTest(false);
    }
  };

  const handleDeleteRecipient = async (id: string) => {
    if (!confirm("Remover este destinatário?")) return;
    try {
      const { error } = await supabase.from("whatsapp_recipients").delete().eq("id", id);
      if (error) throw error;
      toast.success("Destinatário removido");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-recipients"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.content.trim()) {
      return toast.error("Nome e conteúdo são obrigatórios");
    }
    try {
      setCreating(true);
      const { error } = await supabase.from("whatsapp_templates").upsert({
        name: newTemplate.name.trim(),
        content: newTemplate.content.trim(),
        category: newTemplate.category.trim() || "Geral",
      });
      if (error) throw error;
      toast.success("Template salvo");
      setShowTemplateDialog(false);
      setNewTemplate({ name: "", content: "", category: "" });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar template");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Remover este template?")) return;
    try {
      const { error } = await supabase.from("whatsapp_templates").delete().eq("id", id);
      if (error) throw error;
      toast.success("Template removido");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };


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

  const { data: recipients } = useQuery({
    queryKey: ["whatsapp-recipients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_recipients")
        .select("*, companies(name)");
      if (error) throw error;
      return data;
    }
  });

  const { data: templates } = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_templates")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    }
  });

  const { data: logs } = useQuery({
    queryKey: ["whatsapp-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_logs")
        .select(`
          *,
          whatsapp_instances (name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);
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
          <Button
            className="bg-gradient-primary text-primary-foreground shadow-glow"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> Nova Instância
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-background border flex-wrap h-auto">
          <TabsTrigger value="instances" className="gap-2">
            <Smartphone className="h-4 w-4" /> Instâncias
          </TabsTrigger>
          <TabsTrigger value="recipients" className="gap-2">
            <Users className="h-4 w-4" /> Destinatários
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-2">
            <Users className="h-4 w-4" /> Grupos
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" /> Templates
          </TabsTrigger>
          <TabsTrigger value="send" className="gap-2">
            <Send className="h-4 w-4" /> Envio Manual
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" /> Histórico Envios
          </TabsTrigger>
          <TabsTrigger value="automations" className="gap-2">
            <Bell className="h-4 w-4" /> Alertas
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <History className="h-4 w-4" /> Logs
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
                        <Button 
                          variant="outline" 
                          className="w-full gap-2 border-primary/20 text-primary hover:bg-primary/5"
                          onClick={() => handleGenerateQR(instance.instance_key || instance.name)}
                          disabled={connectingInstance === (instance.instance_key || instance.name)}
                        >
                          {connectingInstance === (instance.instance_key || instance.name) ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <QrCode className="h-4 w-4" />
                          )}
                          Gerar QR
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full gap-2 border-destructive/20 text-destructive hover:bg-destructive/5"
                          onClick={() => handleLogout(instance.instance_key || instance.name)}
                        >
                          <Power className="h-4 w-4" /> Desconectar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => handleCheckStatus(instance.instance_key || instance.name)}
                        title="Atualizar status"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setTestMessage({ ...testMessage, instanceName: instance.instance_key || instance.name });
                            setShowTestMessageDialog(true);
                          }}>
                            <MessageSquare className="h-4 w-4 mr-2" /> Testar Envio
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleGenerateQR(instance.instance_key || instance.name)}>
                            <QrCode className="h-4 w-4 mr-2" /> Reconectar (QR)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(instance.instance_key || instance.name)}
                          >
                            <XCircle className="h-4 w-4 mr-2" /> Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Card className="border-dashed border-2 flex flex-col items-center justify-center p-8 text-center bg-muted/20">
                <Smartphone className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
                <h3 className="font-medium text-muted-foreground mb-2">Adicionar Novo Número</h3>
                <p className="text-xs text-muted-foreground mb-4 max-w-[200px]">Conecte um novo WhatsApp via Evolution API.</p>
                <Button variant="outline" size="sm" onClick={() => setShowCreateDialog(true)}>
                  Começar Configuração
                </Button>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="recipients">
             <div className="space-y-4">
               <div className="flex justify-between items-center gap-4 bg-card p-4 rounded-xl border border-border/60">
                 <div className="relative flex-1 max-w-sm">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                   <Input placeholder="Buscar destinatário..." className="pl-10" />
                 </div>
                 <Button className="gap-2" onClick={() => setShowAddRecipientDialog(true)}>
                   <Plus className="h-4 w-4" /> Novo Destinatário
                 </Button>
               </div>

               <Card className="border-border/60">
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Nome</TableHead>
                       <TableHead>Telefone</TableHead>
                       <TableHead>Empresa</TableHead>
                       <TableHead>Alertas</TableHead>
                       <TableHead>Status</TableHead>
                       <TableHead className="text-right">Ações</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                      {recipients?.map((recipient) => (
                        <TableRow key={recipient.id}>
                          <TableCell className="font-medium">{recipient.name}</TableCell>
                          <TableCell className="font-mono text-xs">{recipient.phone}</TableCell>
                          <TableCell>{recipient.companies?.name || "Global"}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {recipient.error_notifications && (
                                <Badge variant="outline" className="text-[10px] py-0 h-4 bg-red-500/5 border-red-200 text-red-600">
                                  Erros
                                </Badge>
                              )}
                              {recipient.device_status_notifications && (
                                <Badge variant="outline" className="text-[10px] py-0 h-4 bg-blue-500/5 border-blue-200 text-blue-600">
                                  Status
                                </Badge>
                              )}
                              {recipient.playlist_notifications && (
                                <Badge variant="outline" className="text-[10px] py-0 h-4 bg-green-500/5 border-green-200 text-green-600">
                                  Playlist
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={recipient.is_active ? "default" : "secondary"} className={cn("text-[10px]", recipient.is_active && "bg-green-500/10 text-green-600 hover:bg-green-500/20")}>
                              {recipient.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setNewRecipient({
                                    id: recipient.id,
                                    name: recipient.name,
                                    phone: recipient.phone,
                                    company_id: recipient.company_id || "",
                                    error_notifications: recipient.error_notifications ?? true,
                                    device_status_notifications: recipient.device_status_notifications ?? true,
                                    playlist_notifications: recipient.playlist_notifications ?? true
                                  });
                                  setShowAddRecipientDialog(true);
                                }}>
                                  <Pencil className="h-4 w-4 mr-2" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setTestMessage({ ...testMessage, recipientPhone: recipient.phone });
                                  setShowTestMessageDialog(true);
                                }}>
                                  <MessageSquare className="h-4 w-4 mr-2" /> Testar Envio
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDeleteRecipient(recipient.id)}
                                >
                                  <XCircle className="h-4 w-4 mr-2" /> Remover
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                     {(!recipients || recipients.length === 0) && (
                       <TableRow>
                         <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                           Nenhum destinatário configurado.
                         </TableCell>
                       </TableRow>
                     )}
                   </TableBody>
                 </Table>
               </Card>
             </div>
          </TabsContent>

          <TabsContent value="automations">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-border/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-warning" />
                      Regras de Offline
                    </CardTitle>
                    <CardDescription>Configure como o sistema alerta sobre dispositivos desconectados.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                      <div>
                        <p className="text-sm font-medium">Tempo mínimo para alerta</p>
                        <p className="text-xs text-muted-foreground">Alertar após X minutos offline.</p>
                      </div>
                      <Badge variant="outline">15 min</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                      <div>
                        <p className="text-sm font-medium">Intervalo entre mensagens (Cooldown)</p>
                        <p className="text-xs text-muted-foreground">Evitar spam de notificações.</p>
                      </div>
                      <Badge variant="outline">2 horas</Badge>
                    </div>
                    <Button variant="outline" className="w-full">Editar Configurações</Button>
                  </CardContent>
                </Card>
                <Card className="border-border/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-primary" />
                      Tipos de Alerta Ativos
                    </CardTitle>
                    <CardDescription>Selecione quais eventos disparam notificações.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { label: "Dispositivo Offline", active: true },
                      { label: "Erro na Consulta de Preço", active: true },
                      { label: "Player Travado", active: false },
                      { label: "Erro de Mídia", active: true },
                      { label: "Falha de Sincronização", active: true },
                      { label: "Dispositivo sem Playlist", active: true },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/30 transition-colors">
                        <span className="text-sm">{item.label}</span>
                        <div className={cn("h-2 w-2 rounded-full", item.active ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-muted-foreground/30")} />
                      </div>
                    ))}
                  </CardContent>
                </Card>
             </div>
          </TabsContent>

          <TabsContent value="logs">
             <Card className="border-border/60">
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Data/Hora</TableHead>
                     <TableHead>Instância</TableHead>
                     <TableHead>Destinatário</TableHead>
                     <TableHead>Mensagem</TableHead>
                     <TableHead>Status</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {logs?.map((log) => (
                     <TableRow key={log.id}>
                       <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                         {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                       </TableCell>
                       <TableCell className="text-xs font-medium">{log.whatsapp_instances?.name || "—"}</TableCell>
                       <TableCell className="font-mono text-xs">{log.recipient_phone}</TableCell>
                       <TableCell className="max-w-md truncate text-xs">{log.message}</TableCell>
                       <TableCell>
                         <Badge variant={log.status === "sent" ? "default" : "destructive"} className={cn("text-[10px] py-0 h-4", log.status === "sent" ? "bg-green-500/10 text-green-600 border-green-200" : "bg-red-500/10 text-red-600 border-red-200")}>
                           {log.status === "sent" ? "Enviado" : "Erro"}
                         </Badge>
                       </TableCell>
                     </TableRow>
                   ))}
                   {(!logs || logs.length === 0) && (
                     <TableRow>
                       <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                         Nenhum log registrado.
                       </TableCell>
                     </TableRow>
                   )}
                 </TableBody>
               </Table>
             </Card>
          </TabsContent>

        </div>
      </Tabs>

      {showQrDialog && qrCodeUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Conectar WhatsApp</CardTitle>
              <CardDescription>Escaneie o código abaixo com seu aplicativo WhatsApp.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-xl mb-4 border border-border shadow-inner">
                <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
              </div>
              <p className="text-xs text-muted-foreground text-center mb-6">
                Abra o WhatsApp {">"} Aparelhos Conectados {">"} Conectar um Aparelho.
              </p>
              <Button className="w-full" onClick={() => setShowQrDialog(false)}>Fechar</Button>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Instância WhatsApp</DialogTitle>
            <DialogDescription>
              Cria uma instância na Evolution API. O nome será usado como identificador (sem espaços).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="inst-name">Nome da instância</Label>
              <Input
                id="inst-name"
                placeholder="ex: empresa_x"
                value={newInstance.name}
                onChange={(e) => setNewInstance({ ...newInstance, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inst-desc">Descrição (opcional)</Label>
              <Input
                id="inst-desc"
                placeholder="Ex: Suporte técnico"
                value={newInstance.description}
                onChange={(e) => setNewInstance({ ...newInstance, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleCreateInstance} disabled={creating}>
              {creating ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddRecipientDialog} onOpenChange={(open) => {
        setShowAddRecipientDialog(open);
        if (!open) setNewRecipient({ 
          id: "", name: "", phone: "", company_id: "", 
          error_notifications: true, device_status_notifications: true, playlist_notifications: true 
        });
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{newRecipient.id ? "Editar Destinatário" : "Novo Destinatário"}</DialogTitle>
            <DialogDescription>
              Configure um número para receber notificações automáticas do sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rec-name">Nome</Label>
                <Input
                  id="rec-name"
                  placeholder="Ex: João Silva"
                  value={newRecipient.name}
                  onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rec-phone">Telefone (Máscara ativa)</Label>
                <Input
                  id="rec-phone"
                  ref={recipientInputRef}
                  placeholder="+55 (11) 99999-9999"
                  defaultValue={newRecipient.phone}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rec-company">Empresa (Opcional)</Label>
              <Select 
                value={newRecipient.company_id} 
                onValueChange={(v) => setNewRecipient({ ...newRecipient, company_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa (ou deixe em branco para Global)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Global (Todas as empresas)</SelectItem>
                  {companies?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 pt-2 border-t">
              <Label className="text-sm font-semibold">Notificações Ativas</Label>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Erros do Sistema</Label>
                  <p className="text-[10px] text-muted-foreground italic">Alertas de falhas críticas de hardware ou rede.</p>
                </div>
                <Switch 
                  checked={newRecipient.error_notifications}
                  onCheckedChange={(v) => setNewRecipient({ ...newRecipient, error_notifications: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Status de Dispositivos</Label>
                  <p className="text-[10px] text-muted-foreground italic">Alertas quando um player fica offline/online.</p>
                </div>
                <Switch 
                  checked={newRecipient.device_status_notifications}
                  onCheckedChange={(v) => setNewRecipient({ ...newRecipient, device_status_notifications: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Playlists e Mídia</Label>
                  <p className="text-[10px] text-muted-foreground italic">Atualizações de conteúdo e downloads.</p>
                </div>
                <Switch 
                  checked={newRecipient.playlist_notifications}
                  onCheckedChange={(v) => setNewRecipient({ ...newRecipient, playlist_notifications: v })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRecipientDialog(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleAddRecipient} disabled={creating} className="bg-gradient-primary text-white">
              {creating ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              {newRecipient.id ? "Atualizar" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTestMessageDialog} onOpenChange={setShowTestMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Testar Envio de Mensagem</DialogTitle>
            <DialogDescription>
              Envie uma mensagem de teste para validar a conexão.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Instância de Origem</Label>
              <Select 
                value={testMessage.instanceName} 
                onValueChange={(v) => setTestMessage({ ...testMessage, instanceName: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma instância" />
                </SelectTrigger>
                <SelectContent>
                  {instances?.filter(i => i.status === "connected").map((inst) => (
                    <SelectItem key={inst.id} value={inst.instance_key || inst.name}>
                      {inst.name}
                    </SelectItem>
                  ))}
                  {instances?.filter(i => i.status === "connected").length === 0 && (
                    <div className="p-2 text-xs text-muted-foreground text-center">Nenhuma instância conectada</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-phone">Número de Destino (Máscara ativa)</Label>
              <div className="flex gap-2">
                <Input
                  id="test-phone"
                  ref={testInputRef}
                  placeholder="+55 (11) 99999-9999"
                  defaultValue={testMessage.recipientPhone}
                  className="flex-1"
                />
                <Select 
                  onValueChange={(v) => setTestMessage({ ...testMessage, recipientPhone: v })}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Contatos" />
                  </SelectTrigger>
                  <SelectContent>
                    {recipients?.map((rec) => (
                      <SelectItem key={rec.id} value={rec.phone}>
                        {rec.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="test-msg">Mensagem</Label>
                {templates && templates.length > 0 && (
                  <Select onValueChange={(v) => setTestMessage({ ...testMessage, message: v })}>
                    <SelectTrigger className="w-[180px] h-7 text-[10px] bg-primary/5 border-primary/20">
                      <SelectValue placeholder="Usar template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.content} className="text-xs">
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Textarea
                id="test-msg"
                placeholder="Digite sua mensagem de teste..."
                value={testMessage.message}
                onChange={(e) => setTestMessage({ ...testMessage, message: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestMessageDialog(false)} disabled={sendingTest}>
              Cancelar
            </Button>
            <Button onClick={handleSendTestMessage} disabled={sendingTest}>
              {sendingTest ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <MessageSquare className="h-4 w-4 mr-2" />}
              Enviar Teste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Template</DialogTitle>
            <DialogDescription>
              Crie mensagens reutilizáveis para agilizar sua comunicação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tpl-name">Nome do Template</Label>
              <Input
                id="tpl-name"
                placeholder="Ex: Saudação Inicial"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-cat">Categoria</Label>
              <Input
                id="tpl-cat"
                placeholder="Ex: Suporte, Vendas"
                value={newTemplate.category}
                onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-content">Conteúdo da Mensagem</Label>
              <Textarea
                id="tpl-content"
                placeholder="Digite o texto da mensagem..."
                value={newTemplate.content}
                onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTemplate} disabled={creating}>
              {creating ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Salvar Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

