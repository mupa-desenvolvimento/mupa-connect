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
  ChevronRight
} from "lucide-react";

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
  const [status, setStatus] = useState<"idle" | "analyzing" | "active">("idle");
  const [fps, setFps] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(Date.now());
  const framesRef = useRef<number>(0);

  // Load models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
        ]);
        setModelsLoaded(true);
        startCamera();
      } catch (err) {
        console.error("Error loading models:", err);
        setError("Erro ao carregar inteligência artificial.");
      }
    };
    loadModels();
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user" 
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setFaceDetectionActive(true);
          setStatus("analyzing");
          startDetectionLoop();
        };
      }
    } catch (err) {
      setError("Câmera não disponível.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setFaceDetectionActive(false);
    setStatus("idle");
  };

  const startDetectionLoop = useCallback(() => {
    const detect = async () => {
      if (!videoRef.current || !canvasRef.current || !modelsLoaded) {
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
        // Use TinyFaceDetector for performance on Android/WebView
        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 });
        const detections = await faceapi
          .detectAllFaces(videoRef.current, options)
          .withFaceLandmarks()
          .withFaceExpressions()
          .withAgeAndGender();

        if (detections.length > 0) {
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
          setStatus("analyzing");
          setDetectedFaces([]);
          const ctx = canvasRef.current.getContext('2d');
          ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      } catch (err) {
        console.error("Detection error:", err);
      }

      requestRef.current = requestAnimationFrame(detect);
    };
    requestRef.current = requestAnimationFrame(detect);
  }, [modelsLoaded]);

  const drawOverlay = (detections: any[]) => {
    if (!canvasRef.current || !videoRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const displaySize = { width: videoRef.current.offsetWidth, height: videoRef.current.offsetHeight };
    faceapi.matchDimensions(canvasRef.current, displaySize);
    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    resizedDetections.forEach((d) => {
      const { x, y, width, height } = d.detection.box;
      
      // Draw premium box with glow
      ctx.strokeStyle = '#22d3ee'; // Cyan-400
      ctx.lineWidth = 2;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#22d3ee';
      
      // Corner borders style
      const cornerSize = 20;
      
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
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 contrast-150" />
      </div>

      {/* Camera Feed */}
      <div className="absolute inset-0 z-10">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover scale-x-[-1]"
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full z-20"
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
              <div className="flex items-center gap-2">
                <Timer className="w-3 h-3 text-cyan-400" />
                <span className="text-[10px] font-mono text-white/60">LATENCY: 42ms</span>
              </div>
            </GlassCard>
            
            <button 
              onClick={toggleFullscreen}
              className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-md pointer-events-auto"
            >
              {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Center Status */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {status === "idle" && (
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
                          <h3 className="text-xl font-bold text-white tracking-tight">Visitante #01</h3>
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

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] pointer-events-auto"
          >
            <div className="bg-red-500/20 backdrop-blur-xl border border-red-500/50 px-6 py-4 rounded-2xl flex items-center gap-4">
              <div className="p-2 bg-red-500 rounded-lg">
                <X className="w-5 h-5 text-white" onClick={() => setError(null)} />
              </div>
              <div>
                <p className="text-white font-bold">Sistema Offline</p>
                <p className="text-white/60 text-xs">{error}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
