import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as faceapi from "face-api.js";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Maximize, 
  Minimize, 
  Camera, 
  X, 
  Activity, 
  User, 
  Smile, 
  Timer, 
  Users, 
  Zap,
  ArrowLeft,
  Scan,
  Cpu,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  AlertCircle
} from "lucide-react";

// Detection for Android WebView
const isAndroidWebView = () => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return userAgent.includes('wv') || (userAgent.includes('android') && userAgent.includes('version/'));
};

const log = (tag: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString().split('T')[1].split('Z')[0];
  const prefix = `[${timestamp}] [${tag}]`;
  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
};

// --- Types ---
interface DetectedFace {
  id: string;
  age: number;
  gender: string;
  genderProbability: number;
  emotion: string;
  emotionProbability: number;
  box: faceapi.Box;
  landmarks: faceapi.FaceLandmarks68;
  timestamp: number;
}

// --- Components ---

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] ${className}`}>
    {children}
  </div>
);

const HUDLabel = ({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) => (
  <div className="flex items-center gap-3 py-2 px-3">
    <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
      <Icon className="w-4 h-4 text-cyan-400" />
    </div>
    <div>
      <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium">{label}</p>
      <p className="text-sm font-bold text-white tracking-tight">{value}</p>
    </div>
  </div>
);

export default function FaceDemo() {
  const navigate = useNavigate();
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceDetectionActive, setFaceDetectionActive] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHUD, setShowHUD] = useState(true);
  const [status, setStatus] = useState<"idle" | "initializing" | "analyzing" | "active">("initializing");
  const [fps, setFps] = useState(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [retryCount, setRetryCount] = useState(0);
  const [detectionConfig, setDetectionConfig] = useState({ inputSize: 224, scoreThreshold: 0.5, label: "Premium (224px)" });
  const consecutiveEmptyFramesRef = useRef(0);
  const currentConfigIdxRef = useRef(0);
  
  const configs = [
    { inputSize: 224, scoreThreshold: 0.5, label: "Premium (224px)" },
    { inputSize: 160, scoreThreshold: 0.4, label: "Balanced (160px)" },
    { inputSize: 128, scoreThreshold: 0.3, label: "Fast (128px)" }
  ];
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(Date.now());
  const framesRef = useRef<number>(0);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Load models
  useEffect(() => {
    let isMounted = true;
    const loadModels = async () => {
      try {
        log("MODELS", "Iniciando carregamento dos modelos...");
        const MODEL_URL = '/models';
        
        // Load one by one for better error tracking
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        log("MODELS", "TinyFaceDetector carregado");
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        log("MODELS", "FaceLandmark68 carregado");
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        log("MODELS", "FaceExpression carregado");
        await faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL);
        log("MODELS", "AgeGender carregado");
        
        if (isMounted) {
          log("MODELS", "Todos os modelos carregados com sucesso");
          setModelsLoaded(true);
          // Small delay before starting camera
          setTimeout(() => startCamera(), 500);
        }
      } catch (err) {
        log("MODELS", "Erro crítico ao carregar modelos", err);
        if (isMounted) {
          setError("Erro ao carregar inteligência artificial. Verifique a conexão.");
        }
      }
    };
    loadModels();
    return () => {
      isMounted = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      stopCamera();
    };
  }, []);

  const startCamera = async (mode?: "user" | "environment") => {
    log("CAMERA", "Iniciando processo de captura...");
    setStatus("initializing");
    setError(null);

    const isWV = isAndroidWebView();
    log("WEBVIEW", `Detectado Android WebView: ${isWV}`);

    try {
      const actualMode = mode || facingMode;
      log("CAMERA", `Solicitando permissão para modo: ${actualMode}`);

      // Basic constraints first for maximum compatibility
      const constraints: MediaStreamConstraints = {
        video: { 
          facingMode: actualMode,
          // Older Android WebView (like Android 9) may fail with high resolutions
          width: isWV ? { ideal: 640 } : { ideal: 1280 },
          height: isWV ? { ideal: 480 } : { ideal: 720 }
        },
        audio: false
      };

      log("GET USER MEDIA", "Chamando getUserMedia com constraints:", constraints);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        log("MEDIA DEVICES", "navigator.mediaDevices.getUserMedia não suportado neste navegador");
        throw new Error("API de Câmera não suportada");
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      log("CAMERA", "Stream obtido com sucesso");
      
      cameraStreamRef.current = stream;

      if (videoRef.current) {
        log("CAMERA", "Vinculando stream ao elemento de vídeo");
        
        // Use srcObject for modern browsers
        videoRef.current.srcObject = stream;
        
        // Add listeners for debugging
        videoRef.current.onplaying = () => log("VIDEO", "Evento: playing");
        videoRef.current.onpause = () => log("VIDEO", "Evento: pause");
        videoRef.current.onerror = (e) => log("VIDEO", "Evento: error", e);

        // Ensure crossOrigin is set for face-api
        videoRef.current.setAttribute('crossorigin', 'anonymous');
        
        // Manual play for WebView compatibility
        try {
          await videoRef.current.play();
          log("CAMERA", "Vídeo iniciado (play)");
          
          // Force detection to start after short delay to ensure hardware is ready
          setTimeout(() => {
            log("DETECTION", "Ativando detecção facial...");
            setFaceDetectionActive(true);
            setStatus("analyzing");
            startDetectionLoop();
          }, 500);
        } catch (playErr) {
          log("CAMERA", "Erro ao iniciar play() automático, aguardando metadados", playErr);
          
          // Fallback: try playing on loadedmetadata
          videoRef.current.onloadedmetadata = async () => {
            log("CAMERA", "Metadados do vídeo carregados");
            try {
              await videoRef.current?.play();
              log("CAMERA", "Vídeo iniciado via metadata");
              setFaceDetectionActive(true);
              setStatus("analyzing");
              startDetectionLoop();
            } catch (innerErr) {
              log("CAMERA", "Falha crítica ao iniciar vídeo", innerErr);
            }
          };
        }
      }
    } catch (err: any) {
      log("CAMERA", "Erro ao inicializar câmera", err);
      
      let errorMessage = "Câmera indisponível.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = "Acesso à câmera negado. Verifique as permissões do aplicativo.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = "Nenhuma câmera encontrada no dispositivo.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = "Câmera está sendo usada por outro aplicativo.";
      }
      
      setError(errorMessage);
      setStatus("idle");

      // Auto-retry once if it's not a permission error
      if (retryCount < 1 && err.name !== 'NotAllowedError') {
        setRetryCount(prev => prev + 1);
        log("CAMERA", "Tentando reiniciar automaticamente em 2 segundos...");
        setTimeout(() => startCamera(mode), 2000);
      }
    }
  };

  const stopCamera = () => {
    log("CAMERA", "Parando câmera...");
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => {
        track.stop();
        log("CAMERA", `Track ${track.kind} parado`);
      });
      cameraStreamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setFaceDetectionActive(false);
    setStatus("idle");
  };

  const handleRetry = () => {
    setRetryCount(0);
    startCamera();
  };

  const startDetectionLoop = useCallback(() => {
    const detect = async () => {
      if (!videoRef.current || !canvasRef.current || !modelsLoaded || !faceDetectionActive) {
        requestRef.current = requestAnimationFrame(detect);
        return;
      }

      // Check if video is actually playing and has valid dimensions
      if (videoRef.current.paused || videoRef.current.ended || videoRef.current.readyState < 2) {
        requestRef.current = requestAnimationFrame(detect);
        return;
      }

      // Performance monitoring
      framesRef.current++;
      const now = Date.now();
      if (now - lastTimeRef.current >= 1000) {
        setFps(framesRef.current);
        framesRef.current = 0;
        lastTimeRef.current = now;
      }

      try {
        // Log detection start once for debugging
        if (framesRef.current === 1) {
          log("DETECTION", "Iniciando detecção no frame atual");
        }

        // Dynamic fallback system for WebView/Android 9 compatibility
        const options = new faceapi.TinyFaceDetectorOptions({ 
          inputSize: detectionConfig.inputSize, 
          scoreThreshold: detectionConfig.scoreThreshold 
        });
        
        const detections = await faceapi
          .detectAllFaces(videoRef.current, options)
          .withFaceLandmarks()
          .withFaceExpressions()
          .withAgeAndGender();

        if (detections && detections.length > 0) {
          consecutiveEmptyFramesRef.current = 0;
          setStatus("active");
          const newFaces: DetectedFace[] = detections.map((d, i) => {
            const expressions = d.expressions.asSortedArray();
            return {
              id: `face-${i}`,
              age: Math.round(d.age),
              gender: d.gender === 'male' ? 'Masculino' : 'Feminino',
              genderProbability: d.genderProbability,
              emotion: expressions[0].expression,
              emotionProbability: expressions[0].probability,
              box: d.detection.box,
              landmarks: d.landmarks,
              timestamp: Date.now()
            };
          });
          setDetectedFaces(newFaces);
          drawOverlay(detections);
        } else {
          // Fallback logic: if no faces for 60 frames (~2-4 seconds depending on hardware)
          consecutiveEmptyFramesRef.current++;
          
          if (consecutiveEmptyFramesRef.current > 60) {
            consecutiveEmptyFramesRef.current = 0;
            const nextIdx = (currentConfigIdxRef.current + 1) % configs.length;
            if (nextIdx !== currentConfigIdxRef.current) {
              currentConfigIdxRef.current = nextIdx;
              const nextConfig = configs[nextIdx];
              log("FALLBACK", `Nenhum rosto detectado. Alternando para configuração: ${nextConfig.label}`);
              setDetectionConfig(nextConfig);
            }
          }

          if (status !== "analyzing") setStatus("analyzing");
          setDetectedFaces([]);
          
          // Use direct reference if possible to ensure we clear correctly
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
          }
        }
      } catch (err) {
        log("DETECTION", "Erro durante a detecção", err);
        // On critical error, try next config immediately
        consecutiveEmptyFramesRef.current = 0;
        const nextIdx = (currentConfigIdxRef.current + 1) % configs.length;
        currentConfigIdxRef.current = nextIdx;
        setDetectionConfig(configs[nextIdx]);
      }

      // Continue loop
      requestRef.current = requestAnimationFrame(detect);
    };

    // Use a small delay for the first execution to ensure everything is ready
    log("DETECTION", "Agendando início do loop de detecção");
    requestRef.current = requestAnimationFrame(detect);
  }, [modelsLoaded, faceDetectionActive, detectionConfig]);

  const drawOverlay = (detections: any[]) => {
    if (!canvasRef.current || !videoRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Use video dimensions for better overlay mapping
    const videoWidth = videoRef.current.videoWidth || videoRef.current.offsetWidth;
    const videoHeight = videoRef.current.videoHeight || videoRef.current.offsetHeight;
    
    // Set canvas internal resolution to match display size
    const displaySize = { 
      width: videoRef.current.offsetWidth, 
      height: videoRef.current.offsetHeight 
    };

    if (canvasRef.current.width !== displaySize.width || canvasRef.current.height !== displaySize.height) {
      faceapi.matchDimensions(canvasRef.current, displaySize);
    }
    
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    resizedDetections.forEach((d) => {
      const { x, y, width, height } = d.detection.box;
      
      // Draw premium box with glow
      ctx.strokeStyle = '#22d3ee'; // Cyan-400
      ctx.lineWidth = 2;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#22d3ee';
      
      const cornerSize = Math.min(width, height) * 0.2;
      
      // Top Left
      ctx.beginPath();
      ctx.moveTo(x, y + cornerSize);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerSize, y);
      ctx.stroke();
      
      // Top Right
      ctx.beginPath();
      ctx.moveTo(x + width - cornerSize, y);
      ctx.lineTo(x + width, y);
      ctx.lineTo(x + width, y + cornerSize);
      ctx.stroke();
      
      // Bottom Right
      ctx.beginPath();
      ctx.moveTo(x + width, y + height - cornerSize);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x + width - cornerSize, y + height);
      ctx.stroke();
      
      // Bottom Left
      ctx.beginPath();
      ctx.moveTo(x + cornerSize, y + height);
      ctx.lineTo(x, y + height);
      ctx.lineTo(x, y + height - cornerSize);
      ctx.stroke();

      // Scanner line animation
      const scanY = y + (Math.sin(Date.now() / 500) * 0.5 + 0.5) * height;
      ctx.beginPath();
      ctx.moveTo(x, scanY);
      ctx.lineTo(x + width, scanY);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Reset shadow for landmarks
      ctx.shadowBlur = 0;
      
      // Draw minimal landmarks (dots)
      ctx.fillStyle = 'rgba(34, 211, 238, 0.8)';
      d.landmarks.positions.forEach((p: any) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1, 0, 2 * Math.PI);
        ctx.fill();
      });
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const getEmotionText = (emotion: string) => {
    const map: Record<string, string> = {
      neutral: "Neutro",
      happy: "Feliz",
      sad: "Triste",
      angry: "Bravo",
      fearful: "Receoso",
      disgusted: "Indiferente",
      surprised: "Surpreso"
    };
    return map[emotion] || emotion;
  };

  return (
    <div className="fixed inset-0 bg-black text-white font-sans overflow-hidden select-none">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute inset-0 bg-black opacity-40 brightness-50 contrast-150" />
      </div>

      {/* Camera Feed */}
      <div className="absolute inset-0 z-10">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover will-change-transform ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full z-20 will-change-transform"
        />
      </div>

      {/* Sci-Fi HUD Overlays */}
      <div className="absolute inset-0 z-30 pointer-events-none">
        {/* Corners HUD */}
        <div className="absolute top-8 left-8 w-32 h-32 border-l border-t border-white/20 rounded-tl-3xl" />
        <div className="absolute top-8 right-8 w-32 h-32 border-r border-t border-white/20 rounded-tr-3xl" />
        <div className="absolute bottom-8 left-8 w-32 h-32 border-l border-b border-white/20 rounded-bl-3xl" />
        <div className="absolute bottom-8 right-8 w-32 h-32 border-r border-b border-white/20 rounded-br-3xl" />
        
        {/* Scanning Lines overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] z-10 bg-[length:100%_4px,3px_100%]" />
      </div>

      {/* Interactive UI */}
      <div className="relative z-40 h-full flex flex-col p-8 pointer-events-none">
        {/* Header */}
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/play')}
              className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-md"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tighter flex items-center gap-2">
                MUPA <span className="text-cyan-400 font-light">FACE DEMO</span>
                <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse ml-1" />
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold">Real-time Vision Intelligence v2.0</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <GlassCard className="px-4 py-2 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-3 h-3 text-cyan-400" />
                <span className="text-[10px] font-mono text-white/60">{fps} FPS</span>
              </div>
              <div className="w-px h-3 bg-white/10" />
              <button 
                onClick={() => setFaceDetectionActive(!faceDetectionActive)}
                className="flex items-center gap-2 pointer-events-auto hover:text-cyan-400 transition-colors"
              >
                <Activity className={`w-3 h-3 ${faceDetectionActive ? 'text-green-400' : 'text-red-400'}`} />
                <span className="text-[10px] font-mono text-white/60">{faceDetectionActive ? 'ACTIVE' : 'PAUSED'}</span>
              </button>
            </GlassCard>

            <GlassCard className="px-4 py-2 hidden md:flex items-center gap-2">
              <Zap className="w-3 h-3 text-yellow-400" />
              <span className="text-[10px] font-mono text-white/60 uppercase">{detectionConfig.label}</span>
            </GlassCard>
            
            <button 
              onClick={toggleFullscreen}
              className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-md pointer-events-auto"
              title="Tela Cheia"
            >
              {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
            </button>

            <button 
              onClick={() => {
                const newMode = facingMode === "user" ? "environment" : "user";
                setFacingMode(newMode);
                stopCamera();
                startCamera(newMode);
              }}
              className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-md pointer-events-auto"
              title="Alternar Câmera"
            >
              <Camera className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Center Status */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {status === "initializing" && (
              <motion.div 
                key="initializing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-6"
              >
                <RefreshCw className="w-16 h-16 text-cyan-400 animate-spin" />
                <div className="text-center">
                  <h2 className="text-xl font-light tracking-[0.2em] text-cyan-400 uppercase">Inicializando Hardware</h2>
                  <p className="text-white/40 text-sm mt-2 font-light">Configurando sensores de visão e câmera...</p>
                </div>
              </motion.div>
            )}

            {status === "idle" && error && (
              <motion.div 
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="flex flex-col items-center gap-6 max-w-md pointer-events-auto"
              >
                <div className="p-6 rounded-full bg-red-500/10 border border-red-500/30">
                  <AlertCircle className="w-16 h-16 text-red-500" />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">Câmera Indisponível</h2>
                  <p className="text-white/60 text-sm mt-2">{error}</p>
                </div>
                <button 
                  onClick={handleRetry}
                  className="px-8 py-3 rounded-full bg-white text-black font-bold flex items-center gap-2 hover:bg-cyan-400 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Tentar Novamente
                </button>
              </motion.div>
            )}

            {status === "idle" && !error && (
              <motion.div 
                key="idle"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="flex flex-col items-center gap-6"
              >
                <div className="relative">
                  <Scan className="w-24 h-24 text-white/20" />
                  <motion.div 
                    animate={{ y: [0, 96, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-0 left-0 w-full h-[2px] bg-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.8)]"
                  />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-light tracking-widest text-white/80 uppercase">Aguardando detecção facial</h2>
                  <p className="text-white/40 text-sm mt-2 font-light">Posicione-se em frente à câmera para iniciar a análise</p>
                </div>
              </motion.div>
            )}

            {status === "analyzing" && detectedFaces.length === 0 && (
              <motion.div 
                key="analyzing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
                  <span className="text-cyan-400 text-lg font-light tracking-[0.3em] uppercase animate-pulse">Analisando ambiente...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Data Cards */}
        <div className="flex justify-between items-end gap-6 pointer-events-auto">
          {/* Left: Global Stats */}
          <GlassCard className="p-2 min-w-[200px]">
            <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Ambiente</span>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] font-bold text-green-500 uppercase">Live</span>
              </div>
            </div>
            <div className="grid grid-cols-1 divide-y divide-white/5">
              <HUDLabel label="Pessoas" value={detectedFaces.length} icon={Users} />
              <HUDLabel label="Atenção" value={detectedFaces.length > 0 ? "84%" : "0%"} icon={Zap} />
              <HUDLabel label="Status" value={detectedFaces.length > 0 ? "Identificado" : "Varredura"} icon={ShieldCheck} />
            </div>
          </GlassCard>

          {/* Right: Specific Face Info */}
          <div className="flex gap-4">
            <AnimatePresence>
              {detectedFaces.map((face) => (
                <motion.div
                  key={face.id}
                  initial={{ opacity: 0, y: 40, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.9 }}
                  className="w-72"
                >
                  <GlassCard>
                    <div className="h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold mb-1">Perfil Detectado</p>
                          <h3 className="text-xl font-bold text-white tracking-tight">Visitante #{face.id.split('-')[1]}</h3>
                        </div>
                        <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                          <Smile className="w-5 h-5 text-white/80" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                          <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold mb-1">Idade Est.</p>
                          <p className="text-lg font-bold text-white">{face.age} <span className="text-xs font-light text-white/40">anos</span></p>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                          <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold mb-1">Gênero</p>
                          <p className="text-sm font-bold text-white truncate">{face.gender}</p>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-[9px] uppercase tracking-widest text-cyan-400/60 font-bold">Expressão</p>
                          <span className="text-[9px] font-mono text-cyan-400">{(face.emotionProbability * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white uppercase tracking-tight">{getEmotionText(face.emotion)}</span>
                          <ChevronRight className="w-4 h-4 text-cyan-400/40" />
                        </div>
                        <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${face.emotionProbability * 100}%` }}
                            className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 pt-1">
                        <Timer className="w-3 h-3 text-white/20" />
                        <span className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Tempo de Atenção: 00:14s</span>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

    </div>
  );
}
