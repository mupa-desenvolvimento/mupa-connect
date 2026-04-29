import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mediaItems } from "@/lib/mock-data";
import { Upload, Play } from "lucide-react";

export default function MediaPage() {
  return (
    <>
      <PageHeader
        title="Galeria de Mídias"
        description="Imagens e vídeos armazenados em Cloudflare R2 — disponíveis para playlists."
        actions={<Button className="bg-gradient-primary text-primary-foreground shadow-glow"><Upload className="h-4 w-4 mr-1" /> Enviar mídia</Button>}
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {mediaItems.map((m) => (
          <Card key={m.id} className="overflow-hidden group hover:shadow-elegant transition-shadow">
            <div className="aspect-video bg-muted relative overflow-hidden">
              <img src={m.url} alt={m.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="backdrop-blur bg-card/80 text-xs">
                  {m.type === "video" ? <Play className="h-3 w-3 mr-1" /> : null}
                  {m.duration}s
                </Badge>
              </div>
            </div>
            <CardContent className="p-3">
              <div className="font-medium text-sm truncate">{m.name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                <span>{m.size}</span>
                <span>·</span>
                <span className="truncate">{m.tags.join(", ")}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
