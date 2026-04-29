import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MonitorPlay,
  ListVideo,
  Megaphone,
  Image as ImageIcon,
  Store,
  Network,
  Settings,
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

const main = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Dispositivos", url: "/dispositivos", icon: MonitorPlay },
  { title: "Playlists", url: "/playlists", icon: ListVideo },
  { title: "Campanhas", url: "/campanhas", icon: Megaphone },
  { title: "Mídias", url: "/midias", icon: ImageIcon },
];

const org = [
  { title: "Lojas", url: "/lojas", icon: Store },
  { title: "Grupos", url: "/grupos", icon: Network },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const isActive = (path: string) => (path === "/" ? pathname === "/" : pathname.startsWith(path));

  const renderItem = (item: { title: string; url: string; icon: typeof LayoutDashboard }) => (
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
        <SidebarGroup>
          <SidebarGroupLabel>Operação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{main.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Organização</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{org.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {!collapsed && (
          <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3 text-xs text-sidebar-foreground/80">
            <div className="font-semibold text-sidebar-foreground">Acme Retail</div>
            <div className="opacity-70">Plano Empresa · 24 dispositivos</div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
