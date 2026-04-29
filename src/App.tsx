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
import Campaigns from "./pages/Campaigns";
import Stores from "./pages/Stores";
import Groups from "./pages/Groups";
import Settings from "./pages/Settings";
import Player from "./pages/Player";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Player rota fullscreen, sem layout */}
            <Route path="/play/:deviceCode" element={<Player />} />

            {/* Painel Empresa */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dispositivos" element={<Devices />} />
              <Route path="/dispositivos/:id" element={<DeviceDetail />} />
              <Route path="/midias" element={<Media />} />
              <Route path="/playlists" element={<Playlists />} />
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

export default App;
