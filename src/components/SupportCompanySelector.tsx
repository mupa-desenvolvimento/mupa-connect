import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Building2, ChevronDown, Loader2, Search } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { Input } from "@/components/ui/input";

export function SupportCompanySelector() {
  const { isSupport, companyId, setSupportContext } = useUserRole();
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  
  const currentCompany = companies.find(c => c.id === companyId);

  useEffect(() => {
    if (!isSupport) return;

    async function fetchCompanies() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, tenant_id")
        .order("name");
      
      if (!error && data) {
        setCompanies(data);
      }
      setIsLoading(false);
    }

    fetchCompanies();
  }, [isSupport]);

  if (!isSupport) return null;

  const filteredCompanies = companies.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2 bg-background/50 border-primary/20 hover:border-primary/50 text-xs">
          <Building2 className="h-3.5 w-3.5 text-primary" />
          <span className="max-w-[120px] truncate">
            {currentCompany?.name || "Selecionar Empresa"}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Empresa Atual</span>
          {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
        </DropdownMenuLabel>
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input 
              placeholder="Buscar empresa..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto">
          {filteredCompanies.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              Nenhuma empresa encontrada
            </div>
          ) : (
            filteredCompanies.map((company) => (
              <DropdownMenuItem 
                key={company.id}
                onClick={() => setSupportContext(company.id, company.tenant_id)}
                className={`flex flex-col items-start gap-0.5 cursor-pointer ${company.id === companyId ? 'bg-accent' : ''}`}
              >
                <span className="font-medium text-sm">{company.name}</span>
                <span className="text-[10px] text-muted-foreground font-mono">ID: {company.id.split('-')[0]}...</span>
              </DropdownMenuItem>
            ))
          )}
        </div>
        {companyId && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setSupportContext(null, null)}
              className="text-destructive focus:text-destructive justify-center text-xs font-semibold"
            >
              Limpar Seleção
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}