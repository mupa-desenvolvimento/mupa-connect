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
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/use-user-role";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [role, setRole] = useState("tecnico");
  const [loading, setLoading] = useState(false);
  const { companyId: currentCompanyId, isSuperAdmin, tenantId } = useUserRole();

  // Fetch companies for the select dropdown
  const { data: companies } = useQuery({
    queryKey: ["companies-list", isSuperAdmin, tenantId],
    queryFn: async () => {
      let query = supabase.from("companies").select("id, name, tenant_id");
      
      if (!isSuperAdmin && tenantId) {
        query = query.eq("tenant_id", tenantId);
      }
      
      const { data, error } = await query.order("name");
      if (error) throw error;
      return data;
    },
    enabled: isOpen && (isSuperAdmin || !!tenantId),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetCompanyId = (isSuperAdmin || tenantId) ? (companyId || currentCompanyId) : currentCompanyId;
    
    // Find the tenant_id for the selected company
    const selectedCompany = companies?.find(c => c.id === targetCompanyId);
    const targetTenantId = selectedCompany?.tenant_id || tenantId;

    if (!email || !password || !name || !targetCompanyId || !role) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!targetTenantId) {
      console.error("Erro: tenant_id não identificado para a empresa selecionada", { targetCompanyId, companies });
      toast.error("Erro: Não foi possível identificar o tenant da empresa selecionada.");
      return;
    }

    setLoading(true);
    try {
      // 1. Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // 2. Create the user profile
        const { error: profileError } = await supabase
          .from("user_profiles")
          .insert({
            id: data.user.id,
            company_id: targetCompanyId,
            tenant_id: targetTenantId,
            role: role,
          });

        if (profileError) {
          console.error("Error creating user profile:", profileError);
          toast.error("Usuário criado, mas houve erro ao definir perfil.");
        } else {
          toast.success("Usuário cadastrado com sucesso!");
        }
      }

      onSuccess?.();
      onClose();
      // Reset form
      setEmail("");
      setPassword("");
      setName("");
      setCompanyId("");
      setRole("tecnico");
    } catch (error: any) {
      toast.error(error.message || "Erro ao cadastrar usuário");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-display">Cadastrar Novo Usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo</Label>
            <Input
              id="name"
              placeholder="Ex: João Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="******"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Perfil de Acesso</Label>
            <Select value={role} onValueChange={setRole} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um perfil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="tecnico">Técnico</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(isSuperAdmin || tenantId) && (
            <div className="space-y-2">
              <Label htmlFor="company">Empresa Vinculada</Label>
              <Select value={companyId} onValueChange={setCompanyId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies?.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
                "Cadastrar Usuário"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
