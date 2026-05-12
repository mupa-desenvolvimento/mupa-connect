import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0 active:scale-[0.98] cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(0,194,255,0.3)] hover:shadow-[0_0_30px_rgba(0,194,255,0.5)] border border-primary/20",
        premium: "bg-gradient-mupa text-primary-foreground font-black uppercase tracking-widest hover:opacity-90 shadow-[0_0_30px_rgba(0,194,255,0.5)] hover:scale-[1.02] border border-white/20",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20 hover:shadow-destructive/40",
        outline: "border-2 border-primary/50 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary shadow-[0_0_15px_rgba(0,194,255,0.1)] hover:shadow-[0_0_20px_rgba(0,194,255,0.2)]",
        secondary: "bg-secondary text-secondary-foreground border border-primary/20 hover:border-primary/50 hover:bg-secondary/80 shadow-lg shadow-black/20 hover:shadow-[0_0_20px_rgba(0,194,255,0.15)]",
        ghost: "text-foreground/70 hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_20px_rgba(0,194,255,0.1)] transition-colors border border-transparent hover:border-primary/20",
        link: "text-primary underline-offset-4 hover:underline font-bold",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-[0_0_20px_rgba(34,197,94,0.3)] border border-success/20",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-[0_0_20px_rgba(234,179,8,0.3)] border border-warning/20",
      },
      size: {
        default: "h-12 px-8 py-3",
        sm: "h-10 rounded-lg px-4 text-xs",
        lg: "h-14 rounded-2xl px-12 text-base",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
