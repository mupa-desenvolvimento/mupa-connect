import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Local memory cache for audio URLs to avoid even DB lookups
const audioUrlCache = new Map<string, string>();

export const useProductTTS = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTextRef = useRef<string | null>(null);

  /**
   * Speaks the given text and returns a Promise that resolves when audio finishes playing.
   */
  const speak = useCallback(async (text: string): Promise<void> => {
    if (!text || text.trim().length === 0) return;

    const cleanText = text.trim();

    // Don't repeat the same text
    if (currentTextRef.current === cleanText) return;
    currentTextRef.current = cleanText;

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    try {
      let audioUrl: string | undefined;

      // Check local memory cache first
      const cachedUrl = audioUrlCache.get(cleanText);
      if (cachedUrl) {
        console.log("[TTS] Memory cache hit");
        audioUrl = cachedUrl;
      } else {
        // Call edge function (handles DB cache internally)
        const { data, error } = await supabase.functions.invoke("elevenlabs-tts", {
          body: { text: cleanText },
        });

        if (error || !data) {
          console.error("[TTS] Error:", error);
          currentTextRef.current = null;
          return;
        }

        if (data.audio_url) {
          audioUrl = data.audio_url;
          audioUrlCache.set(cleanText, audioUrl);
        } else if (data.audio_base64) {
          audioUrl = `data:audio/mpeg;base64,${data.audio_base64}`;
        } else {
          console.error("[TTS] No audio data returned");
          currentTextRef.current = null;
          return;
        }
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Return a promise that resolves when audio finishes
      return new Promise<void>((resolve) => {
        audio.onended = () => {
          currentTextRef.current = null;
          resolve();
        };
        audio.onerror = () => {
          currentTextRef.current = null;
          resolve();
        };
        audio.play().catch(() => {
          currentTextRef.current = null;
          resolve();
        });
      });
    } catch (err) {
      console.error("[TTS] Playback error:", err);
      currentTextRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    currentTextRef.current = null;
  }, []);

  return { speak, stop };
};
