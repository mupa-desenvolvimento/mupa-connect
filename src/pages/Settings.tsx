import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4 overflow-y-auto">
      <PageHeader title="Configurações" description="Preferências da empresa, integrações e usuários." />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-4">
        {["Geral", "Usuários", "Integrações", "Notificações", "Segurança", "API"].map((t) => (
          <Card key={t} className="border-border/60 bg-background/50 hover:bg-background/80 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-lg font-bold">{t}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground font-medium italic">
              Em breve. Esta seção será habilitada nos próximos módulos.
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
