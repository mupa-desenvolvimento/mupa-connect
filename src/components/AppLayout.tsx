import { Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Bell, Search, LogOut, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { SupportCompanySelector } from "./SupportCompanySelector";
import { BottomNav } from "./BottomNav";
import { useIsMobile } from "@/hooks/use-mobile";



export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [session, setSession] = useState<Session | null>(null);


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Logout realizado");
      navigate("/login");
    } catch (error: any) {
      toast.error(error.message || "Erro ao sair");
    }
  };

  const userEmail = session?.user?.email || "";
  const userInitials = userEmail.substring(0, 2).toUpperCase() || "US";

  const isEditor = location.pathname.startsWith("/playlists/") && location.pathname !== "/playlists";
  const isNOC = location.pathname === "/admin/monitoring";

  if (isEditor || isNOC) {
    return (
      <div className={cn("min-h-screen w-full", isEditor ? "bg-[#09090b]" : "bg-background")}>
        {isNOC ? (
          <div className="h-screen w-screen p-4">
            <Outlet />
          </div>
        ) : (
          <Outlet />
        )}
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#050816]">
        <AppSidebar />

        <div className={cn("flex-1 flex flex-col min-w-0", isMobile && "pb-20")}>
          <header className="h-16 flex items-center gap-4 border-b border-white/5 bg-[#050816]/60 backdrop-blur-2xl sticky top-0 z-30 px-6">
            <SidebarTrigger className={cn(isMobile && "hidden")} />
            {isMobile && (
              <div className="flex items-center gap-2">
                <img src="/Artboard 15.svg" alt="Mupa" className="h-7 w-7" />
                <span className="font-display font-bold text-sm tracking-tight">Mupa</span>
              </div>
            )}

            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
              <Input
                placeholder="Pesquisar..."
                className="pl-10 h-10 w-[280px] bg-white/5 border-transparent focus:border-primary/50 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <SupportCompanySelector />
              <Button variant="ghost" size="icon" aria-label="Notificações">
                <Bell className="h-4 w-4" />
              </Button>
              <ThemeToggle />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="ml-2 h-8 w-8 rounded-full bg-gradient-accent grid place-items-center text-xs font-semibold text-accent-foreground relative overflow-hidden">
                    {userInitials}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">Minha Conta</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {userEmail}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/configuracoes")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
            <Outlet />
          </main>
          {isMobile && <BottomNav />}
        </div>
      </div>
    </SidebarProvider>

  );
}

