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
    <div className={cn("flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8 mt-2", className)}>
      <div className="space-y-2">
        <h1 className="font-display text-3xl md:text-5xl font-black tracking-tighter text-white uppercase italic">
          {title}
        </h1>
        {description && (
          <p className="text-white/40 text-xs md:text-sm font-bold uppercase tracking-[0.2em] max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 shrink-0 pt-2">
          {actions}
        </div>
      )}
    </div>
  );
}
