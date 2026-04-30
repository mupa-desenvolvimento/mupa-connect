import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { devices, mediaItems, playlists, stores } from "@/lib/mock-data";
import { Activity, MonitorPlay, Image as ImageIcon, Store, ArrowUpRight, Search, AlertTriangle, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subHours, startOfDay, endOfDay } from "date-fns";
import { LineChart, Line, ResponsiveContainer } from "recharts";

const stats = [
  { label: "Dispositivos online", value: devices.filter(d => d.status === "online").length, total: devices.length, icon: MonitorPlay, accent: "text-success" },
  { label: "Lojas ativas",        value: stores.length,    icon: Store,       accent: "text-primary" },
  { label: "Mídias publicadas",   value: mediaItems.length, icon: ImageIcon,  accent: "text-accent" },
  { label: "Playlists em uso",    value: playlists.length, icon: Activity,    accent: "text-warning" },
];


export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Visão geral da operação Mupa 3.0 — em tempo real."
        actions={
          <Button asChild className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
            <Link to="/dispositivos">Gerenciar dispositivos <ArrowUpRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        }
      />

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.label} className="border-border/60 hover:shadow-elegant transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className="mt-2 font-display text-3xl font-bold">
                    {s.value}
                    {s.total !== undefined && <span className="text-base text-muted-foreground font-normal"> / {s.total}</span>}
                  </p>
                </div>
                <div className={`h-10 w-10 rounded-xl bg-muted grid place-items-center ${s.accent}`}>
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display">Status dos dispositivos</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {devices.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-muted grid place-items-center shrink-0">
                    <MonitorPlay className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{d.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{d.store} · {d.code}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground hidden sm:inline">{d.lastSeen}</span>
                  <StatusBadge status={d.status} />
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/play/${d.code}`} target="_blank">Abrir player</Link>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display">Atividade recente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {[
              ["Playlist Padrão atualizada", "há 12 min"],
              ["MUPA-003 ficou offline", "há 2 h"],
              ["Nova mídia: Promo Verão", "ontem"],
              ["Campanha Lançamento agendada", "ontem"],
            ].map(([t, w]) => (
              <div key={t} className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                <div className="flex-1">
                  <div>{t}</div>
                  <div className="text-xs text-muted-foreground">{w}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
