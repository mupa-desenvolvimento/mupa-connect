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
import PlayerMonitoring from "./pages/PlayerMonitoring";
import ProductQueriesAnalytics from "./pages/ProductQueriesAnalytics";
import UsersPage from "./pages/Users";
import QuickAccessPage from "./pages/QuickAccess";
import NOCDashboard from "./pages/admin/NOCDashboard";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";

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

              {/* Acesso Rápido - Sem login obrigatório (protegido por token) */}
              <Route path="/quick-access/:token" element={<QuickAccessPage />} />

              {/* Painel Empresa - Protegido */}
              <Route element={session ? <AppLayout /> : <Login />}>
                <Route path="/" element={<Dashboard />} />
                
                {/* ADMIN GLOBAL ONLY */}
                <Route path="/superadmin" element={
                  <ProtectedRoute requireAdmin allowedRoles={["admin_global"]}>
                    <SuperAdmin />
                  </ProtectedRoute>
                } />
                
                <Route path="/admin/player-logs" element={
                  <ProtectedRoute allowedRoles={["admin_global"]}>
                    <PlayerMonitoring />
                  </ProtectedRoute>
                } />

                {/* COMPANY ADMIN ONLY */}
                <Route path="/usuarios" element={
                  <ProtectedRoute requireAdmin>
                    <UsersPage />
                  </ProtectedRoute>
                } />
                <Route path="/lojas" element={
                  <ProtectedRoute requireAdmin>
                    <Stores />
                  </ProtectedRoute>
                } />
                <Route path="/grupos" element={
                  <ProtectedRoute requireAdmin>
                    <Groups />
                  </ProtectedRoute>
                } />
                <Route path="/configuracoes" element={
                  <ProtectedRoute requireAdmin>
                    <Settings />
                  </ProtectedRoute>
                } />

                {/* TECNICO / ADMIN */}
                <Route path="/dispositivos" element={
                  <ProtectedRoute requireTecnico>
                    <Devices />
                  </ProtectedRoute>
                } />
                <Route path="/dispositivos/:id" element={
                  <ProtectedRoute requireTecnico>
                    <DeviceDetail />
                  </ProtectedRoute>
                } />

                {/* MARKETING / ADMIN */}
                <Route path="/midias" element={
                  <ProtectedRoute requireMarketing>
                    <Media />
                  </ProtectedRoute>
                } />
                <Route path="/playlists" element={
                  <ProtectedRoute requireMarketing>
                    <Playlists />
                  </ProtectedRoute>
                } />
                <Route path="/playlists/:id" element={
                  <ProtectedRoute requireMarketing>
                    <PlaylistEditor />
                  </ProtectedRoute>
                } />
                <Route path="/campanhas" element={
                  <ProtectedRoute requireMarketing>
                    <Campaigns />
                  </ProtectedRoute>
                } />

                <Route path="/admin/analytics/consultas" element={<ProductQueriesAnalytics />} />
                <Route path="/admin/monitoring" element={
                  <ProtectedRoute requireTecnico>
                    <NOCDashboard />
                  </ProtectedRoute>
                } />
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
