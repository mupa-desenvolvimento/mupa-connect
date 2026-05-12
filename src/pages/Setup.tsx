import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Monitor, Keyboard as KeyboardIcon } from "lucide-react";
import VirtualKeyboard from "@/components/VirtualKeyboard";

export default function Setup() {
  const [loading, setLoading] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code_empresa: "",
    apelido: "teste dev",
    numero_loja: "",
  });
  const navigate = useNavigate();

  const handleKeyboardChange = (value: string) => {
    if (activeInput) {
      setFormData(prev => ({
        ...prev,
        [activeInput]: activeInput === "code_empresa" ? value.toUpperCase() : value
      }));
    }
  };

  const handleInputFocus = (inputName: string) => {
    setActiveInput(inputName);
    setShowKeyboard(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate company code (3 numbers + 3 letters)
    const codeRegex = /^\d{3}[A-Z]{3}$/i;
    if (!codeRegex.test(formData.code_empresa)) {
      toast.error("Código da empresa inválido. Use 3 números e 3 letras (ex: 333MUP)");
      return;
    }

    if (!formData.numero_loja) {
      toast.error("Informe o número da loja");
      return;
    }

    setLoading(true);
    try {
      // 1. Find company by code
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("id, tenant_id, name")
        .eq("code", formData.code_empresa.toUpperCase())
        .maybeSingle();

      if (companyError) {
        throw companyError;
      }

      if (!company) {
        toast.error("Empresa não encontrada com este código");
        setLoading(false);
        return;
      }

      // 2. Generate a unique serial or use existing one if stored
      let serial = localStorage.getItem("device_serial");
      if (!serial) {
        serial = `CONS-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        localStorage.setItem("device_serial", serial);
      }

      // 3. Register device via Edge Function
      const { data, error: regError } = await supabase.functions.invoke("device-api", {
        body: {
          serial: serial,
          action: "register",
          company_id: company.id,
          tenant_id: company.tenant_id,
          apelido: formData.apelido,
          num_filial: formData.numero_loja
        }
      });

      if (regError) throw regError;
      if (data?.error) throw new Error(data.error);

      toast.success(`Dispositivo registrado para ${company.name}!`);
      
      // 4. Redirect to player-consulta with the serial
      setTimeout(() => {
        navigate(`/player-consulta/${serial}`);
      }, 1500);

    } catch (err: any) {
      console.error("Setup error:", err);
      toast.error(err.message || "Erro durante o setup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,1),rgba(2,6,23,1))]" />
      
      <Card className="w-full max-w-md bg-slate-900/80 border-slate-800 text-white backdrop-blur-sm relative z-10 shadow-2xl">
        <CardHeader className="space-y-1 pb-6">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-600/20 rounded-full">
              <Monitor className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-center tracking-tight">Setup Player</CardTitle>
          <CardDescription className="text-slate-400 text-center text-base">
            Configure as informações do seu ponto de consulta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="code_empresa" className="text-slate-300 font-medium">Código da Empresa</Label>
              <Input
                id="code_empresa"
                placeholder="000AAA"
                value={formData.code_empresa}
                onChange={(e) => setFormData({ ...formData, code_empresa: e.target.value.toUpperCase() })}
                required
                maxLength={6}
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600 uppercase text-lg h-12 tracking-widest focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-500">Formato: 3 números e 3 letras</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="apelido" className="text-slate-300 font-medium">Nome do Dispositivo</Label>
              <Input
                id="apelido"
                placeholder="Ex: Consulta Corredor 05"
                value={formData.apelido}
                onChange={(e) => setFormData({ ...formData, apelido: e.target.value })}
                required
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600 h-12 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numero_loja" className="text-slate-300 font-medium">Número da Loja</Label>
              <Input
                id="numero_loja"
                placeholder="Ex: 123"
                value={formData.numero_loja}
                onChange={(e) => setFormData({ ...formData, numero_loja: e.target.value })}
                required
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600 h-12 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-7 text-xl shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] mt-4"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                  Configurando...
                </>
              ) : (
                "ATIVAR PLAYER"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <div className="absolute bottom-8 text-slate-600 text-xs uppercase tracking-widest pointer-events-none">
        MUPA Digital Signage &copy; 2026
      </div>
    </div>
  );
}
