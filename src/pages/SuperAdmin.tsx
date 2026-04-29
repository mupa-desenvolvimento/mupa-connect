import { useEffect, useState } from "react";
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
  Edit
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { CreateUserModal } from "@/components/CreateUserModal";

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    tenants: 0,
    companies: 0,
    users: 0,
    devices: 0
  });
  const [loading, setLoading] = useState(true);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [
          { count: tenantCount },
          { count: companyCount },
          { count: userCount },
          { count: deviceCount }
        ] = await Promise.all([
          supabase.from("tenants").select("*", { count: "exact", head: true }),
          supabase.from("empresas").select("*", { count: "exact", head: true }),
          supabase.from("users").select("*", { count: "exact", head: true }),
          supabase.from("dispositivos").select("*", { count: "exact", head: true })
        ]);

        setStats({
          tenants: tenantCount || 0,
          companies: companyCount || 0,
          users: userCount || 0,
          devices: deviceCount || 0
        });
      } catch (error) {
        console.error("Error fetching superadmin stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <>
      <PageHeader
        title="Painel SuperAdmin"
        description="Gestão global da rede Mupa 3.0"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="flex gap-2">
              <Building2 className="h-4 w-4" /> Nova Revenda
            </Button>
            <Button className="bg-gradient-primary text-primary-foreground flex gap-2">
              <Plus className="h-4 w-4" /> Nova Empresa
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Revendas (Tenants)", value: stats.tenants, icon: ShieldCheck, color: "text-blue-500" },
          { label: "Empresas", value: stats.companies, icon: Building2, color: "text-purple-500" },
          { label: "Usuários", value: stats.users, icon: UserPlus, color: "text-green-500" },
          { label: "Dispositivos", value: stats.devices, icon: Store, color: "text-orange-500" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
                  <p className="text-3xl font-bold mt-1">{loading ? "..." : s.value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-muted ${s.color}`}>
                  <s.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-display">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button variant="outline" className="h-24 flex flex-col gap-2 border-dashed">
              <UserPlus className="h-6 w-6" />
              <span>Cadastrar Usuário</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2 border-dashed">
              <Building2 className="h-6 w-6" />
              <span>Cadastrar Empresa</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2 border-dashed">
              <ShieldCheck className="h-6 w-6" />
              <span>Gerenciar Revendas</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2 border-dashed">
              <Edit className="h-6 w-6" />
              <span>Vincular Usuário</span>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-display">Últimos Cadastros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    SC
                  </div>
                  <div>
                    <p className="text-sm font-medium">Stock Center</p>
                    <p className="text-xs text-muted-foreground">Empresa · Passo Fundo</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Ativo</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50 opacity-60">
                <p className="text-sm text-muted-foreground italic">Mais dados em breve...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
