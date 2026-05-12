import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-primary/20 bg-primary/15 text-primary hover:bg-primary/25 shadow-[0_0_10px_rgba(0,194,255,0.1)]",
        secondary: "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
        destructive: "border-destructive/20 bg-destructive/15 text-destructive hover:bg-destructive/25 shadow-[0_0_10px_rgba(239,68,68,0.1)]",
        outline: "text-white/60 border-white/20 bg-white/[0.02] hover:border-white/40 transition-colors",

      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
