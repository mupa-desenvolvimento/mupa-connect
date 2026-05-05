import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Download, Settings2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ValidationStatus = "valid" | "no_match" | "divergent";

interface DeviceValidation {
  id: number;
  apelido_interno: string;
  num_filial: string;
  current_tenant_id: string | null;
  current_company_id: string | null;
  store_code: string | null;
  expected_tenant: string | null;
  expected_company: string | null;
  status: ValidationStatus;
}

export default function DeviceValidationPage() {
  const [filter, setFilter] = useState<"all" | ValidationStatus>("all");

  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ["device-validation-report"],
    queryFn: async () => {
      // Fetch all devices with store and company info
      const { data: devices, error: devError } = await supabase
        .from("dispositivos")
        .select(`
          id,
          apelido_interno,
          num_filial,
          tenant_id,
          company_id
        `);

      if (devError) throw devError;

      const { data: stores, error: storeError } = await supabase
        .from("stores")
        .select("code, tenant_id");
      
      if (storeError) throw storeError;

      const { data: companies, error: compError } = await supabase
        .from("companies")
        .select("id, tenant_id");

      if (compError) throw compError;

      const normalize = (val: string | null) => 
        val ? val.replace(/^0+/, '').replace(/\s+/g, '').replace(/FIL-/gi, '') : '';

      const validationData: DeviceValidation[] = devices.map(d => {
        const normalizedFilial = normalize(d.num_filial);
        
        const matchingStore = stores.find(s => normalize(s.code) === normalizedFilial);
        
        const expectedTenant = matchingStore?.tenant_id || null;
        const matchingCompany = companies.find(c => c.tenant_id === expectedTenant);
        const expectedCompany = matchingCompany?.id || null;

        let status: ValidationStatus = "valid";
        if (!matchingStore) {
          status = "no_match";
        } else if (d.tenant_id !== expectedTenant || d.company_id !== expectedCompany) {
          status = "divergent";
        }

        return {
          id: d.id,
          apelido_interno: d.apelido_interno || "Sem nome",
          num_filial: d.num_filial || "N/A",
          current_tenant_id: d.tenant_id,
          current_company_id: d.company_id,
          store_code: matchingStore?.code || null,
          expected_tenant: expectedTenant,
          expected_company: expectedCompany,
          status
        };
      });

      return validationData;
    }
  });

  const filteredData = report?.filter(item => filter === "all" || item.status === filter) || [];

  const handleFixDivergent = async () => {
    const divergent = report?.filter(i => i.status === "divergent") || [];
    if (divergent.length === 0) {
      toast.info("Nenhum dispositivo divergente para corrigir.");
      return;
    }

    const fixPromise = Promise.all(divergent.map(item => 
      supabase.from("dispositivos")
        .update({ 
          tenant_id: item.expected_tenant, 
          company_id: item.expected_company 
        })
        .eq("id", item.id)
    ));

    toast.promise(fixPromise, {
      loading: 'Corrigindo dispositivos...',
      success: 'Dispositivos atualizados com sucesso!',
      error: 'Erro ao corrigir alguns dispositivos.',
    });
    
    await fixPromise;
    refetch();
  };

  const exportCSV = () => {
    if (!report) return;
    const headers = ["ID", "Nome", "Filial", "Tenant Atual", "Tenant Esperado", "Status"];
    const rows = report.map(i => [
      i.id, 
      i.apelido_interno, 
      i.num_filial, 
      i.current_tenant_id || "NULO", 
      i.expected_tenant || "N/A", 
      i.status
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "validacao_dispositivos.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader 
        title="Validação de Dispositivos" 
        description="Auditoria global de vínculos entre terminais, lojas e tenants."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" /> Exportar
            </Button>
            <Button size="sm" className="bg-primary shadow-glow" onClick={handleFixDivergent}>
              <Settings2 className="h-4 w-4 mr-2" /> Corrigir Divergentes
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setFilter("all")}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{report?.length || 0}</div>
            <div className="text-xs text-muted-foreground uppercase font-semibold">Total</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-green-500 transition-colors" onClick={() => setFilter("valid")}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">{report?.filter(i => i.status === "valid").length || 0}</div>
            <div className="text-xs text-muted-foreground uppercase font-semibold">Válidos</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-yellow-500 transition-colors" onClick={() => setFilter("no_match")}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-500">{report?.filter(i => i.status === "no_match").length || 0}</div>
            <div className="text-xs text-muted-foreground uppercase font-semibold">Sem Loja</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-red-500 transition-colors" onClick={() => setFilter("divergent")}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-500">{report?.filter(i => i.status === "divergent").length || 0}</div>
            <div className="text-xs text-muted-foreground uppercase font-semibold">Divergentes</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dispositivo</TableHead>
              <TableHead>Filial</TableHead>
              <TableHead>Tenant Atual</TableHead>
              <TableHead>Loja/Tenant Esperado</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto opacity-50" />
                </TableCell>
              </TableRow>
            ) : filteredData.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  <div>{item.apelido_interno}</div>
                  <div className="text-[10px] text-muted-foreground">ID: {item.id}</div>
                </TableCell>
                <TableCell>{item.num_filial}</TableCell>
                <TableCell className="text-xs font-mono">{item.current_tenant_id?.substring(0, 8)}...</TableCell>
                <TableCell>
                  {item.store_code ? (
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold">{item.store_code}</span>
                      <span className="text-[10px] font-mono opacity-60">{item.expected_tenant?.substring(0, 8)}...</span>
                    </div>
                  ) : (
                    <span className="text-xs text-red-400 font-italic italic">Nenhuma loja encontrada</span>
                  )}
                </TableCell>
                <TableCell>
                  {item.status === "valid" && (
                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" /> Válido</Badge>
                  )}
                  {item.status === "no_match" && (
                    <Badge variant="outline" className="text-yellow-500 border-yellow-500/20"><AlertTriangle className="h-3 w-3 mr-1" /> Sem Correspondência</Badge>
                  )}
                  {item.status === "divergent" && (
                    <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="h-3 w-3 mr-1" /> Divergente</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}