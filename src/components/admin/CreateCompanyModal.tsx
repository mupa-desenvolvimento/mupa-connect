import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function slugify(input: string) {
  return (input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function CreateCompanyModal({ isOpen, onClose, onSuccess }: CreateCompanyModalProps) {
  const [mode, setMode] = useState<"provision" | "existing">("provision");
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [loading, setLoading] = useState(false);
  const [tenantName, setTenantName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState("");

  const { data: tenants } = useQuery({
    queryKey: ["tenants-list-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen) return;
    setMode("provision");
    setName("");
    setCnpj("");
    setTenantId("");
    setTenantName("");
    setTenantSlug("");
    setAdminName("");
    setAdminEmail("");
    setAdminPassword("");
    setAdminPasswordConfirm("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!tenantName) setTenantName(name);
    if (!tenantSlug) setTenantSlug(slugify(tenantName || name));
  }, [isOpen, name, tenantName, tenantSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      if (mode === "existing") {
        if (!name || !tenantId) {
          toast.error("Nome e Tenant são obrigatórios");
          return;
        }

        const { error } = await supabase.from("companies").insert({
          name,
          cnpj: cnpj || null,
          tenant_id: tenantId,
          is_active: true,
          slug: slugify(name),
        });

        if (error) throw error;
        toast.success("Empresa cadastrada com sucesso!");
      } else {
        const resolvedTenantName = (tenantName || name).trim();
        const resolvedTenantSlug = slugify(tenantSlug || resolvedTenantName);

        if (!name || !resolvedTenantName || !adminEmail || !adminPassword) {
          toast.error("Preencha os campos obrigatórios");
          return;
        }

        if (adminPassword !== adminPasswordConfirm) {
          toast.error("As senhas não conferem");
          return;
        }

        const { data, error } = await supabase.functions.invoke("provision-company", {
          body: {
            tenant: { name: resolvedTenantName, slug: resolvedTenantSlug || undefined },
            company: { name, cnpj: cnpj || null },
            adminUser: {
              email: adminEmail,
              password: adminPassword,
              full_name: adminName || undefined,
            },
          },
        });

        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);

        toast.success("Empresa provisionada com sucesso!");
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Erro ao cadastrar empresa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-bold">Cadastrar Nova Empresa</DialogTitle>
        </DialogHeader>
        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)} className="py-2">
          <TabsList className="w-full">
            <TabsTrigger value="provision" className="flex-1">Completo</TabsTrigger>
            <TabsTrigger value="existing" className="flex-1">Só Empresa</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <TabsContent value="provision" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="company_name">Nome da Empresa</Label>
                <Input
                  id="company_name"
                  placeholder="Ex: Mupa Mídias"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ (Opcional)</Label>
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenant_name">Nome do Tenant</Label>
                <Input
                  id="tenant_name"
                  placeholder="Ex: Revenda ACME"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenant_slug">Slug do Tenant</Label>
                <Input
                  id="tenant_slug"
                  placeholder="ex: revenda-acme"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin_name">Nome do Admin</Label>
                <Input
                  id="admin_name"
                  placeholder="Ex: João Silva"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin_email">Email do Admin</Label>
                <Input
                  id="admin_email"
                  type="email"
                  placeholder="admin@empresa.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="admin_password">Senha</Label>
                  <Input
                    id="admin_password"
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin_password_confirm">Confirmar</Label>
                  <Input
                    id="admin_password_confirm"
                    type="password"
                    value={adminPasswordConfirm}
                    onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                    required
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="existing" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="company_name_existing">Nome da Empresa</Label>
                <Input
                  id="company_name_existing"
                  placeholder="Ex: Mupa Mídias"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj_existing">CNPJ (Opcional)</Label>
                <Input
                  id="cnpj_existing"
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenant">Tenant (Revenda/Dono)</Label>
                <Select value={tenantId} onValueChange={setTenantId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-gradient-primary" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cadastrando...
                  </>
                ) : mode === "provision" ? (
                  "Provisionar Empresa"
                ) : (
                  "Cadastrar Empresa"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
