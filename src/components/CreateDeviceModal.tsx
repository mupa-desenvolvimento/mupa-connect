import { useState } from "react";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";

const formSchema = z.object({
  apelido_interno: z.string().min(2, "O apelido deve ter pelo menos 2 caracteres"),
  serial: z.string().min(4, "O serial deve ter pelo menos 4 caracteres"),
  num_filial: z.string().min(1, "O número da filial é obrigatório"),
});

interface CreateDeviceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateDeviceModal({ open, onOpenChange, onSuccess }: CreateDeviceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { tenantId, companyId } = useUserRole();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      apelido_interno: "",
      serial: "",
      num_filial: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!tenantId) {
      toast.error("Erro de autenticação: Tenant ID não encontrado");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("dispositivos").insert({
        apelido_interno: values.apelido_interno,
        serial: values.serial.toUpperCase(),
        num_filial: values.num_filial,
        tenant_id: tenantId,
        company_id: companyId,
      });

      if (error) throw error;

      toast.success("Dispositivo criado com sucesso!");
      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating device:", error);
      toast.error(error.message || "Erro ao criar dispositivo");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Dispositivo</DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo para cadastrar um novo terminal na rede.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="apelido_interno"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apelido</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: PDV 01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="serial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serial</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: ABCD1234" {...field} className="uppercase" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="num_filial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nº Filial</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} variant="premium">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cadastrar Dispositivo
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
