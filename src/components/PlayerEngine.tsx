import { useEffect, useState, useRef, useCallback } from "react";

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
  const [errorCount, setErrorCount] = useState(0);
  
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | null>(null);
  const lastTransitionRef = useRef<number>(Date.now());

  const handleNext = useCallback(() => {
    if (!playlist.length) return;
    
    const nextIdx = (currentIndex + 1) % playlist.length;
    const afterNextIdx = (nextIdx + 1) % playlist.length;
    const isNextLayerA = activeLayer === "B";

    console.log(`[PlayerEngine] Transitioning to index ${nextIdx}`);
    
    setCurrentIndex(nextIdx);
    setNextIndex(afterNextIdx);
    setActiveLayer(isNextLayerA ? "A" : "B");
    onMediaChange?.(nextIdx);
    lastTransitionRef.current = Date.now();
  }, [currentIndex, activeLayer, playlist, onMediaChange]);

  // Main playback timer
  useEffect(() => {
    if (!playlist.length) return;

    const media = playlist[currentIndex];
    const duration = (media.duration || 10) * 1000;

    if (timerRef.current) window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(() => {
      // Pre-play next layer if it's a video
      const isNextLayerA = activeLayer === "B";
      const nextIdx = (currentIndex + 1) % playlist.length;
      
      const targetVideoRef = isNextLayerA ? videoARef : videoBRef;
      if (playlist[nextIdx].type === "video" && targetVideoRef.current) {
        targetVideoRef.current.play().catch(err => {
          console.warn("[PlayerEngine] Failed to pre-play next video:", err);
        });
      }

      handleNext();
    }, duration);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [currentIndex, activeLayer, playlist, handleNext]);

  // Preload next media
  useEffect(() => {
    if (!playlist.length) return;
    const nextMedia = playlist[nextIndex];
    const nextLayerVideoRef = activeLayer === "A" ? videoBRef : videoARef;
    
    if (nextMedia?.type === "video" && nextLayerVideoRef.current) {
      if (nextLayerVideoRef.current.src !== nextMedia.url) {
        nextLayerVideoRef.current.src = nextMedia.url;
        nextLayerVideoRef.current.load();
      }
    }
  }, [nextIndex, playlist, activeLayer]);

  // Watchdog: Detect stuck playback or black screen (timeout)
  useEffect(() => {
    const watchdog = setInterval(() => {
      if (!playlist.length) return;
      
      const now = Date.now();
      const timeSinceTransition = now - lastTransitionRef.current;
      const currentMedia = playlist[currentIndex];
      const expectedDuration = (currentMedia?.duration || 10) * 1000;
      
      // If we are 15 seconds past the expected transition time, force next
      if (timeSinceTransition > expectedDuration + 15000) {
        console.warn("[PlayerEngine Watchdog] Stuck detected! Forcing recovery.");
        handleNext();
      }

      // Check if video is stalled
      const activeVideoRef = activeLayer === "A" ? videoARef : videoBRef;
      if (currentMedia?.type === "video" && activeVideoRef.current) {
        const video = activeVideoRef.current;
        // If video is active but not playing and not ended after 5s
        if (video.paused && !video.ended && timeSinceTransition > 5000) {
          video.play().catch(() => {
            console.error("[PlayerEngine Watchdog] Video failed to play, skipping.");
            handleNext();
          });
        }
      }
    }, 5000);

    return () => clearInterval(watchdog);
  }, [currentIndex, activeLayer, playlist, handleNext]);

  const handleError = (e: any) => {
    console.error("[PlayerEngine] Media error detected:", e);
    setErrorCount(prev => prev + 1);
    // Skip to next on error
    setTimeout(handleNext, 1000);
  };

  if (!playlist.length) return null;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden" key={errorCount}>
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
            onError={handleError}
            onEnded={handleNext}
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={activeLayer === "A" ? playlist[currentIndex].url : playlist[nextIndex].url}
            className="w-full h-full object-cover"
            alt="media"
            onError={handleError}
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
            onError={handleError}
            onEnded={handleNext}
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={activeLayer === "B" ? playlist[currentIndex].url : playlist[nextIndex].url}
            className="w-full h-full object-cover"
            alt="media"
            onError={handleError}
          />
        )}
      </div>
    </div>
  );
}
