import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type NextStepCardProps = {
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
  primary?: boolean;
};

export function NextStepCard({
  title,
  description,
  href,
  actionLabel,
  primary = false,
}: NextStepCardProps) {
  return (
    <Card className={primary ? "border-primary/30 bg-primary/5" : undefined}>
      <CardContent className={primary ? "flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between" : "flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"}>
        <div>
          <p className="text-sm font-semibold text-primary">Next: {title}</p>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        {href && actionLabel && (
          <Link href={href} className="shrink-0">
            <Button size="sm" variant={primary ? "default" : "outline"}>
              {actionLabel} →
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
