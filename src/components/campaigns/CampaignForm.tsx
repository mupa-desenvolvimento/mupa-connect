import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CalendarIcon, 
  Loader2, 
  Check, 
  Calendar as CalendarLucide, 
  Clock, 
  Info, 
  Palette, 
  Settings2, 
  Layers,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

const campaignSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  start_date: z.date({ required_error: "Data de início é obrigatória" }),
  end_date: z.date({ required_error: "Data de término é obrigatória" }),
  start_time: z.string().default("00:00"),
  end_time: z.string().default("23:59"),
  priority: z.coerce.number().min(0).max(100).default(0),
  color: z.string().default("#9b87f5"),
  is_active: z.boolean().default(true),
  playlist_ids: z.array(z.string()).default([]),
});

export type CampaignFormValues = z.infer<typeof campaignSchema>;

interface CampaignFormProps {
  initialData?: Partial<CampaignFormValues>;
  onSubmit: (values: CampaignFormValues) => void;
  isLoading?: boolean;
}

const PRESET_COLORS = [
  { name: "Roxo", value: "#9b87f5" },
  { name: "Laranja", value: "#F97316" },
  { name: "Azul", value: "#0EA5E9" },
  { name: "Rosa", value: "#D946EF" },
  { name: "Violeta", value: "#8B5CF6" },
  { name: "Verde", value: "#10B981" },
  { name: "Vermelho", value: "#EF4444" },
  { name: "Cinza", value: "#64748b" },
];

export function CampaignForm({ initialData, onSubmit, isLoading }: CampaignFormProps) {
  const { tenantId } = useUserRole();
  
  const { data: playlists } = useQuery({
    queryKey: ["playlists-for-campaign", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("playlists")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      start_date: initialData?.start_date ? new Date(initialData.start_date) : new Date(),
      end_date: initialData?.end_date ? new Date(initialData.end_date) : new Date(new Date().setDate(new Date().getDate() + 7)),
      start_time: initialData?.start_time || "00:00",
      end_time: initialData?.end_time || "23:59",
      priority: initialData?.priority || 0,
      color: initialData?.color || "#9b87f5",
      is_active: initialData?.is_active ?? true,
      playlist_ids: initialData?.playlist_ids || [],
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Campanha</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Promoção de Natal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detalhes sobre a campanha..." 
                      className="resize-none h-24"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade (0-100)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormDescription>Valores maiores têm preferência.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Identificação Visual</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma cor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRESET_COLORS.map((color) => (
                          <SelectItem key={color.value} value={color.value}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="h-4 w-4 rounded-full border border-white/20" 
                                style={{ backgroundColor: color.value }} 
                              />
                              {color.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/20">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Status da Campanha</FormLabel>
                    <FormDescription>
                      Campanhas inativas não serão exibidas nos players.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Início</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ptBR })
                            ) : (
                              <span>Selecione a data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Término</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ptBR })
                            ) : (
                              <span>Selecione a data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário Início</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário Término</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-border/20">
          <FormField
            control={form.control}
            name="playlist_ids"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Vincular às Playlists</FormLabel>
                <FormDescription>
                  Selecione em quais playlists esta campanha deve ser exibida.
                </FormDescription>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {playlists?.map((playlist) => (
                    <div 
                      key={playlist.id}
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-xl border transition-all cursor-pointer",
                        field.value.includes(playlist.id) 
                          ? "bg-primary/10 border-primary shadow-sm" 
                          : "bg-muted/30 border-transparent hover:border-border/60"
                      )}
                      onClick={() => {
                        const current = field.value;
                        const next = current.includes(playlist.id)
                          ? current.filter(id => id !== playlist.id)
                          : [...current, playlist.id];
                        field.onChange(next);
                      }}
                    >
                      <div className={cn(
                        "h-4 w-4 rounded-md border flex items-center justify-center transition-colors",
                        field.value.includes(playlist.id)
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      )}>
                        {field.value.includes(playlist.id) && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <span className="text-sm font-medium truncate">{playlist.name}</span>
                    </div>
                  ))}
                </div>
                {(!playlists || playlists.length === 0) && (
                  <div className="text-sm text-muted-foreground bg-muted/20 p-4 rounded-lg border border-dashed text-center">
                    Nenhuma playlist encontrada para este tenant.
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-border/20">
          <Button 
            type="submit" 
            className="bg-gradient-primary text-primary-foreground min-w-[120px]"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Campanha
          </Button>
        </div>
      </form>
    </Form>
  );
}
