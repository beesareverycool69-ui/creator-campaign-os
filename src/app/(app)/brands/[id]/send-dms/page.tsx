import Link from "next/link";
import { notFound } from "next/navigation";
import { getBrandById } from "@/lib/actions/brands";
import { getLeadsForOutreach } from "@/lib/actions/outreach";
import { SendDMsQueue } from "@/components/features/outreach/send-dms-queue";
import { Button } from "@/components/ui/button";
import { isConfiguredEnv } from "@/lib/env";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SendDMsPage({ params }: Props) {
  const { id } = await params;
  
  const [brand, leads] = await Promise.all([
    getBrandById(id),
    getLeadsForOutreach(id),
  ]);

  if (!brand) {
    notFound();
  }

  const sentToday = leads.filter(l => {
    if (!l.lastContactedAt) return false;
    const today = new Date();
    const contacted = new Date(l.lastContactedAt);
    return contacted.toDateString() === today.toDateString();
  }).length;

  const dailyLimit = 15; // configurable later

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/brands" className="hover:text-foreground">
          Brands
        </Link>
        <span>/</span>
        <Link href={`/brands/${id}`} className="hover:text-foreground">
          {brand.name}
        </Link>
        <span>/</span>
        <span>Send DMs</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Send DMs</h1>
          <p className="text-muted-foreground mt-1">
            Copy the DM, send it on Instagram, then mark it sent
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="rounded-lg border p-4 bg-card/70">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Today's DMs: {sentToday} / {dailyLimit}</span>
          <span className="text-sm text-muted-foreground">{leads.length} in queue</span>
        </div>
        <div className="h-2 bg-[hsl(var(--loading-track))] rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.min((sentToday / dailyLimit) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-lg border p-4 bg-card/70">
        <p className="text-sm">
          <strong>Primary action:</strong> open the creator profile, send the DM, then tap{" "}
          <strong>Mark DM Sent</strong>. Personalizing, copying, commenting, and skipping are supporting controls.
        </p>
      </div>

      {leads.length > 0 && (
        <div className="flex justify-end text-sm">
          <Link
            href={`/brands/${id}/track`}
            className="text-muted-foreground hover:text-foreground"
          >
            Next: Track replies after sending →
          </Link>
        </div>
      )}

      {/* Queue */}
      {leads.length === 0 ? (
        <div className="rounded-lg border bg-card/70 p-8 text-center">
          <h3 className="mb-2 text-lg font-semibold">No DMs ready</h3>
          <p className="mx-auto mb-5 max-w-md text-sm text-muted-foreground">
            If outreach is complete, Track Replies is the next place to log accepts or declines. Otherwise, view leads to qualify more creators.
          </p>
          <div className="flex justify-center gap-2">
            <Link href={`/brands/${id}/track`}>
              <Button>Track Replies →</Button>
            </Link>
            <Link href={`/brands/${id}/leads`}>
              <Button variant="outline">View Leads</Button>
            </Link>
          </div>
        </div>
      ) : (
        <SendDMsQueue
          brandId={id}
          initialLeads={leads}
          aiConfigured={isConfiguredEnv("ANTHROPIC_API_KEY")}
        />
      )}
    </div>
  );
}
