import Link from "next/link";
import { notFound } from "next/navigation";
import { getBrandById } from "@/lib/actions/brands";
import { getLeadsForFollowUp, getLeadsForReEngage } from "@/lib/actions/outreach";
import { FollowUpsQueue } from "@/components/features/outreach/follow-ups-queue";
import { EmptyState } from "@/components/ui/empty-state";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function FollowUpsPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab = "fu1" } = await searchParams;
  
  const [brand, fu1Leads, fu2Leads, reEngageLeads] = await Promise.all([
    getBrandById(id),
    getLeadsForFollowUp(id, 1),
    getLeadsForFollowUp(id, 2),
    getLeadsForReEngage(id),
  ]);

  if (!brand) {
    notFound();
  }

  const tabs = [
    { id: "fu1", label: "Follow-up 1", count: fu1Leads.length },
    { id: "fu2", label: "Follow-up 2", count: fu2Leads.length },
    { id: "reengage", label: "Re-engage", count: reEngageLeads.length },
  ];

  const currentLeads = tab === "fu1" ? fu1Leads : tab === "fu2" ? fu2Leads : reEngageLeads;

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
        <span>Follow-ups</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Follow-ups</h1>
        <p className="text-muted-foreground mt-1">
          Auto-scheduled follow-up messages. Weekends skipped.
        </p>
      </div>

      {/* Stats */}
      <div className="rounded-lg border p-4 bg-muted/30">
        <div className="flex items-center gap-6 text-sm">
          <span>
            <span className="text-primary font-medium">{fu1Leads.length}</span>{" "}
            Follow-up 1 Ready
            <span className="text-muted-foreground ml-1">+{fu1Leads.length} upcoming</span>
          </span>
          <span>
            <span className="text-primary font-medium">{fu2Leads.length}</span>{" "}
            Follow-up 2 Ready
            <span className="text-muted-foreground ml-1">+{fu2Leads.length} upcoming</span>
          </span>
          <span>
            <span className="text-green-500 font-medium">{reEngageLeads.length}</span>{" "}
            Re-engage Ready
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Schedule: FU1: 3 days after DM • FU2: 5 days after FU1
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((t) => (
          <Link key={t.id} href={`/brands/${id}/follow-ups?tab=${t.id}`}>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {t.label} <span className="ml-1 opacity-70">+{t.count}</span>
            </button>
          </Link>
        ))}
      </div>

      {/* Queue */}
      {currentLeads.length === 0 ? (
        <EmptyState
          title="No follow-ups due"
          description="You are caught up. New follow-ups appear here after outreach timing is met."
          actionHref={`/brands/${id}/send-dms`}
          actionLabel="Send DMs"
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            <strong>Upcoming</strong> • Timer is ticking. You can send early if you want.
          </p>
          <FollowUpsQueue brandId={id} initialLeads={currentLeads} followUpType={tab as "fu1" | "fu2" | "reengage"} />
        </>
      )}
    </div>
  );
}
