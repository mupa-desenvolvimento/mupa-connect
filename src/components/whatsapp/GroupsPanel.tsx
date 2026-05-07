import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Users, MoreVertical, Pencil, Trash2, RefreshCw, CheckCircle2, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export function GroupsPanel() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    id: "",
    name: "",
    description: "",
    color: COLORS[0],
    memberIds: [] as string[],
  });

  const { data: groups } = useQuery({
    queryKey: ["whatsapp-groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_contact_groups")
        .select("*, whatsapp_contact_group_members(recipient_id, whatsapp_recipients(id, name, phone))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: recipients } = useQuery({
    queryKey: ["whatsapp-recipients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("whatsapp_recipients").select("id, name, phone").order("name");
      if (error) throw error;
      return data;
    },
  });

  const reset = () => setForm({ id: "", name: "", description: "", color: COLORS[0], memberIds: [] });

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Nome obrigatório");
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        color: form.color,
      };
      let groupId = form.id;
      if (form.id) {
        const { error } = await supabase.from("whatsapp_contact_groups").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("whatsapp_contact_groups").insert(payload).select("id").single();
        if (error) throw error;
        groupId = data.id;
      }

      // Replace members
      await supabase.from("whatsapp_contact_group_members").delete().eq("group_id", groupId);
      if (form.memberIds.length > 0) {
        const rows = form.memberIds.map((rid) => ({ group_id: groupId, recipient_id: rid }));
        const { error: mErr } = await supabase.from("whatsapp_contact_group_members").insert(rows);
        if (mErr) throw mErr;
      }

      toast.success(form.id ? "Grupo atualizado" : "Grupo criado");
      setOpen(false);
      reset();
      qc.invalidateQueries({ queryKey: ["whatsapp-groups"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este grupo?")) return;
    const { error } = await supabase.from("whatsapp_contact_groups").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Grupo removido");
    qc.invalidateQueries({ queryKey: ["whatsapp-groups"] });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center gap-4 bg-card p-4 rounded-xl border border-border/60">
        <div>
          <h3 className="font-semibold">Grupos de Contatos</h3>
          <p className="text-xs text-muted-foreground">Organize destinatários em grupos para envios em massa.</p>
        </div>
        <Button onClick={() => { reset(); setOpen(true); }} className="gap-2 bg-gradient-primary text-primary-foreground">
          <Plus className="h-4 w-4" /> Novo Grupo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups?.map((g: any) => {
          const members = g.whatsapp_contact_group_members || [];
          return (
            <Card key={g.id} className="border-border/60 hover:shadow-lg transition-all overflow-hidden">
              <div className="h-1.5" style={{ background: g.color }} />
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: `${g.color}22` }}>
                      <Users className="h-4 w-4" style={{ color: g.color }} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{g.name}</CardTitle>
                      <CardDescription className="text-xs">{members.length} {members.length === 1 ? "contato" : "contatos"}</CardDescription>
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
                          id: g.id,
                          name: g.name,
                          description: g.description || "",
                          color: g.color || COLORS[0],
                          memberIds: members.map((m: any) => m.recipient_id),
                        });
                        setOpen(true);
                      }}>
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(g.id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {g.description && <p className="text-xs text-muted-foreground mt-2">{g.description}</p>}
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-hidden">
                  {members.slice(0, 8).map((m: any) => (
                    <Badge key={m.recipient_id} variant="outline" className="text-[10px]">
                      {m.whatsapp_recipients?.name || m.recipient_id.slice(0, 6)}
                    </Badge>
                  ))}
                  {members.length > 8 && (
                    <Badge variant="secondary" className="text-[10px]">+{members.length - 8}</Badge>
                  )}
                  {members.length === 0 && (
                    <span className="text-[10px] italic text-muted-foreground">Nenhum membro adicionado.</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(!groups || groups.length === 0) && (
          <div className="col-span-full p-12 text-center border-2 border-dashed rounded-xl text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum grupo criado ainda.</p>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar Grupo" : "Novo Grupo"}</DialogTitle>
            <DialogDescription>Agrupe contatos para facilitar envios direcionados.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Suporte Loja 047" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Opcional" />
            </div>
            <div className="space-y-2">
              <Label>Cor de identificação</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={cn("h-8 w-8 rounded-lg transition-all hover:scale-110", form.color === c && "ring-2 ring-offset-2 ring-primary")}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" /> Membros ({form.memberIds.length} selecionados)
              </Label>
              <div className="border rounded-lg max-h-56 overflow-y-auto p-2 space-y-1">
                {recipients?.map((r: any) => {
                  const checked = form.memberIds.includes(r.id);
                  return (
                    <label key={r.id} className={cn("flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted", checked && "bg-primary/5")}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setForm({
                            ...form,
                            memberIds: e.target.checked
                              ? [...form.memberIds, r.id]
                              : form.memberIds.filter((id) => id !== r.id),
                          });
                        }}
                      />
                      <span className="text-sm flex-1">{r.name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{r.phone}</span>
                    </label>
                  );
                })}
                {(!recipients || recipients.length === 0) && (
                  <p className="text-xs text-muted-foreground italic p-3 text-center">Cadastre destinatários primeiro.</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary text-primary-foreground">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Salvar Grupo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
