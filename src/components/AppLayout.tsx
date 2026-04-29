import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30 px-3">
            <SidebarTrigger />
            <div className="relative hidden md:block">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar dispositivo, loja, mídia…"
                className="pl-8 h-9 w-[320px] bg-muted/40 border-transparent focus-visible:bg-card"
              />
            </div>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="Notificações">
                <Bell className="h-4 w-4" />
              </Button>
              <ThemeToggle />
              <div className="ml-2 h-8 w-8 rounded-full bg-gradient-accent grid place-items-center text-xs font-semibold text-accent-foreground">
                AR
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
