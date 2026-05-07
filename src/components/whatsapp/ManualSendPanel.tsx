import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Send, Eye, MessageSquare, Users, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function ManualSendPanel() {
  const qc = useQueryClient();
  const [instanceName, setInstanceName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [individualIds, setIndividualIds] = useState<string[]>([]);
  const [recipientMode, setRecipientMode] = useState<"group" | "individual">("group");
  const [message, setMessage] = useState("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const { data: instances } = useQuery({
    queryKey: ["whatsapp-instances"],
    queryFn: async () => {
      const { data } = await supabase.from("whatsapp_instances").select("id, name, instance_key, status");
      return data || [];
    },
  });
  const { data: templates } = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: async () => {
      const { data } = await supabase.from("whatsapp_templates").select("*").eq("is_active", true).order("name");
      return data || [];
    },
  });
  const { data: groups } = useQuery({
    queryKey: ["whatsapp-groups"],
    queryFn: async () => {
      const { data } = await supabase.from("whatsapp_contact_groups").select("*, whatsapp_contact_group_members(recipient_id)");
      return data || [];
    },
  });
  const { data: recipients } = useQuery({
    queryKey: ["whatsapp-recipients"],
    queryFn: async () => {
      const { data } = await supabase.from("whatsapp_recipients").select("id, name, phone").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const selectedTemplate = templates?.find((t: any) => t.id === templateId);
  const templateVars: string[] = selectedTemplate?.variables || [];

  // Render preview by replacing {var} with input values
  const previewMessage = useMemo(() => {
    return String(message || "").replace(/\{(\w+)\}/g, (_, k) => variables[k] || `{${k}}`);
  }, [message, variables]);

  const recipientCount = useMemo(() => {
    if (recipientMode === "group" && groupId) {
      const g: any = groups?.find((g: any) => g.id === groupId);
      return g?.whatsapp_contact_group_members?.length || 0;
    }
    return individualIds.length;
  }, [recipientMode, groupId, groups, individualIds]);

  const handlePickTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates?.find((t: any) => t.id === id);
    if (t) {
      setMessage(t.content);
      const initVars: Record<string, string> = {};
      (t.variables || []).forEach((v: string) => { initVars[v] = ""; });
      setVariables(initVars);
    }
  };

  const handleSend = async () => {
    if (!instanceName) return toast.error("Selecione uma instância");
    if (!message.trim()) return toast.error("Mensagem vazia");
    if (recipientCount === 0) return toast.error("Selecione ao menos um destinatário");

    setSending(true);
    try {
      const payload: any = {
        action: "sendBulk",
        instanceName,
        message,
        variables,
        templateId: templateId || null,
      };
      if (recipientMode === "group") {
        payload.groupId = groupId;
      } else {
        const phones = recipients?.filter((r: any) => individualIds.includes(r.id)).map((r: any) => r.phone) || [];
        payload.recipients = phones;
      }

      const { data, error } = await supabase.functions.invoke("whatsapp-evolution", { body: payload });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const { success = 0, failed = 0, total = 0 } = data || {};
      if (failed > 0) {
        toast.warning(`Enviado para ${success}/${total}. ${failed} falha(s).`);
      } else {
        toast.success(`Mensagem enviada para ${success} destinatário(s)!`);
      }
      qc.invalidateQueries({ queryKey: ["whatsapp-send-history"] });
      qc.invalidateQueries({ queryKey: ["whatsapp-logs"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> Compor Mensagem
          </CardTitle>
          <CardDescription>Selecione um template e os destinatários para envio manual.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Instância de Origem</Label>
            <Select value={instanceName} onValueChange={setInstanceName}>
              <SelectTrigger><SelectValue placeholder="Selecione a instância conectada" /></SelectTrigger>
              <SelectContent>
                {instances?.filter((i: any) => i.status === "connected").map((i: any) => (
                  <SelectItem key={i.id} value={i.instance_key || i.name}>
                    {i.name}
                  </SelectItem>
                ))}
                {instances?.filter((i: any) => i.status === "connected").length === 0 && (
                  <div className="p-2 text-xs text-muted-foreground">Nenhuma instância conectada.</div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Template (opcional)</Label>
            <Select value={templateId} onValueChange={handlePickTemplate}>
              <SelectTrigger><SelectValue placeholder="Escolha um template ou escreva livre" /></SelectTrigger>
              <SelectContent>
                {templates?.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {templateVars.length > 0 && (
            <div className="space-y-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <Label className="text-xs">Preencher Variáveis</Label>
              <div className="grid grid-cols-2 gap-2">
                {templateVars.map((v) => (
                  <div key={v}>
                    <Label className="text-[10px] font-mono text-muted-foreground">{`{${v}}`}</Label>
                    <Input
                      className="h-8 text-xs"
                      value={variables[v] || ""}
                      onChange={(e) => setVariables({ ...variables, [v]: e.target.value })}
                      placeholder={v}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} className="font-mono text-sm" placeholder="Digite ou escolha um template..." />
          </div>

          <Tabs value={recipientMode} onValueChange={(v) => setRecipientMode(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="group">Grupo</TabsTrigger>
              <TabsTrigger value="individual">Contatos Individuais</TabsTrigger>
            </TabsList>
            <TabsContent value="group" className="pt-3">
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger><SelectValue placeholder="Selecione um grupo" /></SelectTrigger>
                <SelectContent>
                  {groups?.map((g: any) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name} ({g.whatsapp_contact_group_members?.length || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TabsContent>
            <TabsContent value="individual" className="pt-3">
              <div className="border rounded-lg max-h-48 overflow-y-auto p-2 space-y-1">
                {recipients?.map((r: any) => {
                  const checked = individualIds.includes(r.id);
                  return (
                    <label key={r.id} className={cn("flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-muted text-sm", checked && "bg-primary/5")}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => setIndividualIds(e.target.checked ? [...individualIds, r.id] : individualIds.filter((i) => i !== r.id))}
                      />
                      <span className="flex-1">{r.name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{r.phone}</span>
                    </label>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="border-border/60 sticky top-4 self-start">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" /> Preview
          </CardTitle>
          <CardDescription>Visualize exatamente como a mensagem será enviada.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-[#e5ddd5] dark:bg-muted p-4 rounded-xl min-h-[200px] relative">
            <div className="bg-white dark:bg-card rounded-lg p-3 shadow max-w-[90%] ml-auto relative">
              <div className="text-xs whitespace-pre-wrap font-sans text-foreground">
                {previewMessage || <span className="italic text-muted-foreground">Mensagem aparecerá aqui...</span>}
              </div>
              <div className="text-[9px] text-muted-foreground text-right mt-1">
                {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} ✓✓
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/30 rounded-lg border">
              <div className="text-[10px] text-muted-foreground uppercase">Destinatários</div>
              <div className="text-2xl font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {recipientCount}
              </div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg border">
              <div className="text-[10px] text-muted-foreground uppercase">Caracteres</div>
              <div className="text-2xl font-bold">{message.length}</div>
            </div>
          </div>

          {Object.entries(variables).some(([_, v]) => !v) && templateVars.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Algumas variáveis não foram preenchidas. Aparecerão como <code>{`{nome}`}</code> na mensagem.</span>
            </div>
          )}

          <Button
            onClick={handleSend}
            disabled={sending || recipientCount === 0 || !message.trim() || !instanceName}
            className="w-full gap-2 bg-gradient-primary text-primary-foreground shadow-glow"
            size="lg"
          >
            {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar para {recipientCount} {recipientCount === 1 ? "contato" : "contatos"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
