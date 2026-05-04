import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Download, 
  Trash2, 
  Smartphone, 
  Globe,
  Loader2,
  FileText,
  Building2,
  X
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

export default function AppsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newApp, setNewApp] = useState({
    name: "",
    version: "",
    description: "",
    file: null as File | null,
    selectedCompanies: [] as string[]
  });

  const queryClient = useQueryClient();

  // Fetch apps
  const { data: apps, isLoading: isLoadingApps } = useQuery({
    queryKey: ["apps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apps")
        .select(`
          *,
          app_companies (
            company_id,
            companies (name)
          )
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch companies
  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .order("name");
      
      if (error) throw error;
      return data;
    }
  });

  const uploadAppMutation = useMutation({
    mutationFn: async () => {
      if (!newApp.file || !newApp.name || !newApp.version) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

      setIsUploading(true);

      try {
        const fileExt = newApp.file.name.split(".").pop();
        if (fileExt !== "apk") {
          throw new Error("Apenas arquivos .apk são permitidos");
        }

        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `apks/${fileName}`;

        // Upload file to storage
        const { error: uploadError } = await supabase.storage
          .from("apks")
          .upload(filePath, newApp.file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("apks")
          .getPublicUrl(filePath);

        // Save to database
        const { data: appData, error: dbError } = await supabase
          .from("apps")
          .insert({
            name: newApp.name,
            version: newApp.version,
            description: newApp.description,
            file_url: publicUrl,
            file_size: newApp.file.size
          })
          .select()
          .single();

        if (dbError) throw dbError;

        // Link to companies
        if (newApp.selectedCompanies.length > 0) {
          const { error: linkError } = await supabase
            .from("app_companies")
            .insert(
              newApp.selectedCompanies.map(companyId => ({
                app_id: appData.id,
                company_id: companyId
              }))
            );
          
          if (linkError) throw linkError;
        }

        return appData;
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      toast.success("Aplicativo enviado com sucesso!");
      setIsModalOpen(false);
      setNewApp({ name: "", version: "", description: "", file: null, selectedCompanies: [] });
      queryClient.invalidateQueries({ queryKey: ["apps"] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao enviar: ${error.message}`);
    }
  });

  const deleteAppMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("apps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aplicativo removido");
      queryClient.invalidateQueries({ queryKey: ["apps"] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover: ${error.message}`);
    }
  });

  const filteredApps = apps?.filter(app => 
    app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.version.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <PageHeader
        title="Gerenciamento de Aplicativos"
        description="Controle de versões APK e distribuição por empresa."
        actions={
          <Button 
            className="bg-gradient-primary text-primary-foreground flex gap-2"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="h-4 w-4" /> Novo APK
          </Button>
        }
      />

      <div className="flex items-center gap-2 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar aplicativos..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aplicativo</TableHead>
                <TableHead>Versão</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Empresas</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingApps ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredApps?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhum aplicativo encontrado.
                  </TableCell>
                </TableRow>
              ) : filteredApps?.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Smartphone className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{app.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {app.description || "Sem descrição"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{app.version}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {app.file_size ? `${(app.file_size / 1024 / 1024).toFixed(2)} MB` : "N/A"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {app.app_companies?.length > 0 ? (
                        app.app_companies.slice(0, 2).map((ac: any, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-[10px]">
                            {ac.companies.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Nenhuma vinculada</span>
                      )}
                      {app.app_companies?.length > 2 && (
                        <Badge variant="secondary" className="text-[10px]">+{app.app_companies.length - 2}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(app.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <a href={app.file_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm("Tem certeza que deseja remover este APK?")) {
                            deleteAppMutation.mutate(app.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Aplicativo (APK)</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome do App *</label>
                <Input 
                  placeholder="Ex: Mupa Player" 
                  value={newApp.name}
                  onChange={e => setNewApp({...newApp, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Versão *</label>
                <Input 
                  placeholder="Ex: 1.0.3" 
                  value={newApp.version}
                  onChange={e => setNewApp({...newApp, version: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição</label>
                <Input 
                  placeholder="Opcional" 
                  value={newApp.description}
                  onChange={e => setNewApp({...newApp, description: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Arquivo APK *</label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="file" 
                    accept=".apk"
                    onChange={e => setNewApp({...newApp, file: e.target.files?.[0] || null})}
                    className="flex-1"
                  />
                  {newApp.file && <FileText className="h-5 w-5 text-primary" />}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Vincular Empresas
              </label>
              <div className="border rounded-md p-2 h-[220px] overflow-y-auto space-y-2">
                {companies?.map(company => (
                  <div key={company.id} className="flex items-center space-x-2 p-1 hover:bg-muted rounded transition-colors">
                    <Checkbox 
                      id={`company-${company.id}`} 
                      checked={newApp.selectedCompanies.includes(company.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setNewApp({...newApp, selectedCompanies: [...newApp.selectedCompanies, company.id]});
                        } else {
                          setNewApp({...newApp, selectedCompanies: newApp.selectedCompanies.filter(id => id !== company.id)});
                        }
                      }}
                    />
                    <label 
                      htmlFor={`company-${company.id}`}
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      {company.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isUploading}>
              Cancelar
            </Button>
            <Button 
              className="bg-gradient-primary text-primary-foreground" 
              onClick={() => uploadAppMutation.mutate()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                </>
              ) : "Salvar Aplicativo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
