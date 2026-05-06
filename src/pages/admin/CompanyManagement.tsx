import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Monitor, 
  ArrowLeft, 
  Settings, 
  Plus, 
  UserPlus, 
  Trash2,
  Mail,
  Shield,
  Loader2,
  ExternalLink
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AddUserToCompanyModal } from "@/components/super-admin/AddUserToCompanyModal";

export default function CompanyManagement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("users");
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  const handleRemoveUser = async (userId: string) => {
    if (!confirm("Tem certeza que deseja remover este usuário da empresa? Isso não excluirá a conta do usuário, apenas o vínculo com esta empresa.")) return;

    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ company_id: null }) // Or delete the record if it's purely a link record
        .eq("id", userId);

      if (error) throw error;

      toast.success("Usuário removido da empresa com sucesso");
      refetchUsers();
    } catch (error: any) {
      toast.error("Erro ao remover usuário: " + error.message);
    }
  };

  const { data: company, isLoading: isCompanyLoading } = useQuery({
    queryKey: ["company-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select(`
          *,
          tenants (name)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    }
  });

  const { data: companyUsers, isLoading: isUsersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ["company-users", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select(`
          id,
          role,
          created_at
        `)
        .eq("company_id", id);
      
      if (error) throw error;

      if (data.length === 0) return [];

      // Fetch profile details for these users
      const userIds = data.map(u => u.id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      const profileMap = (profiles || []).reduce((acc: any, p) => {
        acc[p.id] = p;
        return acc;
      }, {});

      return data.map(u => ({
        ...u,
        name: profileMap[u.id]?.full_name || "Usuário sem nome",
        email: profileMap[u.id]?.email || "sem-email@mupa.app"
      }));
    }
  });

  const { data: devices, isLoading: isDevicesLoading } = useQuery({
    queryKey: ["company-devices", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispositivos")
        .select("*")
        .eq("company_id", id);
      if (error) throw error;
      return data;
    }
  });

  if (isCompanyLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/superadmin")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={company?.name}
          description={`Gerenciamento da empresa vinculada à revenda ${company?.tenants?.name}`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{companyUsers?.length || 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dispositivos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{devices?.length || 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            {company?.is_active ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Ativo</Badge>
            ) : (
              <Badge variant="destructive">Inativo</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="flex gap-2">
            <Users className="h-4 w-4" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="devices" className="flex gap-2">
            <Monitor className="h-4 w-4" /> Dispositivos
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex gap-2">
            <Settings className="h-4 w-4" /> Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Colaboradores</CardTitle>
              <Button size="sm" className="flex gap-2" onClick={() => setIsAddUserModalOpen(true)}>
                <UserPlus className="h-4 w-4" /> Adicionar Usuário
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Data Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isUsersLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">Carregando usuários...</TableCell>
                    </TableRow>
                  ) : companyUsers?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Nenhum usuário vinculado.</TableCell>
                    </TableRow>
                  ) : companyUsers?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{user.name}</span>
                          <span className="text-[10px] text-muted-foreground">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize ${
                          user.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-blue-50 text-blue-600 border-blue-200'
                        }`}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                          onClick={() => handleRemoveUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices">
          <Card>
            <CardHeader>
              <CardTitle>Hardware Vinculado</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Apelido</TableHead>
                    <TableHead>Serial</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isDevicesLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">Carregando dispositivos...</TableCell>
                    </TableRow>
                  ) : devices?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Nenhum hardware vinculado.</TableCell>
                    </TableRow>
                  ) : devices?.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">{device.apelido_interno}</TableCell>
                      <TableCell className="font-mono text-xs">{device.serial}</TableCell>
                      <TableCell>
                        {device.online ? (
                          <Badge className="bg-emerald-500 text-white border-none">Online</Badge>
                        ) : (
                          <Badge variant="secondary">Offline</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                         <Button variant="ghost" size="icon" onClick={() => navigate(`/dispositivos/${device.id}`)}>
                            <ExternalLink className="h-4 w-4" />
                         </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Configurações da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div className="space-y-1">
                  <p className="font-medium">Status de Acesso</p>
                  <p className="text-sm text-muted-foreground">Permitir ou bloquear o acesso de todos os usuários desta empresa.</p>
                </div>
                <Button variant={company?.is_active ? "destructive" : "default"}>
                  {company?.is_active ? "Desativar Empresa" : "Ativar Empresa"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <AddUserToCompanyModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onSuccess={() => refetchUsers()}
        companyId={id!}
        tenantId={company?.tenant_id}
      />
    </div>
  );
}

function ExternalLink(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}
