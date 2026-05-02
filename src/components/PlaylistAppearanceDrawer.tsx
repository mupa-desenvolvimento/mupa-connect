import React from "react";
import { 
  Settings2, 
  Monitor, 
  Clock, 
  Hash, 
  Type, 
  Maximize2, 
  Image as ImageIcon,
  Palette,
  Move
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface AppearanceConfig {
  show_device_name: boolean;
  show_datetime: boolean;
  show_serial: boolean;
  transition_type: "fade" | "slide-left" | "slide-right" | "zoom" | "none";
  transition_duration: number;
  footer: {
    enabled: boolean;
    text: string;
    background_color: string;
    text_color: string;
    height: number;
  };
  logo: {
    enabled: boolean;
    url: string;
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    size: number;
    opacity: number;
  };
}

interface PlaylistAppearanceDrawerProps {
  config: Partial<AppearanceConfig>;
  onChange: (newConfig: Partial<AppearanceConfig>) => void;
}

export function PlaylistAppearanceDrawer({ config, onChange }: PlaylistAppearanceDrawerProps) {
  const updateConfig = (path: string, value: any) => {
    const newConfig = { ...config };
    if (path.includes('.')) {
      const [parent, child] = path.split('.');
      (newConfig as any)[parent] = { ...(newConfig as any)[parent], [child]: value };
    } else {
      (newConfig as any)[path] = value;
    }
    onChange(newConfig);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-white">
          <Palette className="h-4 w-4" />
          Aparência do Player
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md bg-[#09090b] border-white/10 text-white overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-[#085CF0]" />
            Aparência da Playlist
          </SheetTitle>
          <SheetDescription className="text-white/60">
            Personalize a interface visual dos dispositivos durante a reprodução.
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-8">
          {/* Identificação */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#085CF0] uppercase tracking-wider">
              <Monitor className="h-4 w-4" />
              Identificação na Tela
            </div>
            <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/5">
              <div className="flex items-center justify-between">
                <Label htmlFor="show_device_name">Mostrar Nome do Dispositivo</Label>
                <Switch 
                  id="show_device_name" 
                  checked={config.show_device_name !== false} 
                  onCheckedChange={(val) => updateConfig('show_device_name', val)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show_datetime">Mostrar Data e Hora</Label>
                <Switch 
                  id="show_datetime" 
                  checked={config.show_datetime !== false} 
                  onCheckedChange={(val) => updateConfig('show_datetime', val)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show_serial">Mostrar Serial (Suporte)</Label>
                <Switch 
                  id="show_serial" 
                  checked={config.show_serial !== false} 
                  onCheckedChange={(val) => updateConfig('show_serial', val)}
                />
              </div>
            </div>
          </section>

          {/* Transições */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#085CF0] uppercase tracking-wider">
              <Maximize2 className="h-4 w-4" />
              Transições de Mídia
            </div>
            <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/5">
              <div className="space-y-2">
                <Label>Tipo de Transição</Label>
                <Select 
                  value={config.transition_type || "fade"} 
                  onValueChange={(val) => updateConfig('transition_type', val)}
                >
                  <SelectTrigger className="bg-black/50 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                    <SelectItem value="fade">Fade (Suave)</SelectItem>
                    <SelectItem value="slide-left">Deslizar para Esquerda</SelectItem>
                    <SelectItem value="slide-right">Deslizar para Direita</SelectItem>
                    <SelectItem value="zoom">Zoom</SelectItem>
                    <SelectItem value="none">Nenhuma (Corte Seco)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duração (ms)</Label>
                <Input 
                  type="number" 
                  value={config.transition_duration || 600} 
                  onChange={(e) => updateConfig('transition_duration', parseInt(e.target.value))}
                  className="bg-black/50 border-white/10"
                />
              </div>
            </div>
          </section>

          {/* Rodapé Customizado */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#085CF0] uppercase tracking-wider">
              <Type className="h-4 w-4" />
              Rodapé Informativo
            </div>
            <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/5">
              <div className="flex items-center justify-between">
                <Label>Habilitar Rodapé</Label>
                <Switch 
                  checked={config.footer?.enabled || false} 
                  onCheckedChange={(val) => updateConfig('footer.enabled', val)}
                />
              </div>
              {config.footer?.enabled && (
                <>
                  <div className="space-y-2">
                    <Label>Texto do Rodapé</Label>
                    <Input 
                      value={config.footer?.text || ""} 
                      onChange={(e) => updateConfig('footer.text', e.target.value)}
                      placeholder="Ex: Ofertas válidas até amanhã"
                      className="bg-black/50 border-white/10"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Fundo (Hex/RGBA)</Label>
                      <Input 
                        value={config.footer?.background_color || "#000000AA"} 
                        onChange={(e) => updateConfig('footer.background_color', e.target.value)}
                        className="bg-black/50 border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Texto (Hex)</Label>
                      <Input 
                        value={config.footer?.text_color || "#FFFFFF"} 
                        onChange={(e) => updateConfig('footer.text_color', e.target.value)}
                        className="bg-black/50 border-white/10"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Logo Branding */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#085CF0] uppercase tracking-wider">
              <ImageIcon className="h-4 w-4" />
              Logo / Marca d'água
            </div>
            <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/5">
              <div className="flex items-center justify-between">
                <Label>Exibir Logo</Label>
                <Switch 
                  checked={config.logo?.enabled || false} 
                  onCheckedChange={(val) => updateConfig('logo.enabled', val)}
                />
              </div>
              {config.logo?.enabled && (
                <>
                  <div className="space-y-2">
                    <Label>URL do Logo</Label>
                    <Input 
                      value={config.logo?.url || ""} 
                      onChange={(e) => updateConfig('logo.url', e.target.value)}
                      placeholder="https://sua-url.com/logo.png"
                      className="bg-black/50 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Posição</Label>
                    <Select 
                      value={config.logo?.position || "top-left"} 
                      onValueChange={(val) => updateConfig('logo.position', val)}
                    >
                      <SelectTrigger className="bg-black/50 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                        <SelectItem value="top-left">Superior Esquerdo</SelectItem>
                        <SelectItem value="top-right">Superior Direito</SelectItem>
                        <SelectItem value="bottom-left">Inferior Esquerdo</SelectItem>
                        <SelectItem value="bottom-right">Inferior Direito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Tamanho (px)</Label>
                      <Input 
                        type="number"
                        value={config.logo?.size || 80} 
                        onChange={(e) => updateConfig('logo.size', parseInt(e.target.value))}
                        className="bg-black/50 border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Opacidade (0-1)</Label>
                      <Input 
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={config.logo?.opacity ?? 1} 
                        onChange={(e) => updateConfig('logo.opacity', parseFloat(e.target.value))}
                        className="bg-black/50 border-white/10"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
