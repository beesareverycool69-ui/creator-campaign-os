import Link from "next/link";
import { notFound } from "next/navigation";
import { getBrandById } from "@/lib/actions/brands";
import { getLeadsForOutreach } from "@/lib/actions/outreach";
import { SendDMsQueue } from "@/components/features/outreach/send-dms-queue";
import { EmptyState } from "@/components/ui/empty-state";

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
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.min((sentToday / dailyLimit) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-lg border p-4 bg-card/70">
        <p className="text-sm">
          <strong>How it works:</strong> Copy the DM, send it on Instagram, then tap{" "}
          <strong>DM Sent</strong>. Comment on their latest post and tap{" "}
          <strong>Commented</strong>. Hit <strong>Skip</strong> if they're not a fit.
        </p>
      </div>

      {/* Queue */}
      {leads.length === 0 ? (
        <EmptyState
          title="No DMs ready"
          description="Add or qualify creators for this brand, then come back to send outreach."
          actionHref={`/brands/${id}/leads`}
          actionLabel="View Leads"
        />
      ) : (
        <SendDMsQueue brandId={id} initialLeads={leads} />
      )}
    </div>
  );
}
