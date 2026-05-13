
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageCacheService } from "@/services/ImageCacheService";
import { Package } from "lucide-react";

interface OptimizedProductImageProps {
  src: string | null;
  fallback: string | string[] | null;
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
  const [hardError, setHardError] = useState(false);
  const activeLoadIdRef = useRef<string | null>(null);
  const activeIndexRef = useRef<number>(0);
  const fallbacks = (Array.isArray(fallback) ? fallback : [fallback]).filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );

  useEffect(() => {
    const candidates = [
      ...(src && !isDefaultImage ? [src] : []),
      ...fallbacks,
      ...(src && isDefaultImage ? [src] : []),
    ].filter((v, i, arr) => arr.indexOf(v) === i);

    activeIndexRef.current = 0;
    const loadId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    activeLoadIdRef.current = loadId;
    setHardError(false);

    if (candidates.length === 0) {
      setCurrentSrc(null);
      setHardError(true);
      return;
    }

    const tryCandidate = async (index: number) => {
      if (activeLoadIdRef.current !== loadId) return;
      if (index >= candidates.length) {
        setCurrentSrc(null);
        setHardError(true);
        return;
      }

      const candidate = candidates[index];
      activeIndexRef.current = index;

      if (ean && candidate === src && !isDefaultImage) {
        try {
          const cached = await ImageCacheService.get(ean);
          if (cached && activeLoadIdRef.current === loadId) {
            setCurrentSrc(cached);
            return;
          }
        } catch {
        }
      }

      const img = new Image();
      img.decoding = "async";
      img.src = candidate;

      const timeoutId = window.setTimeout(() => {
        if (activeLoadIdRef.current !== loadId) return;
        tryCandidate(index + 1);
      }, 4000);

      img.onload = async () => {
        window.clearTimeout(timeoutId);
        if (activeLoadIdRef.current !== loadId) return;

        if (ean && candidate === src && !isDefaultImage) {
          try {
            const response = await fetch(candidate, { mode: "cors" });
            if (response.ok) {
              const blob = await response.blob();
              const reader = new FileReader();
              reader.onloadend = () => {
                if (typeof reader.result === "string") {
                  ImageCacheService.set(ean, reader.result);
                }
              };
              reader.readAsDataURL(blob);
            }
          } catch {
          }
        }

        setCurrentSrc(candidate);
      };

      img.onerror = () => {
        window.clearTimeout(timeoutId);
        if (activeLoadIdRef.current !== loadId) return;
        tryCandidate(index + 1);
      };
    };

    tryCandidate(0);

    return () => {
      if (activeLoadIdRef.current === loadId) {
        activeLoadIdRef.current = null;
      }
    };
  }, [src, ean, isDefaultImage, fallbacks.join("|")]);

  return (
    <div className={`relative w-full h-full flex items-center justify-center ${className}`}>
      <AnimatePresence mode="popLayout">
        {currentSrc ? (
          <motion.img
            key={currentSrc}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            src={currentSrc}
            alt={alt}
            className="w-full h-full object-contain p-12 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
            draggable={false}
          />
        ) : hardError ? (
          <motion.div
            key="no-image"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full h-full flex items-center justify-center p-12"
          >
            <Package className="w-48 h-48 text-white/10" />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
