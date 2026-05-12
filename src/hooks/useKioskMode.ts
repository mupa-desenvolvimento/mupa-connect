import { useEffect, useState, useCallback, useRef } from 'react';

export function useKioskMode() {
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wakeLock, setWakeLock] = useState<any>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showCursor, setShowCursor] = useState(true);
  
  const fullscreenRetryInterval = useRef<NodeJS.Timeout | null>(null);
  const idleTimeout = useRef<NodeJS.Timeout | null>(null);

  // 1. Detect PWA installation
  useEffect(() => {
    const checkPwa = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      setIsPwaInstalled(!!isStandalone);
    };

    checkPwa();
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkPwa);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('PWA: beforeinstallprompt fired');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // 2. Fullscreen Logic
  const enterFullscreen = useCallback(async () => {
    try {
      const docEl = document.documentElement;
      if (!document.fullscreenElement) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen({ navigationUI: 'hide' } as any);
        } else if ((docEl as any).webkitRequestFullscreen) {
          await (docEl as any).webkitRequestFullscreen((Element as any).ALLOW_KEYBOARD_INPUT);
        } else if ((docEl as any).mozRequestFullScreen) {
          await (docEl as any).mozRequestFullScreen();
        } else if ((docEl as any).msRequestFullscreen) {
          await (docEl as any).msRequestFullscreen();
        }
      }
      setIsFullscreen(true);
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  }, []);

  // 3. Keep Fullscreen Active (Continuous check)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) {
        console.log('Kiosk: Left fullscreen, attempting to re-enter...');
        // Small delay to prevent infinite loops
        setTimeout(enterFullscreen, 1000);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    // Light interval to force fullscreen if Android navbar reappears
    // Optimizado para Android 9 / X96
    fullscreenRetryInterval.current = setInterval(() => {
      const isActuallyFull = document.fullscreenElement || (document as any).webkitFullscreenElement;
      if (!isActuallyFull) {
        enterFullscreen();
      }
    }, 5000);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      if (fullscreenRetryInterval.current) clearInterval(fullscreenRetryInterval.current);
    };
  }, [enterFullscreen]);

  // 4. Wake Lock (Prevent Sleep)
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        const lock = await (navigator as any).wakeLock.request('screen');
        setWakeLock(lock);
        console.log('Wake Lock: Active');
        
        lock.addEventListener('release', () => {
          console.log('Wake Lock: Released');
        });
      } catch (err) {
        console.error('Wake Lock request failed:', err);
      }
    }
  }, []);

  useEffect(() => {
    requestWakeLock();
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
        enterFullscreen();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', enterFullscreen);
    window.addEventListener('touchstart', enterFullscreen, { once: true });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', enterFullscreen);
      if (wakeLock) wakeLock.release();
    };
  }, [requestWakeLock, enterFullscreen, wakeLock]);

  // 5. Idle Cursor Hiding
  useEffect(() => {
    const resetIdle = () => {
      setLastActivity(Date.now());
      setShowCursor(true);
      if (idleTimeout.current) clearTimeout(idleTimeout.current);
      idleTimeout.current = setTimeout(() => setShowCursor(false), 3000);
    };

    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('touchstart', resetIdle);
    window.addEventListener('keydown', resetIdle);

    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('touchstart', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      if (idleTimeout.current) clearTimeout(idleTimeout.current);
    };
  }, []);

  // 6. Block context menu
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  const installPwa = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA: User choice outcome: ${outcome}`);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  return {
    isPwaInstalled,
    deferredPrompt,
    isFullscreen,
    showCursor,
    installPwa,
    enterFullscreen
  };
}
