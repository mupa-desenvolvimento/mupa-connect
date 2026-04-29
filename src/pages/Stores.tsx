import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { stores } from "@/lib/mock-data";
import { MapPin, MonitorPlay, Plus } from "lucide-react";

export default function StoresPage() {
  return (
    <>
      <PageHeader
        title="Lojas"
        description="Pontos físicos onde os dispositivos estão instalados."
        actions={<Button className="bg-gradient-primary text-primary-foreground shadow-glow"><Plus className="h-4 w-4 mr-1" /> Nova loja</Button>}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stores.map((s) => (
          <Card key={s.id} className="hover:shadow-elegant transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display font-semibold text-lg">{s.name}</div>
                  <div className="text-xs font-mono text-muted-foreground mt-0.5">{s.code}</div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-gradient-accent grid place-items-center text-accent-foreground text-sm font-bold">
                  {s.name.split(" ").map(w => w[0]).slice(0,2).join("")}
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {s.city}</div>
                <div className="flex items-center gap-2"><MonitorPlay className="h-4 w-4" /> {s.devices} dispositivos</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
