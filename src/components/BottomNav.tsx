import { Home, MonitorPlay, ListVideo, Building2, Settings, Menu } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const items = [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Dispositivos", url: "/dispositivos", icon: MonitorPlay },
    { title: "Playlists", url: "/playlists", icon: ListVideo },
    { title: "Empresas", url: "/superadmin", icon: Building2 },
    { title: "Config", url: "/configuracoes", icon: Settings },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 h-16 flex items-center justify-around px-2 pb-safe">
      {items.map((item) => (
        <button
          key={item.title}
          onClick={() => navigate(item.url)}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
            pathname === item.url ? "text-primary" : "text-muted-foreground"
          )}
        >
          <item.icon className="h-6 w-6" />
          <span className="text-[10px] font-medium">{item.title}</span>
        </button>
      ))}
    </div>
  );
}
