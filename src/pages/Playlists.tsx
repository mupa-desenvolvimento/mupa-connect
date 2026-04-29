import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMediaById, playlists } from "@/lib/mock-data";
import { GripVertical, Plus } from "lucide-react";

export default function PlaylistsPage() {
  return (
    <>
      <PageHeader
        title="Playlists"
        description="Sequência de mídias exibidas em loop pelos dispositivos."
        actions={<Button className="bg-gradient-primary text-primary-foreground shadow-glow"><Plus className="h-4 w-4 mr-1" /> Nova playlist</Button>}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {playlists.map((p) => (
          <Card key={p.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-display">{p.name}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Atualizada em {p.updatedAt} · {p.items.length} itens</p>
              </div>
              <Button size="sm" variant="outline">Editar</Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {p.items.map((it) => {
                const media = getMediaById(it.mediaId);
                if (!media) return null;
                return (
                  <div key={it.mediaId} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-muted/30">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="h-10 w-16 rounded overflow-hidden bg-muted shrink-0">
                      <img src={media.url} alt={media.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{media.name}</div>
                      <div className="text-xs text-muted-foreground">{media.type} · {it.duration}s</div>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">#{it.order}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
