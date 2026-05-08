import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MonitorPlay,
  ListVideo,
  Megaphone,
  ImageIcon,
  Store,
  Network,
  Settings,
  ShieldCheck,
  BarChart3,
  BarChart,
  Users,
  Activity,
  User,
  Building2,
  MessageSquare,
  AlertOctagon
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUserRole } from "@/hooks/use-user-role";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { isAdmin, isSuperAdmin, isTecnico, isMarketing, isLoading, tenantId } = useUserRole();

  if (isLoading) return null;


  const mainItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard, visible: true },
    { title: "Dispositivos", url: "/dispositivos", icon: MonitorPlay, visible: isTecnico },
    { title: "Playlists", url: "/playlists", icon: ListVideo, visible: isMarketing },
    { title: "Campanhas", url: "/campanhas", icon: Megaphone, visible: isMarketing },
    { title: "Mídias", url: "/midias", icon: ImageIcon, visible: isMarketing },
    { title: "Inteligência EAN", url: "/admin/analytics/consultas", icon: BarChart3, visible: true },
    { title: "Erros de Consulta", url: "/admin/analytics/erros", icon: AlertOctagon, visible: isTecnico },

    { title: "Trade Marketing", url: "/trade-marketing", icon: BarChart, visible: isMarketing || isAdmin },
    { title: "Painel NOC", url: "/admin/monitoring", icon: Activity, visible: isTecnico },
    { title: "Download de Apps", url: "/aplicativos", icon: MonitorPlay, visible: isTecnico },
    { title: "Face Track Demo", url: "/face-track-demo", icon: User, visible: true },
  ].filter((i) => i.visible);

  const orgItems = [
    { title: "Usuários", url: "/usuarios", icon: Users, visible: isAdmin },
    { title: "Lojas", url: "/lojas", icon: Store, visible: isAdmin || !!tenantId },
    { title: "Grupos", url: "/grupos", icon: Network, visible: isAdmin },
    { title: "Configurações", url: "/configuracoes", icon: Settings, visible: isAdmin },
  ].filter((i) => i.visible);

  const isActive = (path: string) => (path === "/" ? pathname === "/" : pathname.startsWith(path));

  const renderItem = (item: { title: string; url: string; icon: any }) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
        <NavLink to={item.url} end={item.url === "/"} className="flex items-center gap-3">
          <item.icon className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3">
          {collapsed ? (
            <img 
              src="/Artboard 15.svg" 
              alt="MupaMídias" 
              className="h-8 w-8"
            />
          ) : (
            <img 
              src="/logo.svg" 
              alt="MupaMídias" 
              className="h-8 w-auto"
            />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração Global</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderItem({ title: "Empresas & Revendas", url: "/superadmin", icon: Building2 })}
                {renderItem({ title: "Aplicativos", url: "/admin/apps", icon: MonitorPlay })}
                {renderItem({ title: "WhatsApp", url: "/superadmin/whatsapp", icon: MessageSquare })}
                {renderItem({ title: "Monitoramento", url: "/admin/player-logs", icon: LayoutDashboard })}

              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Operação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{mainItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Organização</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{orgItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {!collapsed && (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-[9px] font-black uppercase tracking-widest text-white/40 mb-4">
            <div className="text-primary mb-1">Mupa Cloud</div>
            <div className="opacity-50">Sistema Multitenant v3.0</div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
