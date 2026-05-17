import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-[0.1em] transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-primary/40 bg-primary/16 text-primary-foreground hover:bg-primary/24",
        secondary:
          "border-border/70 bg-secondary/45 text-secondary-foreground hover:bg-secondary/60",
        destructive:
          "border-destructive/40 bg-destructive/16 text-destructive-foreground hover:bg-destructive/24",
        outline:
          "border-border/70 bg-background/30 text-muted-foreground hover:bg-accent/40 hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
