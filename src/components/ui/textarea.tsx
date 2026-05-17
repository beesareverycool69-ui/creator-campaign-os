import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-sm border border-input/80 bg-muted/35 px-3 py-2 text-sm shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)] ring-offset-background transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-muted-foreground/75 hover:border-input focus-visible:border-ring focus-visible:bg-background/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
