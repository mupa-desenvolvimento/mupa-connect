import { useEffect, useState, useRef, useMemo } from "react";

interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video";
  duration: number;
  name: string;
}

interface PlayerEngineProps {
  playlist: MediaItem[];
  onMediaChange?: (index: number) => void;
  volume?: number;
}

export function PlayerEngine({ playlist, onMediaChange, volume = 0 }: PlayerEngineProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(playlist.length > 1 ? 1 : 0);
  const [activeLayer, setActiveLayer] = useState<"A" | "B">("A");
  
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | null>(null);

  const currentMedia = playlist[currentIndex];
  const nextMedia = playlist[nextIndex];

  // Handle loop and transitions
  useEffect(() => {
    if (!playlist.length) return;

    const media = playlist[currentIndex];
    const duration = (media.duration || 10) * 1000;

    if (timerRef.current) window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(() => {
      const isNextLayerA = activeLayer === "B";
      const nextIdx = (currentIndex + 1) % playlist.length;
      const afterNextIdx = (nextIdx + 1) % playlist.length;

      // Prepare the next layer before switching
      if (isNextLayerA) {
        if (playlist[nextIdx].type === "video" && videoARef.current) {
          videoARef.current.load();
          videoARef.current.play().catch(() => {});
        }
      } else {
        if (playlist[nextIdx].type === "video" && videoBRef.current) {
          videoBRef.current.load();
          videoBRef.current.play().catch(() => {});
        }
      }

      setCurrentIndex(nextIdx);
      setNextIndex(afterNextIdx);
      setActiveLayer(isNextLayerA ? "A" : "B");
      onMediaChange?.(nextIdx);
    }, duration);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [currentIndex, activeLayer, playlist, onMediaChange]);

  // Preload next video when currentIndex changes
  useEffect(() => {
    const nextLayer = activeLayer === "A" ? videoBRef : videoARef;
    if (nextMedia?.type === "video" && nextLayer.current) {
      nextLayer.current.src = nextMedia.url;
      nextLayer.current.load();
    }
  }, [currentIndex, nextMedia, activeLayer]);

  if (!playlist.length) return null;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Layer A */}
      <div 
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${activeLayer === "A" ? "opacity-100 z-10" : "opacity-0 z-0"}`}
      >
        {playlist[activeLayer === "A" ? currentIndex : nextIndex]?.type === "video" ? (
          <video
            ref={videoARef}
            src={activeLayer === "A" ? playlist[currentIndex].url : playlist[nextIndex].url}
            muted={volume === 0}
            autoPlay
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={activeLayer === "A" ? playlist[currentIndex].url : playlist[nextIndex].url}
            className="w-full h-full object-cover"
            alt="media"
          />
        )}
      </div>

      {/* Layer B */}
      <div 
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${activeLayer === "B" ? "opacity-100 z-10" : "opacity-0 z-0"}`}
      >
        {playlist[activeLayer === "B" ? currentIndex : nextIndex]?.type === "video" ? (
          <video
            ref={videoBRef}
            src={activeLayer === "B" ? playlist[currentIndex].url : playlist[nextIndex].url}
            muted={volume === 0}
            autoPlay
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={activeLayer === "B" ? playlist[currentIndex].url : playlist[nextIndex].url}
            className="w-full h-full object-cover"
            alt="media"
          />
        )}
      </div>
    </div>
  );
}
