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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateCompanyModal({ isOpen, onClose, onSuccess }: CreateCompanyModalProps) {
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !tenantId) {
      toast.error("Nome e Tenant são obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("companies").insert({
        name,
        cnpj: cnpj || null,
        tenant_id: tenantId,
        is_active: true,
        slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
      });

      if (error) throw error;

      toast.success("Empresa cadastrada com sucesso!");
      onSuccess?.();
      onClose();
      // Reset
      setName("");
      setCnpj("");
      setTenantId("");
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
          <DialogTitle className="font-display">Cadastrar Nova Empresa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
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
              ) : (
                "Cadastrar Empresa"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
