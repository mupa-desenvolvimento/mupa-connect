import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AppDownloadProxy() {
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    async function getDownloadUrl() {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from("apps")
          .select("file_url")
          .eq("id", id)
          .single();

        if (error || !data) {
          throw new Error("Aplicativo não encontrado ou acesso negado.");
        }

        // Redirect to the actual file
        window.location.href = data.file_url;
      } catch (error: any) {
        console.error("Download error:", error);
        toast.error(error.message);
      }
    }

    getDownloadUrl();
  }, [id]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <h2 className="text-xl font-medium">Iniciando download...</h2>
      <p className="text-muted-foreground text-sm mt-2">O seu arquivo APK será baixado em instantes.</p>
    </div>
  );
}
