import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Configurações" description="Preferências da empresa, integrações e usuários." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {["Empresa", "Usuários & Permissões", "Integrações", "API & Webhooks"].map((t) => (
          <Card key={t}>
            <CardHeader><CardTitle className="font-display">{t}</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Em breve. Esta seção será habilitada quando o backend Supabase estiver conectado.
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
