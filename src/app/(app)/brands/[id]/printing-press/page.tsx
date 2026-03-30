import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBrandById } from "@/lib/actions/brands";
import { getBrandCreators } from "@/lib/actions/brand-creators";
import { PrintingPressQueue } from "@/components/features/printing-press/printing-press-queue";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PrintingPressPage({ params }: Props) {
  const { id } = await params;
  
  const [brand, activeCreators] = await Promise.all([
    getBrandById(id),
    getBrandCreators(id, "active"),
  ]);

  if (!brand) {
    notFound();
  }

  // Separate creators by brief status (we'll add a field for this later)
  const needsBrief = activeCreators.filter(c => !c.notes?.includes("[BRIEF_SENT]"));
  const briefsSent = activeCreators.filter(c => c.notes?.includes("[BRIEF_SENT]") && !c.notes?.includes("[POSTED]"));
  const posted = activeCreators.filter(c => c.notes?.includes("[POSTED]"));

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
        <span>Printing Press</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">The Printing Press</h1>
            <Badge variant="secondary">DOCUMENT CREATOR</Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Search affiliates, create briefs & agreements, send to creators.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-6 text-sm">
        <span>
          <span className="text-orange-500 font-medium">{needsBrief.length}</span> Needs Brief
        </span>
        <span>
          <span className="text-blue-500 font-medium">{briefsSent.length}</span> Briefs Sent
        </span>
        <span>
          <span className="text-green-500 font-medium">{posted.length}</span> Posted
        </span>
      </div>

      {/* Search */}
      <input 
        type="text"
        placeholder="name or @handle"
        className="w-full max-w-xs px-3 py-2 rounded-md border bg-background text-sm"
      />

      {/* Queue */}
      {activeCreators.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">
            No accepted affiliates yet. Accept creators from the{" "}
            <Link href={`/brands/${id}/track`} className="text-primary hover:underline">
              Track page
            </Link>{" "}
            to start creating briefs.
          </p>
        </div>
      ) : (
        <PrintingPressQueue brandId={id} brand={brand} creators={activeCreators} />
      )}
    </div>
  );
}
