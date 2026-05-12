import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(0,194,255,0.2)] active:shadow-none",
        premium: "bg-gradient-mupa text-primary-foreground font-black uppercase tracking-widest hover:opacity-90 shadow-[0_0_25px_rgba(0,194,255,0.4)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md",
        outline: "border-2 border-primary bg-primary/10 text-primary hover:bg-primary/20 shadow-[0_0_10px_rgba(0,194,255,0.1)]",
        secondary: "bg-white/20 text-white hover:bg-white/30 border-2 border-white/20 shadow-md backdrop-blur-sm",
        ghost: "text-white hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]",


        link: "text-primary underline-offset-4 hover:underline font-bold",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-[0_0_15px_rgba(34,197,94,0.2)]",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-[0_0_15px_rgba(234,179,8,0.2)]",

      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-14 rounded-2xl px-10 text-base",
        icon: "h-11 w-11",
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
