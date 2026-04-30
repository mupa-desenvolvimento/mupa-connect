import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, QrCode, Copy, RefreshCw, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface QuickAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId?: string;
  storeName?: string;
  companyId?: string;
  tenantId?: string;
}

export function QuickAccessModal({ 
  isOpen, 
  onClose, 
  storeId, 
  storeName, 
  companyId, 
  tenantId 
}: QuickAccessModalProps) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchExistingToken = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("quick_access_tokens")
        .select("token")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .maybeSingle();
      
      if (data) setToken(data.token);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateToken = async () => {
    setGenerating(true);
    try {
      // Inativar tokens antigos
      if (storeId) {
        await supabase
          .from("quick_access_tokens")
          .update({ is_active: false })
          .eq("store_id", storeId);
      }

      const { data, error } = await supabase
        .from("quick_access_tokens")
        .insert({
          store_id: storeId,
          company_id: companyId,
          tenant_id: tenantId,
          is_active: true
        })
        .select("token")
        .single();

      if (error) throw error;
      setToken(data.token);
      toast.success("Novo acesso rápido gerado!");
    } catch (err: any) {
      toast.error("Erro ao gerar token: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const accessUrl = token ? `${window.location.origin}/quick-access/${token}` : "";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(accessUrl);
    toast.success("Link copiado!");
  };

  useState(() => {
    if (isOpen) fetchExistingToken();
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Acesso Rápido - {storeName}
          </DialogTitle>
          <DialogDescription>
            Gere um link ou QR Code para que gerentes controlem os dispositivos desta loja sem login.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-6 space-y-4">
          {loading ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : token ? (
            <>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-border">
                <QRCodeSVG value={accessUrl} size={200} />
              </div>
              
              <div className="w-full space-y-2">
                <Label className="text-xs text-muted-foreground">Link de Acesso</Label>
                <div className="flex gap-2">
                  <Input readOnly value={accessUrl} className="text-xs h-9" />
                  <Button size="icon" variant="outline" className="shrink-0 h-9 w-9" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <QrCode className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum acesso ativo para esta loja.</p>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={generateToken} 
            disabled={generating}
            className="gap-2"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {token ? "Regenerar Acesso" : "Gerar Primeiro Acesso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
