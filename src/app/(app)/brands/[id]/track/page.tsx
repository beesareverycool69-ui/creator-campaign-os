import Link from "next/link";
import { notFound } from "next/navigation";
import { getBrandById } from "@/lib/actions/brands";
import { getBrandCreators, getLeadStatusCounts } from "@/lib/actions/brand-creators";
import { TrackList } from "@/components/features/outreach/track-list";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function TrackPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab = "pending" } = await searchParams;
  
  const [brand, statusCounts] = await Promise.all([
    getBrandById(id),
    getLeadStatusCounts(id),
  ]);

  if (!brand) {
    notFound();
  }

  // Get leads based on tab
  const statusFilter = tab === "pending" ? "contacted" : tab === "accepted" ? "active" : "churned";
  const leads = await getBrandCreators(id, statusFilter as any);

  const pendingCount = statusCounts["contacted"] || 0;
  const acceptedCount = statusCounts["active"] || 0;
  const declinedCount = (statusCounts["churned"] || 0) + (statusCounts["blacklisted"] || 0);
  const totalContacted = pendingCount + acceptedCount + declinedCount;
  const conversionRate = totalContacted > 0 ? Math.round((acceptedCount / totalContacted) * 100) : 0;

  const tabs = [
    { id: "pending", label: "Pending", count: pendingCount },
    { id: "accepted", label: "Accepted", count: acceptedCount },
    { id: "declined", label: "Declined", count: declinedCount },
  ];

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
        <span>Track</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Track Responses</h1>
        <p className="text-muted-foreground mt-1">
          Log responses and manage your contact directory
        </p>
      </div>

      {/* Stats */}
      <div className="rounded-lg border p-4 bg-muted/30">
        <div className="flex items-center gap-8 text-sm">
          <span>
            <span className="text-2xl font-bold text-yellow-500">{pendingCount}</span>{" "}
            <span className="text-muted-foreground">Awaiting Response</span>
          </span>
          <span>
            <span className="text-2xl font-bold text-green-500">{acceptedCount}</span>{" "}
            <span className="text-muted-foreground">Accepted</span>
          </span>
          <span>
            <span className="text-2xl font-bold text-red-500">{declinedCount}</span>{" "}
            <span className="text-muted-foreground">Declined</span>
          </span>
          <span>
            <span className="text-2xl font-bold text-primary">{conversionRate}%</span>{" "}
            <span className="text-muted-foreground">Conversion Rate</span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          <strong>How it works:</strong> When a lead responds, tap <strong>Accepted</strong> to move them to your partner pipeline or <strong>Declined</strong> to start the 90-day cooldown. Accepted leads move to Affiliates for campaign management.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((t) => (
          <Link key={t.id} href={`/brands/${id}/track?tab=${t.id}`}>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === t.id
                  ? t.id === "pending" ? "bg-yellow-500 text-black" :
                    t.id === "accepted" ? "bg-green-500 text-white" :
                    "bg-red-500 text-white"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {t.label} <span className="ml-1 opacity-70">{t.count}</span>
            </button>
          </Link>
        ))}
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-4">
        <input 
          type="text"
          placeholder="Search by name or handle..."
          className="flex-1 px-3 py-2 rounded-md border bg-background text-sm"
        />
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-xs rounded-md bg-muted">All</button>
          <button className="px-3 py-1.5 text-xs rounded-md bg-muted">DM Sent</button>
          <button className="px-3 py-1.5 text-xs rounded-md bg-muted">Follow-up 1</button>
          <button className="px-3 py-1.5 text-xs rounded-md bg-muted">Follow-up 2</button>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-xs rounded-md border">Newest</button>
          <button className="px-3 py-1.5 text-xs rounded-md border">Oldest</button>
          <button className="px-3 py-1.5 text-xs rounded-md border">A-Z</button>
        </div>
      </div>

      {/* List */}
      <div>
        <p className="text-sm text-muted-foreground mb-4">{leads.length} leads</p>
        {leads.length === 0 ? (
          <div className="rounded-lg border p-8 text-center">
            <p className="text-muted-foreground">
              No leads in this status.
            </p>
          </div>
        ) : (
          <TrackList brandId={id} leads={leads} currentTab={tab} />
        )}
      </div>
    </div>
  );
}
