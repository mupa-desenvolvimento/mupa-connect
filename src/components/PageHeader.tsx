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
    <div className={cn("flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10 mt-2", className)}>
      <div className="space-y-1">
        <h1 className="text-muted-foreground/50 text-xs md:text-sm font-black uppercase tracking-[0.3em] max-w-2xl leading-relaxed">
          {title} {description && <span className="opacity-40 ml-2 font-medium normal-case tracking-normal">/ {description}</span>}
        </h1>
      </div>
      {actions && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
