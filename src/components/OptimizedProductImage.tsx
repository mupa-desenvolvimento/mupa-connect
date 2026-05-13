
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageCacheService } from "@/services/ImageCacheService";
import { Package } from "lucide-react";

interface OptimizedProductImageProps {
  src: string | null;
  fallback: string | null;
  ean: string | null;
  alt: string;
  className?: string;
  isDefaultImage?: boolean;
}

export const OptimizedProductImage = ({
  src,
  fallback,
  ean,
  alt,
  className,
  isDefaultImage = false
}: OptimizedProductImageProps) => {
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showFallback, setShowFallback] = useState(true);
  const [error, setError] = useState(false);
  const loadingRef = useRef<string | null>(null);

  useEffect(() => {
    if (!src || isDefaultImage) {
      setCurrentSrc(src || fallback);
      setIsLoaded(true);
      setShowFallback(false);
      return;
    }

    const loadImage = async () => {
      // Reset state for new EAN
      setIsLoaded(false);
      setShowFallback(true);
      setError(false);
      loadingRef.current = src;

      // 1. Try Cache
      if (ean) {
        try {
          const cached = await ImageCacheService.get(ean);
          if (cached && loadingRef.current === src) {
            console.log(`[ImageLoader] Cache hit for EAN: ${ean}`);
            setCurrentSrc(cached);
            setIsLoaded(true);
            setShowFallback(false);
            return;
          }
        } catch (e) {
          console.warn("[ImageLoader] Cache error:", e);
        }
      }

      // 2. Fetch in background
      console.log(`[ImageLoader] Cache miss, loading in background: ${src}`);
      const img = new Image();
      img.src = src;
      
      const timeoutId = setTimeout(() => {
        if (loadingRef.current === src && !isLoaded) {
          console.warn("[ImageLoader] Loading timeout, using fallback");
          setError(true);
          setCurrentSrc(fallback);
          setIsLoaded(true);
          setShowFallback(false);
        }
      }, 5000); // 5s timeout

      img.onload = async () => {
        clearTimeout(timeoutId);
        if (loadingRef.current !== src) return;

        // Save to cache as Base64 if possible
        if (ean) {
          try {
            const response = await fetch(src, { mode: 'cors' });
            if (response.ok) {
              const blob = await response.blob();
              const reader = new FileReader();
              reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                  ImageCacheService.set(ean, reader.result);
                }
              };
              reader.readAsDataURL(blob);
            }
          } catch (e) {
            console.warn("[ImageLoader] Could not cache image (CORS or Network):", e);
          }
        }

        setCurrentSrc(src);
        setIsLoaded(true);
        setTimeout(() => setShowFallback(false), 300);
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        if (loadingRef.current !== src) return;
        
        console.error("[ImageLoader] Error loading image:", src);
        
        // Simple retry once after 2 seconds
        if (!loadingRef.current?.includes('retry=true')) {
          console.log("[ImageLoader] Retrying in 2s...");
          setTimeout(() => {
            if (loadingRef.current === src) {
              loadingRef.current = src + (src.includes('?') ? '&' : '?') + 'retry=true';
              img.src = src; // This will trigger onload/onerror again
            }
          }, 2000);
          return;
        }

        setError(true);
        setCurrentSrc(fallback);
        setIsLoaded(true);
        setShowFallback(false);
      };
    };

    loadImage();
  }, [src, ean, fallback, isDefaultImage]);

  return (
    <div className={`relative w-full h-full flex items-center justify-center ${className}`}>
      <AnimatePresence mode="popLayout">
        {showFallback && (
          <motion.div
            key="fallback"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 flex items-center justify-center p-12"
          >
            {fallback ? (
              <img
                src={fallback}
                alt="Fallback"
                className="max-w-full max-h-full object-contain opacity-50 grayscale"
              />
            ) : (
              <Package className="w-48 h-48 text-white/10" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        key={currentSrc || "empty"}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: isLoaded ? 1 : 0, scale: isLoaded ? 1 : 0.95 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full h-full flex items-center justify-center p-12"
      >
        {currentSrc && !error ? (
          <img
            src={currentSrc}
            alt={alt}
            className="max-w-full max-h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          />
        ) : error ? (
          <Package className="w-48 h-48 text-white/10" />
        ) : null}
      </motion.div>
    </div>
  );
};
