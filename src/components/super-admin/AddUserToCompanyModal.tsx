import { useState } from "react";
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
import { Loader2, Search, UserCheck } from "lucide-react";

interface AddUserToCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  companyId: string;
  tenantId?: string;
}

export function AddUserToCompanyModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  companyId,
  tenantId 
}: AddUserToCompanyModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("operador");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<{id: string, full_name: string, email: string} | null>(null);

  const handleSearch = async () => {
    if (!email) return;
    setSearching(true);
    setFoundUser(null);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("email", email.toLowerCase().trim())
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          toast.error("Usuário não encontrado com este e-mail.");
        } else {
          throw error;
        }
      } else {
        setFoundUser(data);
      }
    } catch (error: any) {
      toast.error("Erro ao buscar usuário: " + error.message);
    } finally {
      setSearching(false);
    }
  };

  const handleLinkUser = async () => {
    if (!foundUser || !companyId) return;

    setLoading(true);
    try {
      // Check if user already has a profile/company association
      const { data: existingProfile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", foundUser.id)
        .single();

      if (existingProfile) {
        // Update existing association
        const { error } = await supabase
          .from("user_profiles")
          .update({
            company_id: companyId,
            role: role,
            tenant_id: tenantId || existingProfile.tenant_id
          })
          .eq("id", foundUser.id);

        if (error) throw error;
      } else {
        // Create new association
        const { error } = await supabase
          .from("user_profiles")
          .insert({
            id: foundUser.id,
            company_id: companyId,
            role: role,
            tenant_id: tenantId
          });

        if (error) throw error;
      }

      toast.success(`Usuário ${foundUser.full_name} vinculado com sucesso!`);
      onSuccess?.();
      onClose();
      // Reset
      setEmail("");
      setFoundUser(null);
    } catch (error: any) {
      toast.error("Erro ao vincular usuário: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-bold">Vincular Usuário à Empresa</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="search-email">Buscar por E-mail</Label>
            <div className="flex gap-2">
              <Input
                id="search-email"
                placeholder="usuario@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button size="icon" onClick={handleSearch} disabled={searching}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {foundUser && (
            <div className="p-4 border rounded-lg bg-emerald-50/50 border-emerald-100 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-900">{foundUser.full_name}</p>
                  <p className="text-xs text-emerald-700">{foundUser.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-select">Atribuir Perfil</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role-select" className="bg-white">
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador (Empresa)</SelectItem>
                    <SelectItem value="operador">Operador / Técnico</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-2" onClick={handleLinkUser} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirmar Vínculo"}
              </Button>
            </div>
          )}

          {!foundUser && !searching && email && (
             <div className="text-center py-2">
               <p className="text-sm text-muted-foreground">O usuário deve possuir uma conta no sistema para ser vinculado.</p>
             </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
