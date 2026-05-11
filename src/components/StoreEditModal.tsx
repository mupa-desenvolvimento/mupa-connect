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
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Store, MapPin, Phone, Mail, User, Hash } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";

interface StoreEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: any | null;
  isCreate?: boolean;
  onSuccess: () => void;
}

export function StoreEditModal({
  isOpen,
  onClose,
  store,
  isCreate = false,
  onSuccess,
}: StoreEditModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    isActive: true,
    address: "",
    phone: "",
    email: "",
    cep: "",
    bairro: "",
    cnpj: "",
    regionalResponsavel: "",
  });
  const [loading, setLoading] = useState(false);
  const { companyId, tenantId } = useUserRole();

  useEffect(() => {
    if (store && !isCreate) {
      setFormData({
        name: store.name || "",
        code: store.code || "",
        isActive: store.is_active ?? true,
        address: store.address || "",
        phone: store.phone || "",
        email: store.email || "",
        cep: store.cep || "",
        bairro: store.bairro || "",
        cnpj: store.cnpj || "",
        regionalResponsavel: store.regional_responsavel || "",
      });
    } else {
      setFormData({
        name: "",
        code: "",
        isActive: true,
        address: "",
        phone: "",
        email: "",
        cep: "",
        bairro: "",
        cnpj: "",
        regionalResponsavel: "",
      });
    }
  }, [store, isCreate, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("O nome da loja é obrigatório");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim() || null,
        is_active: formData.isActive,
        address: formData.address.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        cep: formData.cep.trim() || null,
        bairro: formData.bairro.trim() || null,
        cnpj: formData.cnpj.trim() || null,
        regional_responsavel: formData.regionalResponsavel.trim() || null,
      };

      if (isCreate) {
        const { error } = await supabase
          .from("stores")
          .insert({
            ...payload,
            tenant_id: tenantId,
          });
        if (error) throw error;
        toast.success("Loja criada com sucesso!");
      } else {
        const { error } = await supabase
          .from("stores")
          .update(payload)
          .eq("id", store.id);
        if (error) throw error;
        toast.success("Loja atualizada com sucesso!");
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error saving store:", error);
      toast.error("Erro ao salvar loja: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            {isCreate ? "Nova Loja" : "Editar Loja"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5 text-muted-foreground" />
              Nome da Loja
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ex: Loja Central"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="code" className="flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
              Código/Filial
            </Label>
            <Input
              id="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="Ex: 001 ou FIL-001"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cnpj" className="flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
              CNPJ
            </Label>
            <Input
              id="cnpj"
              value={formData.cnpj}
              onChange={handleChange}
              placeholder="00.000.000/0000-00"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="regionalResponsavel" className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Regional / Responsável
            </Label>
            <Input
              id="regionalResponsavel"
              value={formData.regionalResponsavel}
              onChange={handleChange}
              placeholder="Nome do responsável"
            />
          </div>

          <div className="md:col-span-2 border-t pt-4 mt-2">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Endereço
            </h4>
          </div>

          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="address">Logradouro / Endereço Completo</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Rua, Número, Complemento"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bairro">Bairro</Label>
            <Input
              id="bairro"
              value={formData.bairro}
              onChange={handleChange}
              placeholder="Bairro"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cep">CEP</Label>
            <Input
              id="cep"
              value={formData.cep}
              onChange={handleChange}
              placeholder="00000-000"
            />
          </div>

          <div className="md:col-span-2 border-t pt-4 mt-2">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" /> Contato
            </h4>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone" className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              Telefone
            </Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="(00) 0000-0000"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email" className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="loja@empresa.com"
            />
          </div>

          <div className="md:col-span-2 border-t pt-4 mt-2">
            <div className="flex items-center justify-between space-x-2 bg-muted/30 p-3 rounded-lg border border-border/40">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="active-status" className="cursor-pointer">Status da Loja</Label>
                <span className="text-[10px] text-muted-foreground">
                  Lojas inativas não aparecem em filtros de seleção.
                </span>
              </div>
              <Switch
                id="active-status"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-gradient-primary">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isCreate ? "Criar Loja" : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
