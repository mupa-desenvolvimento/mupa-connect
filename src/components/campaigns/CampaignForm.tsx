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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* COLUNA ESQUERDA - IDENTIDADE E CONFIGS */}
          <div className="lg:col-span-7 space-y-8">
            <Card className="bg-[#1a1a1e]/50 border-white/5 shadow-2xl overflow-hidden group">
              <div className="h-1 w-full bg-gradient-to-r from-primary/50 to-transparent" />
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-white/80">
                  <Palette className="h-4 w-4 text-primary" /> Identidade da Campanha
                </CardTitle>
                <CardDescription className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
                  Defina o nome, descrição e a identidade visual desta campanha.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Nome da Campanha</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: Promoção de Natal" 
                          {...field} 
                          className="bg-black/40 border-white/10 h-11 focus:border-primary/50 transition-all font-medium text-white" 
                        />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Descrição</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Detalhes internos sobre esta campanha..." 
                          className="resize-none h-24 bg-black/40 border-white/10 focus:border-primary/50 transition-all font-medium text-white"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Prioridade (0-100)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            className="bg-black/40 border-white/10 h-11 focus:border-primary/50 transition-all font-mono font-bold text-white" 
                          />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Cor de Identificação</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-black/40 border-white/10 h-11 focus:border-primary/50 transition-all text-white">
                              <SelectValue placeholder="Selecione uma cor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#1a1a1e] border-white/10 text-white">
                            {PRESET_COLORS.map((color) => (
                              <SelectItem key={color.value} value={color.value} className="focus:bg-white/5">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="h-3 w-3 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" 
                                    style={{ backgroundColor: color.value }} 
                                  />
                                  <span className="text-xs font-medium uppercase tracking-widest">{color.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1a1a1e]/50 border-white/5 shadow-2xl overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-white/80">
                  <Activity className="h-4 w-4 text-primary" /> Configurações Operacionais
                </CardTitle>
                <CardDescription className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
                  Controle a ativação e vinculação às playlists.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-xl border border-white/5 p-4 bg-black/20 group hover:bg-black/40 transition-colors">
                      <div className="space-y-0.5">
                        <FormLabel className="text-xs font-bold text-white/80">Campanha Ativa</FormLabel>
                        <FormDescription className="text-[10px] uppercase tracking-widest text-white/20">
                          Habilita ou desabilita a exibição nos players.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-green-500"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="playlist_ids"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <div className="flex flex-col gap-1">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Vincular às Playlists</FormLabel>
                        <FormDescription className="text-[10px] uppercase tracking-widest text-white/20">
                          Selecione as playlists que carregarão esta campanha.
                        </FormDescription>
                      </div>
                      <ScrollArea className="h-[180px] w-full pr-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {playlists?.map((playlist) => (
                            <div 
                              key={playlist.id}
                              className={cn(
                                "flex items-center space-x-3 p-3 rounded-xl border transition-all cursor-pointer group",
                                field.value.includes(playlist.id) 
                                  ? "bg-primary/10 border-primary/50" 
                                  : "bg-black/20 border-transparent hover:bg-black/40"
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
                                "h-4 w-4 rounded-md border flex items-center justify-center transition-all",
                                field.value.includes(playlist.id)
                                  ? "bg-primary border-primary text-primary-foreground shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                                  : "border-white/10 group-hover:border-white/30"
                              )}>
                                {field.value.includes(playlist.id) && <Check className="h-3 w-3 stroke-[3]" />}
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-white/60 group-hover:text-white transition-colors truncate">
                                {playlist.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      {(!playlists || playlists.length === 0) && (
                        <div className="text-[10px] font-bold uppercase tracking-widest text-white/20 bg-black/20 p-6 rounded-xl border border-dashed border-white/5 text-center">
                          Nenhuma playlist disponível
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* COLUNA DIREITA - AGENDAMENTO */}
          <div className="lg:col-span-5 space-y-8">
            <Card className="bg-[#1a1a1e]/50 border-white/5 shadow-2xl overflow-hidden h-full">
              <div className="h-1 w-full bg-gradient-to-r from-blue-500/50 to-transparent" />
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-white/80">
                  <CalendarLucide className="h-4 w-4 text-blue-500" /> Agendamento Premium
                </CardTitle>
                <CardDescription className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
                  Defina o período e os horários de veiculação.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-6">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Período de Veiculação</label>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="start_date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full h-11 bg-black/40 border-white/10 text-left font-mono font-bold text-xs uppercase tracking-widest transition-all",
                                      !field.value && "text-white/20"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "dd/MM/yyyy")
                                    ) : (
                                      <span>Início</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 text-blue-500/60" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 bg-[#1a1a1e] border-white/10 shadow-2xl" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                  className="bg-transparent text-white"
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="end_date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full h-11 bg-black/40 border-white/10 text-left font-mono font-bold text-xs uppercase tracking-widest transition-all",
                                      !field.value && "text-white/20"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "dd/MM/yyyy")
                                    ) : (
                                      <span>Término</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 text-blue-500/60" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 bg-[#1a1a1e] border-white/10 shadow-2xl" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                  className="bg-transparent text-white"
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Faixa de Horário</label>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="start_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type="time" 
                                  {...field} 
                                  className="bg-black/40 border-white/10 h-11 focus:border-blue-500/50 transition-all font-mono font-bold text-xs text-white pl-10" 
                                />
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500/60" />
                              </div>
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="end_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type="time" 
                                  {...field} 
                                  className="bg-black/40 border-white/10 h-11 focus:border-blue-500/50 transition-all font-mono font-bold text-xs text-white pl-10" 
                                />
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500/60" />
                              </div>
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-white/5 bg-black/40 space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40">
                    <Info className="h-3 w-3 text-primary" /> Resumo do Agendamento
                  </div>
                  <p className="text-[10px] text-white/60 leading-relaxed font-medium">
                    Esta campanha será exibida entre os dias <span className="text-white font-bold">{format(form.watch("start_date"), "dd/MM")}</span> e <span className="text-white font-bold">{format(form.watch("end_date"), "dd/MM")}</span>, no horário compreendido entre <span className="text-white font-bold">{form.watch("start_time")}</span> e <span className="text-white font-bold">{form.watch("end_time")}</span>.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* HIDDEN SUBMIT - TRIGGERED BY PARENT HEADER */}
        <button type="submit" className="hidden">Submit</button>
      </form>
    </Form>
  );
}
  );
}
