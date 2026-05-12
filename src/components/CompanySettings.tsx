import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X, Image as ImageIcon, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function CompanySettings() {
  const { tenantId, isAdmin } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fallbackImageUrl, setFallbackImageUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) {
      fetchTenantData();
    }
  }, [tenantId]);

  const fetchTenantData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tenants")
        .select("product_fallback_image_url")
        .eq("id", tenantId)
        .single();

      if (error) throw error;
      setFallbackImageUrl(data.product_fallback_image_url);
    } catch (error: any) {
      console.error("Error fetching tenant data:", error);
      toast.error("Erro ao carregar configurações da empresa.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !tenantId) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem.");
      return;
    }

    try {
      setSaving(true);
      
      // We'll use a direct upload to a special path in the 'media' bucket
      // or similar, but since we have a 'media-upload' function, 
      // let's see if we can use it or just direct upload if policies allow.
      // Given the previous migration was for a 'branding' bucket which was rejected,
      // I'll try to use the 'media' bucket with a specific path.
      
      const fileExt = file.name.split(".").pop();
      const fileName = `fallback_product_${tenantId}_${Date.now()}.${fileExt}`;
      const filePath = `branding/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("media")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("media")
        .getPublicUrl(filePath);

      // Save to tenant
      const { error: updateError } = await supabase
        .from("tenants")
        .update({ product_fallback_image_url: publicUrl })
        .eq("id", tenantId);

      if (updateError) throw updateError;

      setFallbackImageUrl(publicUrl);
      toast.success("Imagem padrão atualizada com sucesso!");
    } catch (error: any) {
      console.error("Error uploading fallback image:", error);
      toast.error("Erro ao enviar imagem: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!tenantId) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from("tenants")
        .update({ product_fallback_image_url: null })
        .eq("id", tenantId);

      if (error) throw error;

      setFallbackImageUrl(null);
      toast.success("Imagem padrão removida.");
    } catch (error: any) {
      console.error("Error removing image:", error);
      toast.error("Erro ao remover imagem.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="border-border/60 bg-background/50">
      <CardHeader>
        <CardTitle className="font-bold text-lg">Imagem padrão para falha de produto</CardTitle>
        <CardDescription>
          Esta imagem será exibida no Terminal de Consulta quando o produto não possuir uma imagem válida.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-full md:w-64 aspect-square bg-muted rounded-2xl border-2 border-dashed border-border/60 flex items-center justify-center overflow-hidden relative group">
            {fallbackImageUrl ? (
              <>
                <img 
                  src={fallbackImageUrl} 
                  alt="Fallback preview" 
                  className="w-full h-full object-contain p-4"
                />
                {isAdmin && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      onClick={handleRemoveImage}
                      disabled={saving}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImageIcon className="h-12 w-12 opacity-20" />
                <span className="text-xs font-medium italic">Nenhuma imagem definida</span>
              </div>
            )}
            
            {saving && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Instruções</h4>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Recomendado: 800x800px ou superior</li>
                <li>Formatos suportados: PNG, JPG, WebP</li>
                <li>Tamanho máximo: 2MB</li>
                <li>A imagem deve ter fundo transparente ou neutro para melhor visual</li>
              </ul>
            </div>

            {isAdmin && (
              <div className="flex gap-2">
                <div className="relative">
                  <input
                    type="file"
                    id="fallback-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={saving}
                  />
                  <Button asChild variant="premium" disabled={saving}>
                    <label htmlFor="fallback-upload" className="cursor-pointer flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      {fallbackImageUrl ? "Trocar Imagem" : "Fazer Upload"}
                    </label>
                  </Button>
                </div>
                
                {fallbackImageUrl && (
                  <Button variant="outline" size="icon" onClick={fetchTenantData} disabled={saving}>
                    <RefreshCw className={saving ? "animate-spin" : ""} size={16} />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
