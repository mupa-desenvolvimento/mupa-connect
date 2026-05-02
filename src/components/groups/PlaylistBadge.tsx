import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link2, Music } from "lucide-react";

interface PlaylistBadgeProps {
  playlistName: string | null;
  isInherited: boolean;
  inheritedFromName?: string | null;
}

export function PlaylistBadge({ playlistName, isInherited, inheritedFromName }: PlaylistBadgeProps) {
  if (!playlistName) return (
    <Badge variant="outline" className="text-muted-foreground italic border-white/10">
      Nenhuma playlist
    </Badge>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            <Badge 
              variant={isInherited ? "secondary" : "default"} 
              className={`gap-1 px-2 py-0.5 ${isInherited ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border-green-500/20'}`}
            >
              {isInherited ? <Link2 className="w-3 h-3" /> : <Music className="w-3 h-3" />}
              <span className="max-w-[120px] truncate">{playlistName}</span>
            </Badge>
            {isInherited ? (
              <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-blue-500/5 text-blue-400 border-blue-500/10">HERDADO</Badge>
            ) : (
              <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-green-500/5 text-green-400 border-green-500/10">OVERRIDE</Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-background border-white/10">
          <p>{isInherited ? `Esta playlist vem do grupo: ${inheritedFromName || 'Superior'}` : 'Playlist customizada para este nível'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
