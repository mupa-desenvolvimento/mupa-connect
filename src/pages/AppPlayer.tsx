import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayerEngine } from "@/components/PlayerEngine";
import { usePlaylists, useTenant } from "@/hooks/use-playlist-data";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Monitor, Scan, User } from "lucide-react";
import { cn } from "@/lib/utils";
import * as faceapi from "face-api.js";

interface DetectedFace {
  id: string;
  age: number;
  gender: string;
  genderProbability: number;
  emotion: string;
  emotionProbability: number;
}

function FaceDetectionPanel({ active }: { active: boolean }) {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faces, setFaces] = useState<DetectedFace[]>([]);
  const [cameraReady, setCameraReady] = useState(false);
  const [videoSize, setVideoSize] = useState<{ w: number; h: number } | null>(null);
  const [lastRunAt, setLastRunAt] = useState<number | null>(null);
  const [lastDetectionError, setLastDetectionError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      setError(null);
      setFaces([]);
      setCameraReady(false);
      setVideoSize(null);
      setLastRunAt(null);
      setLastDetectionError(null);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      startedRef.current = false;
      return;
    }

    let cancelled = false;

    const ensureModels = async () => {
      if (modelsLoaded) return;
      setLoadingModels(true);
      try {
        const MODEL_URL = "/models";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
        ]);
        if (!cancelled) setModelsLoaded(true);
      } catch (e: any) {
        if (!cancelled) setError("Erro ao carregar modelos de detecção facial. Verifique se os arquivos estão em /models");
      } finally {
        if (!cancelled) setLoadingModels(false);
      }
    };

    const startCamera = async () => {
      if (!videoRef.current) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (!videoRef.current) return;
          setVideoSize({ w: videoRef.current.videoWidth, h: videoRef.current.videoHeight });
        };
        videoRef.current.onplaying = () => {
          setCameraReady(true);
          if (!videoRef.current) return;
          setVideoSize({ w: videoRef.current.videoWidth, h: videoRef.current.videoHeight });
        };
        await videoRef.current.play().catch(() => {});
      } catch (e: any) {
        if (!cancelled) setError("Erro ao acessar a câmera. Verifique as permissões do navegador.");
      }
    };

    const startLoop = () => {
      if (!videoRef.current || intervalRef.current) return;
      intervalRef.current = window.setInterval(async () => {
        if (!videoRef.current) return;
        if (videoRef.current.readyState < 2) return;
        try {
          setLastRunAt(Date.now());
          const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 });
          const result = await faceapi
            .detectAllFaces(videoRef.current, options)
            .withFaceLandmarks()
            .withFaceExpressions()
            .withAgeAndGender();

          const newFaces: DetectedFace[] = result.map((face, idx) => {
            const expressions = face.expressions.asSortedArray();
            const top = expressions[0];
            return {
              id: `face_${Date.now()}_${idx}`,
              age: Math.round(face.age),
              gender: face.gender,
              genderProbability: face.genderProbability,
              emotion: top?.expression || "neutral",
              emotionProbability: top?.probability || 0,
            };
          });
          setFaces(newFaces);
          setLastDetectionError(null);

          if (overlayCanvasRef.current && videoRef.current) {
            const displaySize = {
              width: videoRef.current.videoWidth,
              height: videoRef.current.videoHeight,
            };
            const ctx = overlayCanvasRef.current.getContext("2d");
            if (!ctx) return;

            if (!displaySize.width || !displaySize.height) {
              ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
              return;
            }

            faceapi.matchDimensions(overlayCanvasRef.current, displaySize);
            const resized = faceapi.resizeResults(result, displaySize);

            ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
            resized.forEach((det: any, idx: number) => {
              const face = newFaces[idx];
              const label = face
                ? `${face.age}a • ${face.gender} ${(face.genderProbability * 100).toFixed(0)}% • ${face.emotion}`
                : "Rosto";
              const drawBox = new faceapi.draw.DrawBox(det.detection.box, { label });
              drawBox.draw(overlayCanvasRef.current!);
            });
          }
        } catch (e: any) {
          setLastDetectionError(e?.message || "Falha ao executar detecção");
        }
      }, 300);
    };

    const start = async () => {
      if (startedRef.current) return;
      startedRef.current = true;
      await ensureModels();
      if (cancelled) return;
      await startCamera();
      if (cancelled) return;
      startLoop();
    };

    start();

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      setCameraReady(false);
    };
  }, [active, modelsLoaded]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Face Detection Demo
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <Badge variant="outline">{modelsLoaded ? "Modelos OK" : "Modelos..."}</Badge>
              <Badge variant="outline">{cameraReady ? "Câmera OK" : "Câmera..."}</Badge>
              <Badge variant="outline" className="font-mono">
                {(videoSize?.w || 0) > 0 ? `${videoSize!.w}x${videoSize!.h}` : "—"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : (
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-white/10">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              <canvas ref={overlayCanvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />
              {(loadingModels || !modelsLoaded) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando modelos...
                  </div>
                </div>
              )}
              {modelsLoaded && !cameraReady && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <div className="text-sm text-white/70">Aguardando permissão da câmera...</div>
                </div>
              )}
            </div>
          )}
          {lastDetectionError && <div className="mt-3 text-xs text-destructive">{lastDetectionError}</div>}
          {!lastDetectionError && modelsLoaded && cameraReady && (lastRunAt === null || Date.now() - lastRunAt > 2000) && (
            <div className="mt-3 text-xs text-muted-foreground">Detecção ainda não iniciou. Verifique permissões e iluminação.</div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span>Rostos Detectados</span>
            <Badge variant="outline">{faces.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {faces.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Nenhum rosto detectado. Centralize o rosto e aumente a iluminação.
            </div>
          ) : (
            faces.map((f) => (
              <div key={f.id} className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">ID</span>
                  <span className="text-xs font-mono text-muted-foreground">{f.id.split("_").slice(-1)[0]}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Idade</span>
                  <span className="text-xs text-muted-foreground">{f.age} anos</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Gênero</span>
                  <span className="text-xs text-muted-foreground">
                    {f.gender} • {(f.genderProbability * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Emoção</span>
                  <span className="text-xs text-muted-foreground">
                    {f.emotion} • {(f.emotionProbability * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AppPlayerPage() {
  const { data: contextId, isSuperAdmin } = useTenant();
  const { data: playlistsData, isLoading: isLoadingPlaylists } = usePlaylists(contextId || undefined, isSuperAdmin);

  const [playlistId, setPlaylistId] = useState<string>("");
  const [codbar, setCodbar] = useState("");
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<any[] | null>(null);

  const playlists = playlistsData || [];

  const selectedPlaylist = useMemo(() => playlists.find((p: any) => p.id === playlistId) || null, [playlists, playlistId]);

  const playbackItems = useMemo(() => {
    const items = (selectedPlaylist?.playlist_items || [])
      .slice()
      .sort((a: any, b: any) => (a.position ?? a.ordem ?? 0) - (b.position ?? b.ordem ?? 0))
      .map((it: any) => {
        const media = it.media_items;
        if (!media?.file_url) return null;
        const type = media.type === "video" ? "video" : "image";
        return {
          id: String(media.id),
          url: media.file_url,
          type,
          duration: it.duracao || 10,
          name: media.name || "Mídia",
        };
      })
      .filter(Boolean);
    return items as any[];
  }, [selectedPlaylist]);

  const runProductQuery = async () => {
    const normalized = codbar.trim();
    if (!normalized) return;
    setQueryLoading(true);
    setQueryError(null);
    setQueryResult(null);
    try {
      const { data, error } = await supabase.rpc("get_produto_por_codbar", { p_codbar: normalized } as any);
      if (error) throw error;
      setQueryResult((data as any[]) || []);
    } catch (e: any) {
      setQueryError(e?.message || "Erro ao consultar produto");
    } finally {
      setQueryLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="AppPlayer (Demo)" description="Demonstração: playlist contínua, consulta de produto e face detection." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-primary" />
              Playlist Runner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Playlist</div>
              <Select value={playlistId} onValueChange={setPlaylistId}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingPlaylists ? "Carregando..." : "Selecione uma playlist"} />
                </SelectTrigger>
                <SelectContent>
                  {playlists.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name || "Sem nome"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Badge variant="outline">{playbackItems.length} itens</Badge>
              <Badge variant="secondary" className={cn(!selectedPlaylist?.is_active && "opacity-70")}>
                {selectedPlaylist ? (selectedPlaylist.is_active ? "Ativa" : "Inativa") : "—"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>Preview</span>
              <Badge variant="outline" className="font-mono">
                {selectedPlaylist?.name || "Nenhuma"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full aspect-video rounded-lg overflow-hidden border border-white/10 bg-black">
              {playbackItems.length > 0 ? (
                <PlayerEngine playlist={playbackItems as any} volume={0} serial="APPPLAYER" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-white/50">
                  Selecione uma playlist com itens para iniciar.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <FaceDetectionPanel active={true} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-4 w-4 text-primary" />
              Consulta de Produto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={codbar} onChange={(e) => setCodbar(e.target.value)} placeholder="Digite o código de barras (EAN)" />
            <Button onClick={runProductQuery} disabled={queryLoading || !codbar.trim()} className="w-full">
              {queryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Consultar"}
            </Button>
            {queryError && <div className="text-sm text-destructive">{queryError}</div>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle>Resultado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!queryResult ? (
              <div className="text-sm text-muted-foreground">Faça uma consulta para ver o resultado.</div>
            ) : queryResult.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhum resultado para este código.</div>
            ) : (
              queryResult.map((r: any, idx: number) => (
                <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">EAN</span>
                    <span className="text-xs font-mono text-muted-foreground">{r.codbar}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Descrição</span>
                    <span className="text-xs text-muted-foreground text-right">{r.description}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Última atualização</span>
                    <span className="text-xs text-muted-foreground">{r.last_update}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Consultas</span>
                    <span className="text-xs text-muted-foreground">{r.num_consultas}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
