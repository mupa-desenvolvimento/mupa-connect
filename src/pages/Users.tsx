import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Users as UsersIcon, Mail, Shield, Trash2 } from "lucide-react";
import { CreateUserModal } from "@/components/CreateUserModal";
import { useUserRole } from "@/hooks/use-user-role";
import { toast } from "sonner";

export default function UsersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { companyId, tenantId, isAdmin, isSuperAdmin } = useUserRole();

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ["users-list", companyId, tenantId, isSuperAdmin],
    queryFn: async () => {
      let query = supabase
        .from("user_profiles")
        .select(`
          id,
          role,
          created_at,
          company_id,
          tenant_id
        `);

      if (!isSuperAdmin) {
        if (companyId) {
          query = query.eq("company_id", companyId);
        } else if (tenantId) {
          query = query.eq("tenant_id", tenantId);
        } else {
          return [];
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Buscar perfis para obter nomes e e-mails
      const userIds = data.map(u => u.id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profileMap = (profiles || []).reduce((acc: any, p) => {
        acc[p.id] = p;
        return acc;
      }, {});

      return data.map(u => ({
        ...u,
        email: profileMap[u.id]?.email || "sem-email@mupa.app",
        name: profileMap[u.id]?.full_name || "Colaborador"
      }));
    },
    enabled: (!!companyId || !!tenantId || isSuperAdmin),
  });

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("Deseja realmente remover este usuário?")) return;
    
    const { error } = await supabase.from("user_profiles").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover usuário");
    } else {
      toast.success("Usuário removido");
      refetch();
    }
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">Admin</Badge>;
      case "tecnico":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Técnico</Badge>;
      case "marketing":
        return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">Marketing</Badge>;
      default:
        return <Badge variant="outline">{role || "Usuário"}</Badge>;
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      <PageHeader
        title="Gestão de Usuários"
        description="Controle quem acessa o painel da sua empresa e quais permissões eles possuem."
        actions={
          <Button onClick={() => setIsModalOpen(true)} className="bg-gradient-primary shadow-glow h-9">
            <Plus className="h-4 w-4 mr-2" /> Novo Usuário
          </Button>
        }
      />

      <div className="flex-1 overflow-hidden border border-border/60 rounded-xl bg-card shadow-sm flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10 border-b border-border/60">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[40%]">Usuário</TableHead>
                  <TableHead>Perfil / Permissão</TableHead>
                  <TableHead>Data de Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!users || users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <UsersIcon className="h-10 w-10 opacity-20" />
                        <p>Nenhum usuário encontrado.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                            <UsersIcon className="h-4.5 w-4.5 text-primary" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground/90">{user.name}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3 opacity-60" /> {user.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Shield className="h-3.5 w-3.5 text-muted-foreground opacity-60" />
                          {getRoleBadge(user.role)}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono">
                        {new Date(user.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <CreateUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={refetch}
      />
    </div>
  );
}
