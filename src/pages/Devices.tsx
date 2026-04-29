import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { devices } from "@/lib/mock-data";
import { ExternalLink, Plus } from "lucide-react";
import { Link } from "react-router-dom";

export default function DevicesPage() {
  return (
    <>
      <PageHeader
        title="Dispositivos"
        description="Players cadastrados via API. Gere um device_code para vincular um novo display."
        actions={
          <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
            <Plus className="h-4 w-4 mr-1" /> Novo dispositivo
          </Button>
        }
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Loja</TableHead>
              <TableHead>Resolução</TableHead>
              <TableHead>Última comunicação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-mono text-xs">{d.code}</TableCell>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell>{d.store}</TableCell>
                <TableCell className="text-muted-foreground">{d.resolution}</TableCell>
                <TableCell className="text-muted-foreground">{d.lastSeen}</TableCell>
                <TableCell><StatusBadge status={d.status} /></TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/play/${d.code}`} target="_blank">
                      Player <ExternalLink className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
