import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-sm text-sm font-semibold tracking-[-0.01em] ring-offset-background transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:active:translate-y-0",
  {
    variants: {
      variant: {
        default:
          "border border-primary/80 bg-primary text-primary-foreground shadow-[inset_0_1px_0_hsl(var(--primary-foreground)/0.18),0_1px_2px_hsl(var(--background)/0.35)] hover:bg-primary/92 hover:shadow-[inset_0_1px_0_hsl(var(--primary-foreground)/0.22),0_2px_6px_hsl(var(--background)/0.45)] active:shadow-[inset_0_1px_2px_hsl(var(--background)/0.35)]",
        destructive:
          "border border-destructive/80 bg-destructive text-destructive-foreground shadow-[inset_0_1px_0_hsl(var(--destructive-foreground)/0.14),0_1px_2px_hsl(var(--background)/0.35)] hover:bg-destructive/90 active:shadow-[inset_0_1px_2px_hsl(var(--background)/0.35)]",
        outline:
          "border border-input bg-background/70 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)] hover:border-foreground/24 hover:bg-accent/70 hover:text-accent-foreground active:bg-accent/55",
        secondary:
          "border border-border bg-secondary text-secondary-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.06),0_1px_2px_hsl(var(--background)/0.25)] hover:bg-secondary/86 active:shadow-[inset_0_1px_2px_hsl(var(--background)/0.25)]",
        ghost:
          "hover:bg-accent/70 hover:text-accent-foreground active:bg-accent/55",
        link: "text-primary underline-offset-4 hover:underline active:translate-y-0",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3",
        lg: "h-10 px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
