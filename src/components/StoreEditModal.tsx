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
import { Loader2, Store } from "lucide-react";

interface StoreEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: {
    id: string;
    name: string;
    code: string | null;
    is_active: boolean;
  } | null;
  onSuccess: () => void;
}

export function StoreEditModal({
  isOpen,
  onClose,
  store,
  onSuccess,
}: StoreEditModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (store) {
      setName(store.name || "");
      setCode(store.code || "");
      setIsActive(store.is_active ?? true);
    }
  }, [store, isOpen]);

  const handleSave = async () => {
    if (!store?.id) return;
    if (!name.trim()) {
      toast.error("O nome da loja é obrigatório");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("stores")
        .update({
          name: name.trim(),
          code: code.trim() || null,
          is_active: isActive,
        })
        .eq("id", store.id);

      if (error) throw error;

      toast.success("Loja atualizada com sucesso!");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error updating store:", error);
      toast.error("Erro ao atualizar loja: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Editar Loja
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome da Loja</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Loja Central"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="code">Código/Filial</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex: 001 ou FIL-001"
            />
            <p className="text-[10px] text-muted-foreground">
              Este código é usado para vincular dispositivos automaticamente.
            </p>
          </div>
          <div className="flex items-center justify-between space-x-2 bg-muted/30 p-3 rounded-lg border border-border/40">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="active-status" className="cursor-pointer">Status da Loja</Label>
              <span className="text-[10px] text-muted-foreground">
                Lojas inativas não aparecem em filtros de seleção.
              </span>
            </div>
            <Switch
              id="active-status"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-gradient-primary">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
