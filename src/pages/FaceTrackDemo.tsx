import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Smile, 
  UserCheck, 
  Eye, 
  Activity,
  AlertCircle
} from "lucide-react";
import * as faceapi from "face-api.js";

interface DetectedFace {
  id: string;
  age: number;
  gender: string;
  genderProbability: number;
  emotion: string;
  emotionProbability: number;
  allEmotions: Array<{ expression: string; probability: number }>;
  timestamp: Date;
}

export default function FaceTrackDemoPage() {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceDetectionActive, setFaceDetectionActive] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        console.log("[Face Track Demo] Loading models from:", MODEL_URL);
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
        ]);
        
        console.log("[Face Track Demo] All models loaded successfully!");
        setModelsLoaded(true);
        startCamera();
      } catch (error) {
        console.error("[Face Track Demo] Error loading models:", error);
        setError("Erro ao carregar modelos de detecção facial. Verifique se os arquivos estão em /models");
      }
    };

    const startCamera = async () => {
      if (!videoRef.current) return;
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          console.log("[Face Track Demo] Camera started! Video dimensions:", videoRef.current?.videoWidth, "x", videoRef.current?.videoHeight);
          
          // Initialize canvas dimensions
          if (canvasRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
          }
          
          setFaceDetectionActive(true);
          startDetectionLoop();
        };
      } catch (error) {
        console.error("[Face Track Demo] Error accessing camera:", error);
        setError("Erro ao acessar a câmera. Verifique as permissões do navegador.");
      }
    };

    const startDetectionLoop = () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      
      console.log("[Face Track Demo] Starting detection loop...");
      
      detectionIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;
        
        console.log("[Face Track Demo] Detection running... Video ready:", !!videoRef.current.videoWidth, "x", !!videoRef.current.videoHeight);
        
        try {
          const options = new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.3
          });
          
          const result = await faceapi
            .detectAllFaces(videoRef.current, options)
            .withFaceLandmarks()
            .withFaceExpressions()
            .withAgeAndGender();
          
          console.log(`[Face Track Demo] Detection result length:`, result.length);
          
          if (result.length > 0) {
            console.log(`[Face Track Demo] Detected ${result.length} face(s)!`);
          }
          
          const newFaces: DetectedFace[] = result.map((face, index) => {
            const expressions = face.expressions.asSortedArray();
            const mostProbableExpression = expressions[0];
            
            return {
              id: `face_${Date.now()}_${index}`,
              age: Math.round(face.age),
              gender: face.gender,
              genderProbability: face.genderProbability,
              emotion: mostProbableExpression.expression,
              emotionProbability: mostProbableExpression.probability,
              allEmotions: expressions.map((exp: any) => ({
                expression: exp.expression,
                probability: exp.probability
              })),
              timestamp: new Date()
            };
          });
          
          setDetectedFaces(newFaces);
          
          if (result.length > 0 && overlayCanvasRef.current) {
            const displaySize = { 
              width: videoRef.current.videoWidth, 
              height: videoRef.current.videoHeight 
            };
            
            faceapi.matchDimensions(overlayCanvasRef.current, displaySize);
            const resizedDetections = faceapi.resizeResults(result, displaySize);
            
            const ctx = overlayCanvasRef.current.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
              faceapi.draw.drawDetections(overlayCanvasRef.current, resizedDetections);
              faceapi.draw.drawFaceLandmarks(overlayCanvasRef.current, resizedDetections);
            }
          } else if (overlayCanvasRef.current) {
            const ctx = overlayCanvasRef.current.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
            }
          }
        } catch (err) {
          console.error("[Face Track Demo] Detection error:", err);
        }
      }, 1000); // Detect every 1 second
    };

    const cleanup = () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };

    loadModels();

    return cleanup;
  }, []);

  const getEmotionIcon = (emotion: string) => {
    switch (emotion.toLowerCase()) {
      case 'happy':
        return <Smile className="h-5 w-5 text-yellow-400" />;
      case 'sad':
        return <User className="h-5 w-5 text-blue-400" />;
      case 'angry':
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      case 'surprised':
        return <Eye className="h-5 w-5 text-purple-400" />;
      case 'neutral':
      default:
        return <UserCheck className="h-5 w-5 text-gray-400" />;
    }
  };

  const getGenderBadge = (gender: string, probability: number) => {
    const isMale = gender.toLowerCase() === 'male';
    return (
      <Badge 
        variant="outline" 
        className={`${isMale ? 'border-blue-500/30 text-blue-400' : 'border-pink-500/30 text-pink-400'}`}
      >
        {isMale ? 'Masculino' : 'Feminino'} • {(probability * 100).toFixed(0)}%
      </Badge>
    );
  };

  const getEmotionBadge = (emotion: string, probability: number) => {
    return (
      <Badge 
        variant="outline" 
        className="border-white/10 text-white/80"
      >
        {emotion} • {(probability * 100).toFixed(0)}%
      </Badge>
    );
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Main Camera Feed */}
      <div className="flex-1 flex flex-col">
        <PageHeader 
          title="Face Track Demo" 
          description="Demonstração de detecção facial para análise de audiência"
        />
        
        <div className="flex-1 p-6 flex items-center justify-center">
          {error ? (
            <Card className="max-w-md bg-red-500/10 border-red-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-red-400">
                  <AlertCircle className="h-6 w-6" />
                  <p className="font-medium">{error}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="relative w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10">
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                className="w-full h-full object-cover"
              />
              <canvas 
                ref={canvasRef} 
                className="absolute top-0 left-0 w-0 h-0"
              />
              <canvas 
                ref={overlayCanvasRef} 
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
              />
              
              {!faceDetectionActive && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                  <div className="text-center">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
                    <p className="text-white/60 font-mono">Iniciando detecção facial...</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Sidebar with Detected Faces */}
      <div className="w-80 bg-card/50 border-l border-white/5 p-6 overflow-y-auto">
        <div className="mb-6">
          <h3 className="font-display font-bold text-lg mb-2 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Rostos Detectados
          </h3>
          <p className="text-xs text-muted-foreground">
            {detectedFaces.length} rosto{detectedFaces.length !== 1 ? 's' : ''} sendo analisado{detectedFaces.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="space-y-4">
          {detectedFaces.length === 0 ? (
            <Card className="bg-card/30 border-dashed border-white/10">
              <CardContent className="pt-6 pb-6 text-center">
                <User className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Nenhum rosto detectado ainda
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Coloque seu rosto na frente da câmera
                </p>
              </CardContent>
            </Card>
          ) : (
            detectedFaces.map((face) => (
              <Card key={face.id} className="bg-card/40 border-white/5 overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-display flex items-center gap-2">
                      {getEmotionIcon(face.emotion)}
                      <span>Rosto #{face.id.split('_')[2]}</span>
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px]">
                      {face.timestamp.toLocaleTimeString('pt-BR')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-bold text-white">{face.age} anos</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getGenderBadge(face.gender, face.genderProbability)}
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {getEmotionBadge(face.emotion, face.emotionProbability)}
                    </div>
                    
                    <div className="pt-2 border-t border-white/5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                        Todas as Expressões
                      </p>
                      <div className="space-y-1">
                        {face.allEmotions.slice(0, 4).map((exp, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-white/60 capitalize">{exp.expression}</span>
                            <span className="text-white/40">{(exp.probability * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        
        <div className="mt-8 pt-6 border-t border-white/5">
          <p className="text-[10px] text-muted-foreground/60 text-center">
            Os dados capturados nesta página não são salvos no banco de dados.
          </p>
        </div>
      </div>
    </div>
  );
}
