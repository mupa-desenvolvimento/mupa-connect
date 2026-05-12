import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Store, MapPin, Phone, Mail, User, Hash, AlertCircle } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StoreDetailsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  store: any | null;
  onSuccess: () => void;
}

export function StoreDetailsSheet({
  isOpen,
  onClose,
  store,
  onSuccess,
}: StoreDetailsSheetProps) {
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
  const { tenantId } = useUserRole();

  useEffect(() => {
    if (store) {
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
    }
  }, [store, isOpen]);

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

      const { error } = await supabase
        .from("stores")
        .update(payload)
        .eq("id", store.id);
      
      if (error) throw error;
      toast.success("Loja atualizada com sucesso!");

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
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl w-full flex flex-col p-0 border-l border-white/5 bg-[#02040a]">
        <SheetHeader className="p-6 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 grid place-items-center text-primary shadow-[0_0_20px_rgba(0,194,255,0.15)]">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <SheetTitle className="text-xl font-bold font-bold text-white">Detalhes da Loja</SheetTitle>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-black">Gerenciar informações da unidade</p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8 pb-20">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                <AlertCircle className="h-3 w-3" /> Informações Básicas
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-bold text-white/70">Nome da Loja</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="h-11 bg-white/[0.03] border-white/10 focus:border-primary/50 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-xs font-bold text-white/70">Código / Filial</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={handleChange}
                    className="h-11 bg-white/[0.03] border-white/10 focus:border-primary/50 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpj" className="text-xs font-bold text-white/70">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={handleChange}
                    placeholder="00.000.000/0000-00"
                    className="h-11 bg-white/[0.03] border-white/10 focus:border-primary/50 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regionalResponsavel" className="text-xs font-bold text-white/70">Responsável</Label>
                  <Input
                    id="regionalResponsavel"
                    value={formData.regionalResponsavel}
                    onChange={handleChange}
                    className="h-11 bg-white/[0.03] border-white/10 focus:border-primary/50 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                <MapPin className="h-3 w-3" /> Localização
              </h4>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-xs font-bold text-white/70">Endereço Completo</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="h-11 bg-white/[0.03] border-white/10 focus:border-primary/50 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bairro" className="text-xs font-bold text-white/70">Bairro</Label>
                  <Input
                    id="bairro"
                    value={formData.bairro}
                    onChange={handleChange}
                    className="h-11 bg-white/[0.03] border-white/10 focus:border-primary/50 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cep" className="text-xs font-bold text-white/70">CEP</Label>
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={handleChange}
                    className="h-11 bg-white/[0.03] border-white/10 focus:border-primary/50 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Contato */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                <Phone className="h-3 w-3" /> Contato Direto
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs font-bold text-white/70">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="h-11 bg-white/[0.03] border-white/10 focus:border-primary/50 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold text-white/70">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="h-11 bg-white/[0.03] border-white/10 focus:border-primary/50 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Configurações */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                <Activity className="h-3 w-3" /> Operacional
              </h4>
              <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold text-white">Loja Ativa</Label>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Visibilidade global da unidade</p>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="p-6 border-t border-white/5 bg-white/[0.02] gap-3">
          <Button variant="ghost" onClick={onClose} disabled={loading} className="h-12 px-8">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading} variant="premium" className="h-12 px-8">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar Alterações
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

import { Activity } from "lucide-react";
