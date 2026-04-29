import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { campaigns } from "@/lib/mock-data";
import { Plus } from "lucide-react";

export default function CampaignsPage() {
  return (
    <>
      <PageHeader
        title="Campanhas"
        description="Agendamento por data, horário e prioridade. Sobrescreve playlists base."
        actions={<Button className="bg-gradient-primary text-primary-foreground shadow-glow"><Plus className="h-4 w-4 mr-1" /> Nova campanha</Button>}
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campanha</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Fim</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Mídias</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.startDate}</TableCell>
                <TableCell className="text-muted-foreground">{c.endDate}</TableCell>
                <TableCell><span className="font-mono text-xs">P{c.priority}</span></TableCell>
                <TableCell className="text-muted-foreground">{c.mediaIds.length}</TableCell>
                <TableCell><StatusBadge status={c.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
