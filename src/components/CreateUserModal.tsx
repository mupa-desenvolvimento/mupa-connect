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
  const [loading, setLoading] = useState(false);

  // Fetch companies for the select dropdown
  const { data: companies } = useQuery({
    queryKey: ["empresas-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("_id, nome")
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name || !companyId) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);
    try {
      // In a real multi-tenant app with admin privileges, we'd use a service role or edge function
      // Since we want to bypass email confirmation, we use signUp with auto-confirm (if configured in Supabase)
      // or we use an Edge Function. For now, we'll try standard signup.
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            company_id: companyId,
          },
        },
      });

      if (error) throw error;

      // Update the public.users table (trigger might handle this, but we ensure company mapping)
      // Note: In your schema, 'company' is a text field in public.users
      if (data.user) {
        const { error: updateError } = await supabase
          .from("users")
          .update({ 
            name: name,
            company: companyId 
          })
          .eq("id", data.user.id);
        
        if (updateError) console.error("Error updating user profile:", updateError);
      }

      toast.success("Usuário cadastrado com sucesso!");
      onSuccess?.();
      onClose();
      // Reset form
      setEmail("");
      setPassword("");
      setName("");
      setCompanyId("");
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
            <Label htmlFor="company">Empresa Vinculada</Label>
            <Select value={companyId} onValueChange={setCompanyId} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies?.map((company) => (
                  <SelectItem key={company._id} value={company._id || ""}>
                    {company.nome}
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
                "Cadastrar Usuário"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
