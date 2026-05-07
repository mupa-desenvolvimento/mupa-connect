import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, FileText, MoreVertical, Pencil, Trash2, Sparkles, RefreshCw, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "suporte", label: "Suporte", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  { value: "monitoramento", label: "Monitoramento", color: "bg-purple-500/10 text-purple-600 border-purple-200" },
  { value: "incidente", label: "Incidente", color: "bg-red-500/10 text-red-600 border-red-200" },
  { value: "manutencao", label: "Manutenção", color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  { value: "comercial", label: "Comercial", color: "bg-green-500/10 text-green-600 border-green-200" },
  { value: "atualizacao", label: "Atualização", color: "bg-indigo-500/10 text-indigo-600 border-indigo-200" },
  { value: "alerta", label: "Alerta Preventivo", color: "bg-orange-500/10 text-orange-600 border-orange-200" },
];

const VARIABLE_HINTS = ["empresa", "loja", "dispositivo", "status", "tempo_offline", "data", "hora"];

export function TemplatesPanel() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [form, setForm] = useState({
    id: "",
    name: "",
    category: "suporte",
    description: "",
    content: "",
    is_active: true,
  });

  const { data: templates } = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = templates?.filter((t: any) => filter === "all" || t.category === filter);

  // Extract variables from content using {var} syntax
  const extractVars = (text: string) => {
    const matches = text.matchAll(/\{(\w+)\}/g);
    return Array.from(new Set(Array.from(matches, (m) => m[1])));
  };

  const reset = () => setForm({ id: "", name: "", category: "suporte", description: "", content: "", is_active: true });

  const insertVariable = (v: string) => {
    setForm((f) => ({ ...f, content: f.content + `{${v}}` }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.content.trim()) return toast.error("Nome e conteúdo são obrigatórios");
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        description: form.description.trim() || null,
        content: form.content.trim(),
        variables: extractVars(form.content),
        is_active: form.is_active,
      };
      if (form.id) {
        const { error } = await supabase.from("whatsapp_templates").update(payload).eq("id", form.id);
        if (error) throw error;
        toast.success("Template atualizado");
      } else {
        const { error } = await supabase.from("whatsapp_templates").insert(payload);
        if (error) throw error;
        toast.success("Template criado");
      }
      setOpen(false);
      reset();
      qc.invalidateQueries({ queryKey: ["whatsapp-templates"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este template?")) return;
    const { error } = await supabase.from("whatsapp_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Template removido");
    qc.invalidateQueries({ queryKey: ["whatsapp-templates"] });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap justify-between items-center gap-4 bg-card p-4 rounded-xl border border-border/60">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            Todos
          </Button>
          {CATEGORIES.map((c) => (
            <Button
              key={c.value}
              size="sm"
              variant={filter === c.value ? "default" : "outline"}
              onClick={() => setFilter(c.value)}
            >
              {c.label}
            </Button>
          ))}
        </div>
        <Button onClick={() => { reset(); setOpen(true); }} className="gap-2 bg-gradient-primary text-primary-foreground">
          <Plus className="h-4 w-4" /> Novo Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered?.map((t: any) => {
          const cat = CATEGORIES.find((c) => c.value === t.category);
          return (
            <Card key={t.id} className="border-border/60 hover:shadow-lg transition-all hover-scale">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{t.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={cn("text-[10px] py-0 h-5", cat?.color)}>
                        {cat?.label || "Geral"}
                      </Badge>
                      {!t.is_active && (
                        <Badge variant="outline" className="text-[10px] py-0 h-5 bg-muted text-muted-foreground">
                          Inativo
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setForm({
                          id: t.id,
                          name: t.name,
                          category: t.category || "suporte",
                          description: t.description || "",
                          content: t.content,
                          is_active: t.is_active ?? true,
                        });
                        setOpen(true);
                      }}>
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {t.description && <CardDescription className="text-xs mt-1 line-clamp-1">{t.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="bg-muted/40 border rounded-lg p-3 text-xs text-muted-foreground italic line-clamp-5 whitespace-pre-wrap font-mono">
                  {t.content}
                </div>
                {t.variables?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {t.variables.map((v: string) => (
                      <Badge key={v} variant="secondary" className="text-[10px] py-0 h-4 font-mono">
                        {`{${v}}`}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {(!filtered || filtered.length === 0) && (
          <div className="col-span-full p-12 text-center border-2 border-dashed rounded-xl text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum template encontrado.</p>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {form.id ? "Editar Template" : "Novo Template"}
            </DialogTitle>
            <DialogDescription>
              Crie mensagens reutilizáveis com variáveis dinâmicas. Use <code className="text-primary">{`{variavel}`}</code> para substituir valores no envio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Alerta Preventivo" />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Para que serve este template?" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Conteúdo da Mensagem</Label>
                <span className="text-[10px] text-muted-foreground">{form.content.length} caracteres</span>
              </div>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={8}
                className="font-mono text-sm"
                placeholder={"⚠️ ALERTA PREVENTIVO\n\nEmpresa: {empresa}\nLoja: {loja}\n\nO dispositivo {dispositivo} está offline há {tempo_offline}."}
              />
              <div className="flex flex-wrap gap-1 pt-1">
                <span className="text-[10px] text-muted-foreground self-center mr-1">Inserir variável:</span>
                {VARIABLE_HINTS.map((v) => (
                  <Button key={v} type="button" variant="outline" size="sm" className="h-6 text-[10px] font-mono" onClick={() => insertVariable(v)}>
                    {`{${v}}`}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <Label className="text-sm">Template ativo</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary text-primary-foreground">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
