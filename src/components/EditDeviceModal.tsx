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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertCircle, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";

const formSchema = z.object({
  apelido_interno: z.string().min(2, "O apelido deve ter pelo menos 2 caracteres"),
  tenant_id: z.string().uuid("Tenant inválido"),
  company_id: z.string().uuid("Empresa inválida").nullable(),
  store_id: z.string().uuid("Loja inválida").nullable(),
  group_id: z.string().uuid("Grupo inválido").nullable(),
  playlist_id: z.string().uuid("Playlist inválida").nullable(),
  tipo_da_licenca: z.string().nullable(),
  type: z.string().nullable(),
  ip_dispositivo: z.string().nullable(),
  num_filial: z.string().nullable(),
  pin: z.string().nullable(),
});

interface EditDeviceModalProps {
  device: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditDeviceModal({ device, open, onOpenChange, onSuccess }: EditDeviceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      apelido_interno: "",
      tenant_id: "",
      company_id: null,
      store_id: null,
      group_id: null,
      playlist_id: null,
      tipo_da_licenca: null,
      type: null,
      ip_dispositivo: null,
      num_filial: null,
      pin: null,
    },
  });

  useEffect(() => {
    if (device && open) {
      form.reset({
        apelido_interno: device.apelido_interno || "",
        tenant_id: device.tenant_id || "",
        company_id: device.company_id || null,
        store_id: device.store_id || null,
        group_id: device.group_id || null,
        playlist_id: device.playlist_id || null,
        tipo_da_licenca: device.tipo_da_licenca || null,
        type: device.type || null,
        ip_dispositivo: device.ip_dispositivo || null,
        num_filial: device.num_filial || null,
        pin: device.pin || null,
      });
    }
  }, [device, open, form]);

  const selectedTenantId = form.watch("tenant_id");

  // Queries for selectors
  const { data: tenants } = useQuery({
    queryKey: ["tenants-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: companies } = useQuery({
    queryKey: ["companies-list", selectedTenantId],
    queryFn: async () => {
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

  const { data: stores } = useQuery({
    queryKey: ["stores-list-full", selectedTenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name")
        .eq("tenant_id", selectedTenantId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTenantId && open,
  });

  const { data: playlists } = useQuery({
    queryKey: ["playlists-list-full", selectedTenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("playlists")
        .select("id, name")
        .eq("tenant_id", selectedTenantId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTenantId && open,
  });

  // Handle tenant change to reset dependent fields
  const handleTenantChange = (newTenantId: string) => {
    form.setValue("tenant_id", newTenantId);
    form.setValue("company_id", null);
    form.setValue("store_id", null);
    form.setValue("group_id", null);
    form.setValue("playlist_id", null);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("dispositivos")
        .update({
          apelido_interno: values.apelido_interno,
          tenant_id: values.tenant_id,
          company_id: values.company_id,
          store_id: values.store_id,
          group_id: values.group_id,
          playlist_id: values.playlist_id,
          tipo_da_licenca: values.tipo_da_licenca,
          type: values.type,
          ip_dispositivo: values.ip_dispositivo,
          num_filial: values.num_filial,
          pin: values.pin,
          atualizado: new Date().toISOString(),
        })
        .eq("id", device.id);

      if (error) throw error;

      // Log the update
      await supabase.from("device_logs").insert({
        dispositivo_id: device.id,
        serial: device.serial,
        event_type: "device_updated_by_superadmin",
        payload: {
          previous_tenant_id: device.tenant_id,
          new_tenant_id: values.tenant_id,
          updated_fields: values,
        } as any,
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Dispositivo (SuperAdmin)</DialogTitle>
          <DialogDescription>
            Edição completa do dispositivo {device?.serial}. Use com cautela para correções de vínculos.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold border-b pb-1">Informações do Dispositivo</h3>
                
                <FormItem>
                  <FormLabel>Serial (Read-only)</FormLabel>
                  <Input value={device?.serial || ""} disabled className="bg-muted font-mono" />
                </FormItem>

                <FormField
                  control={form.control}
                  name="apelido_interno"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apelido Interno</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: TV Recepção" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="tipo_da_licenca"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Licença</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} onChange={e => field.onChange(e.target.value || null)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} onChange={e => field.onChange(e.target.value || null)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="ip_dispositivo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IP</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} onChange={e => field.onChange(e.target.value || null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold border-b pb-1">Vínculos Críticos</h3>

                <FormField
                  control={form.control}
                  name="tenant_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tenant (Cliente)</FormLabel>
                      <Select onValueChange={handleTenantChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um tenant" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tenants?.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-[10px]">Alterar o tenant resetará vínculos abaixo.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empresa</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma empresa" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma</SelectItem>
                          {companies?.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="store_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loja</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma loja" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma</SelectItem>
                          {stores?.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="playlist_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Playlist Atual</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma playlist" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma</SelectItem>
                          {playlists?.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <FormField
                  control={form.control}
                  name="num_filial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nº Filial (Legado)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} onChange={e => field.onChange(e.target.value || null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PIN</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} onChange={e => field.onChange(e.target.value || null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            {device?.tenant_id !== selectedTenantId && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Atenção</AlertTitle>
                <AlertDescription>
                  Você está alterando o Tenant deste dispositivo. Isso moverá o dispositivo para outro cliente.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
