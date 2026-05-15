import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CreatorCard } from "@/components/features/creators";
import { getCreators } from "@/lib/actions/creators";

export default async function CreatorsPage() {
  const creators = await getCreators();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Creators</h1>
          <p className="text-muted-foreground mt-1">
            Manage your creator database
          </p>
        </div>
        <Link href="/creators/new">
          <Button>+ Add Creator</Button>
        </Link>
      </div>

      {/* Creator list */}
      {creators.length === 0 ? (
        <EmptyState
          title="No creators yet"
          description="Add creators once, then attach them to brands and campaigns."
          actionHref="/creators/new"
          actionLabel="+ Add Creator"
        />
      ) : (
        <div className="grid gap-4">
          {creators.map((creator) => (
            <CreatorCard key={creator.id} creator={creator} />
          ))}
        </div>
      )}
    </div>
  );
}
