import Link from "next/link";
import { Button } from "@/components/ui/button";
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
        <div className="text-center py-12 border rounded-lg">
          <h3 className="text-lg font-medium mb-2">No creators yet</h3>
          <p className="text-muted-foreground mb-4">
            Add your first creator to get started.
          </p>
          <Link href="/creators/new">
            <Button>+ Add Creator</Button>
          </Link>
        </div>
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
