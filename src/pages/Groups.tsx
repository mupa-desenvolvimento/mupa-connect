import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Folder, MonitorPlay } from "lucide-react";

const tree = [
  {
    name: "Brasil",
    children: [
      { name: "Sudeste", children: [
        { name: "Loja Centro", devices: 4, inherited: true },
        { name: "Loja Shopping Norte", devices: 6, inherited: false },
      ]},
      { name: "Nordeste", children: [
        { name: "Loja Salvador", devices: 2, inherited: true },
      ]},
    ],
  },
];

function Node({ node, depth = 0 }: { node: any; depth?: number }) {
  return (
    <div>
      <div className="flex items-center gap-2 py-2 px-2 rounded hover:bg-muted/50" style={{ paddingLeft: depth * 20 + 8 }}>
        {node.children ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <span className="w-4" />}
        {node.children ? <Folder className="h-4 w-4 text-primary" /> : <MonitorPlay className="h-4 w-4 text-muted-foreground" />}
        <span className="font-medium">{node.name}</span>
        {node.devices !== undefined && (
          <span className="text-xs text-muted-foreground ml-2">{node.devices} dispositivos</span>
        )}
        {node.inherited && (
          <span className="ml-auto text-[10px] uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">herdado</span>
        )}
      </div>
      {node.children?.map((c: any) => <Node key={c.name} node={c} depth={depth + 1} />)}
    </div>
  );
}

export default function GroupsPage() {
  return (
    <>
      <PageHeader
        title="Grupos"
        description="Hierarquia de grupos com herança de playlist. Filhos podem sobrescrever."
      />
      <Card>
        <CardContent className="p-3">
          {tree.map(n => <Node key={n.name} node={n} />)}
        </CardContent>
      </Card>
    </>
  );
}
