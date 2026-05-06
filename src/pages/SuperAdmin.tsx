import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Building2, 
  UserPlus, 
  MoreVertical, 
  ShieldCheck, 
  Store,
  ExternalLink,
  Edit,
  Users,
  CheckCircle2,
  XCircle,
  Filter,
  Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateUserModal } from "@/components/CreateUserModal";
import { CreateCompanyModal } from "@/components/admin/CreateCompanyModal";
import { useQuery } from "@tanstack/react-query";

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  // Fetch stats
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["superadmin-stats"],
    queryFn: async () => {
      const [
        { count: tenantCount },
        { count: companyCount },
        { count: userCount },
        { count: deviceCount },
        { count: onlineCount }
      ] = await Promise.all([
        supabase.from("tenants").select("*", { count: "exact", head: true }),
        supabase.from("companies").select("*", { count: "exact", head: true }),
        supabase.from("user_profiles").select("*", { count: "exact", head: true }),
        supabase.from("dispositivos").select("*", { count: "exact", head: true }),
        supabase.from("dispositivos").select("*", { count: "exact", head: true }).eq('online', true)
      ]);

      return {
        tenants: tenantCount || 0,
        companies: companyCount || 0,
        users: userCount || 0,
        devices: deviceCount || 0,
        online: onlineCount || 0
      };
    }
  });

  // Fetch Companies
  const { data: companies, isLoading: isCompaniesLoading, refetch: refetchCompanies } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select(`
          *,
          tenants (name),
          user_profiles (count),
          dispositivos (count)
        `);
      if (error) throw error;
      return data;
    }
  });

  const filteredCompanies = companies?.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.cnpj?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel Central Multiempresa"
        description="Gestão global de infraestrutura, empresas e usuários"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="flex gap-2" onClick={() => setIsUserModalOpen(true)}>
              <UserPlus className="h-4 w-4" /> Novo Usuário
            </Button>
            <Button className="bg-gradient-primary text-primary-foreground flex gap-2" onClick={() => setIsCompanyModalOpen(true)}>
              <Plus className="h-4 w-4" /> Nova Empresa
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Revendas (Tenants)", value: stats?.tenants, icon: ShieldCheck, color: "text-blue-500" },
          { label: "Empresas", value: stats?.companies, icon: Building2, color: "text-[#085CF0]" },
          { label: "Usuários Totais", value: stats?.users, icon: Users, color: "text-green-500" },
          { label: "Dispositivos", value: stats?.devices, icon: Store, color: "text-orange-500" },
          { label: "Online Agora", value: stats?.online, icon: CheckCircle2, color: "text-emerald-500" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{isStatsLoading ? "..." : s.value}</p>
                </div>
                <div className={`p-2.5 rounded-xl bg-muted/50 ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="companies" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="companies" className="flex gap-2">
            <Building2 className="h-4 w-4" /> Empresas
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex gap-2">
            <Activity className="h-4 w-4" /> Atividade Global
          </TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="space-y-4">
          <Card>
            <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar empresa ou CNPJ..." 
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Revenda (Tenant)</TableHead>
                    <TableHead className="text-center">Usuários</TableHead>
                    <TableHead className="text-center">Dispositivos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isCompaniesLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">Carregando empresas...</TableCell>
                    </TableRow>
                  ) : filteredCompanies?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Nenhuma empresa encontrada.</TableCell>
                    </TableRow>
                  ) : filteredCompanies?.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold">{company.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase font-mono">{company.cnpj || "Sem CNPJ"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal bg-blue-50/50 text-blue-600 border-blue-200">
                          {company.tenants?.name || "Global"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {company.user_profiles?.[0]?.count || 0}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {company.dispositivos?.[0]?.count || 0}
                      </TableCell>
                      <TableCell>
                        {company.is_active ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">Ativo</Badge>
                        ) : (
                          <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/superadmin/companies/${company.id}`)}>
                              <ExternalLink className="h-4 w-4 mr-2" /> Gerenciar Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" /> Editar Cadastro
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              {company.is_active ? "Desativar Empresa" : "Ativar Empresa"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity">
           <Card>
            <CardHeader>
              <CardTitle className="text-lg">Atividade Recente do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground italic">Logs globais de auditoria serão exibidos aqui.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateUserModal 
        isOpen={isUserModalOpen} 
        onClose={() => setIsUserModalOpen(false)} 
        onSuccess={() => refetchCompanies()}
      />

      <CreateCompanyModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        onSuccess={() => {
          refetchCompanies();
        }}
      />
    </div>
  );
}
