import { useState, useEffect } from "react";
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
  Activity,
  Megaphone,
  Filter,
  Search
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
import { Separator } from "@/components/ui/separator";

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
  { name: "Roxo Mupa", value: "#9b87f5" },
  { name: "Laranja", value: "#F97316" },
  { name: "Azul Sky", value: "#0EA5E9" },
  { name: "Rosa Choque", value: "#D946EF" },
  { name: "Violeta", value: "#8B5CF6" },
  { name: "Verde Esmeralda", value: "#10B981" },
  { name: "Vermelho", value: "#EF4444" },
  { name: "Cinza Slate", value: "#64748b" },
];

export function CampaignForm({ initialData, onSubmit, isLoading }: CampaignFormProps) {
  const { tenantId } = useUserRole();
  const [playlistSearch, setPlaylistSearch] = useState("");
  
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

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name || "",
        description: initialData.description || "",
        start_date: initialData.start_date ? new Date(initialData.start_date) : new Date(),
        end_date: initialData.end_date ? new Date(initialData.end_date) : new Date(new Date().setDate(new Date().getDate() + 7)),
        start_time: initialData.start_time || "00:00",
        end_time: initialData.end_time || "23:59",
        priority: initialData.priority || 0,
        color: initialData.color || "#9b87f5",
        is_active: initialData.is_active ?? true,
        playlist_ids: initialData.playlist_ids || [],
      });
    }
  }, [initialData, form]);

  const filteredPlaylists = playlists?.filter(p => 
    p.name.toLowerCase().includes(playlistSearch.toLowerCase())
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* COLUNA PRINCIPAL - IDENTIDADE E AGENDAMENTO */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* CARD 1: IDENTIDADE E VISIBILIDADE */}
            <Card className="bg-[#1a1a1e]/50 border-white/5 shadow-2xl overflow-hidden backdrop-blur-sm group">
              <div className="h-1 w-full bg-gradient-to-r from-primary/50 via-primary/20 to-transparent" />
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-white/80">
                      <Palette className="h-4 w-4 text-primary" /> Identidade & Visibilidade
                    </CardTitle>
                    <CardDescription className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
                      Configure os metadados principais e a identidade visual.
                    </CardDescription>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Status</span>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-green-500"
                        />
                      </div>
                    )}
                  />
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Nome da Campanha</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: Liquidação de Verão 2024" 
                            {...field} 
                            className="bg-black/40 border-white/10 h-12 focus:border-primary/50 transition-all font-bold text-white text-base rounded-xl" 
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
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Objetivo / Observações</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descreva brevemente o propósito desta campanha para controle interno..." 
                            className="resize-none h-24 bg-black/40 border-white/10 focus:border-primary/50 transition-all font-medium text-white rounded-xl"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Prioridade de Veiculação</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type="number" 
                              {...field} 
                              className="bg-black/40 border-white/10 h-12 focus:border-primary/50 transition-all font-mono font-black text-white text-lg rounded-xl pl-12" 
                            />
                            <Activity className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/40" />
                          </div>
                        </FormControl>
                        <FormDescription className="text-[9px] uppercase tracking-widest text-white/20">
                          Valores mais altos sobrepõem outras campanhas.
                        </FormDescription>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Identificador Visual</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-black/40 border-white/10 h-12 focus:border-primary/50 transition-all text-white rounded-xl px-4">
                              <SelectValue placeholder="Selecione uma cor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#1a1a1e] border-white/10 text-white rounded-xl shadow-2xl">
                            <div className="grid grid-cols-2 p-2 gap-1">
                              {PRESET_COLORS.map((color) => (
                                <SelectItem key={color.value} value={color.value} className="focus:bg-white/5 rounded-lg py-2">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="h-3 w-3 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" 
                                      style={{ backgroundColor: color.value }} 
                                    />
                                    <span className="text-[9px] font-black uppercase tracking-widest">{color.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </div>
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-[9px] uppercase tracking-widest text-white/20">
                          Cor usada para organizar o calendário.
                        </FormDescription>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* CARD 2: AGENDAMENTO PREMIUM */}
            <Card className="bg-[#1a1a1e]/50 border-white/5 shadow-2xl overflow-hidden backdrop-blur-sm">
              <div className="h-1 w-full bg-gradient-to-r from-blue-500/50 via-blue-500/20 to-transparent" />
              <CardHeader className="pb-6">
                <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-white/80">
                  <CalendarLucide className="h-4 w-4 text-blue-500" /> Regras de Agendamento
                </CardTitle>
                <CardDescription className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
                  Defina o período exato e os horários de exibição.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* DATA */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                      <CalendarLucide className="h-3 w-3" /> Período (Início e Fim)
                    </label>
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
                                      "w-full h-12 bg-black/40 border-white/10 text-left font-mono font-bold text-xs uppercase tracking-widest transition-all rounded-xl",
                                      !field.value && "text-white/20"
                                    )}
                                  >
                                    {field.value ? format(field.value, "dd/MM/yy") : <span>Início</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 text-blue-500/60" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 bg-[#1a1a1e] border-white/10 shadow-2xl rounded-2xl" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                  className="bg-transparent text-white p-4"
                                />
                              </PopoverContent>
                            </Popover>
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
                                      "w-full h-12 bg-black/40 border-white/10 text-left font-mono font-bold text-xs uppercase tracking-widest transition-all rounded-xl",
                                      !field.value && "text-white/20"
                                    )}
                                  >
                                    {field.value ? format(field.value, "dd/MM/yy") : <span>Fim</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 text-blue-500/60" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 bg-[#1a1a1e] border-white/10 shadow-2xl rounded-2xl" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                  className="bg-transparent text-white p-4"
                                />
                              </PopoverContent>
                            </Popover>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* HORA */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                      <Clock className="h-3 w-3" /> Faixa Horária Diária
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="start_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative group">
                                <Input 
                                  type="time" 
                                  {...field} 
                                  className="bg-black/40 border-white/10 h-12 focus:border-blue-500/50 transition-all font-mono font-black text-xs text-white pl-10 rounded-xl" 
                                />
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500/40 group-focus-within:text-blue-500 transition-colors" />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="end_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative group">
                                <Input 
                                  type="time" 
                                  {...field} 
                                  className="bg-black/40 border-white/10 h-12 focus:border-blue-500/50 transition-all font-mono font-black text-xs text-white pl-10 rounded-xl" 
                                />
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500/40 group-focus-within:text-blue-500 transition-colors" />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-blue-500/10 bg-blue-500/5 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Info className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white/80">Resumo da Veiculação</h4>
                    <p className="text-[10px] text-white/40 leading-relaxed font-medium">
                      Ativa de <span className="text-white font-bold">{format(form.watch("start_date"), "dd/MM")}</span> até <span className="text-white font-bold">{format(form.watch("end_date"), "dd/MM")}</span>. 
                      Exibição diária entre <span className="text-white font-bold">{form.watch("start_time")}</span> e <span className="text-white font-bold">{form.watch("end_time")}</span>.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* COLUNA LATERAL - PLAYLISTS */}
          <div className="lg:col-span-4 space-y-8 h-full">
            <Card className="bg-[#1a1a1e]/50 border-white/5 shadow-2xl overflow-hidden backdrop-blur-sm h-full flex flex-col min-h-[500px]">
              <div className="h-1 w-full bg-gradient-to-r from-emerald-500/50 to-transparent" />
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-white/80">
                  <Layers className="h-4 w-4 text-emerald-500" /> Distribuição
                </CardTitle>
                <CardDescription className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
                  Selecione as playlists vinculadas.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4 flex-1 flex flex-col overflow-hidden">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-emerald-500 transition-colors" />
                  <Input 
                    placeholder="Filtrar playlists..." 
                    value={playlistSearch}
                    onChange={(e) => setPlaylistSearch(e.target.value)}
                    className="bg-black/40 border-white/10 h-10 pl-10 text-[10px] font-bold uppercase tracking-widest rounded-xl"
                  />
                </div>

                <ScrollArea className="flex-1 -mx-2 px-2">
                  <div className="space-y-2 pb-4">
                    <FormField
                      control={form.control}
                      name="playlist_ids"
                      render={({ field }) => (
                        <>
                          {filteredPlaylists?.map((playlist) => {
                            const isSelected = field.value.includes(playlist.id);
                            return (
                              <div 
                                key={playlist.id}
                                className={cn(
                                  "flex items-center space-x-3 p-3 rounded-xl border transition-all cursor-pointer group",
                                  isSelected 
                                    ? "bg-emerald-500/10 border-emerald-500/30" 
                                    : "bg-black/20 border-white/5 hover:border-white/10 hover:bg-black/40"
                                )}
                                onClick={() => {
                                  const current = field.value;
                                  const next = isSelected
                                    ? current.filter(id => id !== playlist.id)
                                    : [...current, playlist.id];
                                  field.onChange(next);
                                }}
                              >
                                <div className={cn(
                                  "h-4 w-4 rounded border flex items-center justify-center transition-all",
                                  isSelected
                                    ? "bg-emerald-500 border-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                    : "border-white/10 group-hover:border-white/30"
                                )}>
                                  {isSelected && <Check className="h-3 w-3 stroke-[4]" />}
                                </div>
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-widest transition-colors truncate",
                                  isSelected ? "text-white" : "text-white/40 group-hover:text-white/60"
                                )}>
                                  {playlist.name}
                                </span>
                              </div>
                            );
                          })}

                          {filteredPlaylists?.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3 opacity-20">
                              <Filter className="h-8 w-8" />
                              <p className="text-[10px] font-bold uppercase tracking-widest">Nenhuma playlist encontrada</p>
                            </div>
                          )}
                        </>
                      )}
                    />
                  </div>
                </ScrollArea>
                
                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/20">
                    {form.watch("playlist_ids")?.length || 0} Selecionadas
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    type="button"
                    onClick={() => form.setValue("playlist_ids", playlists?.map(p => p.id) || [])}
                    className="h-6 text-[9px] font-black uppercase tracking-widest text-primary/60 hover:text-primary p-0"
                  >
                    Selecionar Todas
                  </Button>
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
