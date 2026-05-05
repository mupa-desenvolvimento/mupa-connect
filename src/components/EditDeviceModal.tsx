import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShieldCheck, AlertCircle, Building2, Store, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { usePlaylists } from "@/hooks/use-playlist-data";
import { useStores } from "@/hooks/use-stores";
import { useGroups } from "@/hooks/use-groups";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
  apelido_interno: z.string().min(2, "O apelido deve ter pelo menos 2 caracteres"),
  serial: z.string().min(4, "O serial deve ter pelo menos 4 caracteres"),
  num_filial: z.string().nullable().optional(),
  tenant_id: z.string().uuid("Selecione um tenant válido"),
  company_id: z.string().uuid("Selecione uma empresa válida").nullable().optional(),
  store_id: z.string().uuid("Selecione uma loja válida").nullable().optional(),
  group_id: z.string().uuid("Selecione um grupo válido").nullable().optional(),
  playlist_id: z.string().uuid("Selecione uma playlist válida").nullable().optional(),
  tipo_da_licenca: z.string().nullable().optional(),
  device_type: z.string().nullable().optional(),
  pin: z.string().nullable().optional(),
  autostart: z.boolean().default(true),
});

interface EditDeviceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: any;
  onSuccess: () => void;
}

export function EditDeviceModal({ open, onOpenChange, device, onSuccess }: EditDeviceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      apelido_interno: "",
      serial: "",
      num_filial: "",
      tenant_id: "",
      company_id: null,
      store_id: null,
      group_id: null,
      playlist_id: null,
      tipo_da_licenca: "",
      device_type: "",
      pin: "",
      autostart: true,
    },
  });

  const selectedTenantId = form.watch("tenant_id");
  const selectedCompanyId = form.watch("company_id");

  // Load initial data
  useEffect(() => {
    if (device && open) {
      form.reset({
        apelido_interno: device.apelido_interno || "",
        serial: device.serial || "",
        num_filial: device.num_filial || "",
        tenant_id: device.tenant_id || "",
        company_id: device.company_id || null,
        store_id: device.store_id || null,
        group_id: device.group_id || null,
        playlist_id: device.playlist_id || null,
        tipo_da_licenca: device.tipo_da_licenca || "",
        device_type: device.device_type || "",
        pin: device.pin || "",
        autostart: device.autostart !== false,
      });
    }
  }, [device, open, form]);

  // Fetch Tenants
  const { data: tenants } = useQuery({
    queryKey: ["tenants-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch Companies for selected Tenant
  const { data: companies } = useQuery({
    queryKey: ["companies-list", selectedTenantId],
    queryFn: async () => {
      if (!selectedTenantId) return [];
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .eq("tenant_id", selectedTenantId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTenantId && open,
  });

  // Use existing hooks for stores and groups
  const { data: stores } = useStores(selectedTenantId);
  const { data: groups } = useGroups(selectedTenantId, true);
  const { data: playlists } = usePlaylists(selectedCompanyId || selectedTenantId, true);

  // Reset dependent fields when tenant changes
  const onTenantChange = (newTenantId: string) => {
    form.setValue("tenant_id", newTenantId);
    form.setValue("company_id", null);
    form.setValue("store_id", null);
    form.setValue("group_id", null);
    form.setValue("playlist_id", null);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // 1. Update basic device info
      const updateData: any = {
        apelido_interno: values.apelido_interno,
        num_filial: values.num_filial,
        tenant_id: values.tenant_id,
        company_id: values.company_id === "none" ? null : values.company_id,
        store_id: values.store_id === "none" ? null : values.store_id,
        playlist_id: values.playlist_id === "none" ? null : values.playlist_id,
        tipo_da_licenca: values.tipo_da_licenca,
        device_type: values.device_type,
        pin: values.pin,
        autostart: values.autostart,
        atualizado: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("dispositivos")
        .update(updateData)
        .eq("id", device.id);

      if (updateError) throw updateError;

      // 2. Handle group linkage (using group_devices junction table)
      if (values.group_id && values.group_id !== "none") {
        await supabase.from("group_devices").delete().eq("device_id", device.id);
        await supabase.from("group_devices").insert({
          device_id: device.id,
          group_id: values.group_id,
          tenant_id: values.tenant_id
        });
      } else {
        await supabase.from("group_devices").delete().eq("device_id", device.id);
      }

      // 3. Log the change
      await supabase.from("device_logs").insert({
        dispositivo_id: device.id,
        serial: device.serial,
        event_type: "device_updated_by_superadmin",
        payload: {
          previous_tenant_id: device.tenant_id,
          new_tenant_id: values.tenant_id,
          updated_fields: Object.keys(values).filter(k => (values as any)[k] !== (device as any)[k])
        }
      });

      toast.success("Dispositivo atualizado com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating device:", error);
      toast.error(error.message || "Erro ao atualizar dispositivo");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <DialogTitle>Edição Avançada (SuperAdmin)</DialogTitle>
          </div>
          <DialogDescription>
            Ajuste vínculos e configurações do dispositivo <span className="font-mono text-primary">{device?.serial}</span>.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="px-6 border-b">
            <TabsList className="w-full justify-start bg-transparent h-12 p-0">
              <TabsTrigger value="info" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-4">Info Geral</TabsTrigger>
              <TabsTrigger value="hierarchy" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-4">Vínculos & Hierarquia</TabsTrigger>
              <TabsTrigger value="playlist" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-4">Playlist & Config</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <Form {...form}>
              <form id="edit-device-form" onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
                
                <TabsContent value="info" className="mt-0 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="serial"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Serial</FormLabel>
                          <FormControl>
                            <Input {...field} disabled className="bg-muted font-mono" />
                          </FormControl>
                          <FormDescription>Identificador fixo do hardware.</FormDescription>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="apelido_interno"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Apelido Interno</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: PDV 01 - Caixa" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="tipo_da_licenca"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Licença</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="Ex: Pro, Basic" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="device_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Dispositivo</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="Ex: Android, Linux" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="pin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PIN de Acesso</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="Código de pareamento" />
                        </FormControl>
                        <FormDescription>Código utilizado para vincular o player manualmente.</FormDescription>
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="hierarchy" className="mt-0 space-y-6">
                  <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-900/50">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800 dark:text-amber-400">Atenção ao alterar o Tenant</AlertTitle>
                    <AlertDescription className="text-amber-700 dark:text-amber-500 text-xs">
                      Mudar o Tenant irá resetar Empresa, Loja e Grupo. Certifique-se de re-vincular os novos dados.
                    </AlertDescription>
                  </Alert>

                  <FormField
                    control={form.control}
                    name="tenant_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> Tenant (Revendedor/Global)</FormLabel>
                        <Select onValueChange={onTenantChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o Tenant" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tenants?.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Empresa (Cliente Final)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "none"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a Empresa" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhuma / Sem Vínculo</SelectItem>
                            {companies?.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-[10px]">Filtrado pelo Tenant selecionado.</FormDescription>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="store_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2"><Store className="h-3.5 w-3.5" /> Loja Específica</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "none"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a Loja" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Geral / Sem Loja</SelectItem>
                              {stores?.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="group_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grupo de Dispositivos</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "none"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o Grupo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Sem Grupo</SelectItem>
                              {groups?.map(g => (
                                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="playlist" className="mt-0 space-y-4">
                  <FormField
                    control={form.control}
                    name="playlist_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Playlist Vinculada</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "none"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma Playlist" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Sem Playlist (Tela Preta)</SelectItem>
                            {playlists?.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>A playlist será carregada no próximo heartbeat do player.</FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="num_filial"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Identificador de Filial (Legado)</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="Ex: 08" />
                        </FormControl>
                        <FormDescription>Usado para relatórios e agrupamentos antigos.</FormDescription>
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </form>
            </Form>
          </ScrollArea>

          <DialogFooter className="px-6 py-4 border-t gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              form="edit-device-form" 
              disabled={isSubmitting} 
              className="bg-gradient-primary"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
