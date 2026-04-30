import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: Props) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4", className)}>
      <div className="space-y-1">
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
          {title}
        </h1>
        {description && <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
