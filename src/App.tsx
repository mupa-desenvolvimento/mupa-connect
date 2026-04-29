import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import AppLayout from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Devices from "./pages/Devices";
import DeviceDetail from "./pages/DeviceDetail";
import Media from "./pages/Media";
import Playlists from "./pages/Playlists";
import PlaylistEditor from "./pages/PlaylistEditor";
import Campaigns from "./pages/Campaigns";
import Stores from "./pages/Stores";
import Groups from "./pages/Groups";
import Settings from "./pages/Settings";
import Player from "./pages/Player";
import Login from "./pages/Login";
import SuperAdmin from "./pages/SuperAdmin";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound.tsx";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Rotas Públicas */}
              <Route path="/login" element={<Login />} />
              <Route path="/recuperar-senha" element={<ForgotPassword />} />
              <Route path="/redefinir-senha" element={<ResetPassword />} />
              
              {/* Player rota fullscreen, sem layout e sem auth obrigatória (usa deviceCode) */}
              <Route path="/play/:deviceCode" element={<Player />} />

              {/* Painel Empresa - Protegido */}
              <Route element={session ? <AppLayout /> : <Login />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/superadmin" element={<SuperAdmin />} />
                <Route path="/dispositivos" element={<Devices />} />
                <Route path="/dispositivos/:id" element={<DeviceDetail />} />
                <Route path="/playlists" element={<Playlists />} />
                <Route path="/playlists/:id" element={<PlaylistEditor />} />
                <Route path="/campanhas" element={<Campaigns />} />
                <Route path="/lojas" element={<Stores />} />
                <Route path="/grupos" element={<Groups />} />
                <Route path="/configuracoes" element={<Settings />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};


export default App;