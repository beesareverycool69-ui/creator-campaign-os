import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-sm border border-border/80 bg-card/70 px-6 py-7 text-center shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03),0_10px_28px_hsl(var(--background)/0.16)]">
      <div className="mx-auto mb-4 h-8 w-8 rounded-sm border border-border/70 bg-muted/35 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]" />
      <h3 className="mb-2 text-base font-semibold leading-none tracking-[-0.02em]">
        {title}
      </h3>
      <p className="mx-auto mb-5 max-w-md text-sm leading-5 text-muted-foreground">
        {description}
      </p>
      {actionHref && actionLabel && (
        <Link href={actionHref}>
          <Button>{actionLabel}</Button>
        </Link>
      )}
    </div>
  );
}
