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
  Users,
  Activity,
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
    { title: "Painel NOC", url: "/admin/monitoring", icon: Activity, visible: isTecnico },
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
          <div className="h-8 w-8 rounded-lg bg-gradient-primary shadow-glow grid place-items-center">
            <span className="font-display font-bold text-primary-foreground text-sm">M</span>
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-display font-bold tracking-tight">Mupa <span className="text-primary">3.0</span></div>
              <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/60">Signage Cloud</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração Global</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderItem({ title: "SuperAdmin", url: "/superadmin", icon: ShieldCheck })}
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
          <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3 text-xs text-sidebar-foreground/80">
            <div className="font-semibold text-sidebar-foreground">Mupa Cloud</div>
            <div className="opacity-70">Sistema Multitenant</div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
