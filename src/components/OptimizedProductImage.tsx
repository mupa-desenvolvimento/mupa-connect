
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
        const cached = await ImageCacheService.get(ean);
        if (cached && loadingRef.current === src) {
          setCurrentSrc(cached);
          setIsLoaded(true);
          setShowFallback(false);
          return;
        }
      }

      // 2. Fetch in background
      const img = new Image();
      img.src = src;
      
      img.onload = async () => {
        if (loadingRef.current !== src) return;

        // Save to cache as Base64 if possible
        if (ean) {
          try {
            const response = await fetch(src);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64data = reader.result as string;
              ImageCacheService.set(ean, base64data);
            };
            reader.readAsDataURL(blob);
          } catch (e) {
            console.warn("[ImageLoader] Could not cache image:", e);
          }
        }

        setCurrentSrc(src);
        setIsLoaded(true);
        // Delay hiding fallback for a smoother transition
        setTimeout(() => setShowFallback(false), 300);
      };

      img.onerror = () => {
        if (loadingRef.current !== src) return;
        console.error("[ImageLoader] Error loading image:", src);
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
