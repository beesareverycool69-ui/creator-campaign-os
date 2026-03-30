import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type BrandCardProps = {
  brand: {
    id: string;
    name: string;
    logoUrl: string | null;
    website: string | null;
    industry: string | null;
    creatorCount: number;
  };
};

export function BrandCard({ brand }: BrandCardProps) {
  return (
    <Link href={`/brands/${brand.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-lg font-semibold shrink-0">
              {brand.logoUrl ? (
                <img
                  src={brand.logoUrl}
                  alt={brand.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                brand.name.charAt(0).toUpperCase()
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{brand.name}</h3>
                {brand.industry && (
                  <Badge variant="secondary" className="capitalize">
                    {brand.industry}
                  </Badge>
                )}
              </div>
              {brand.website && (
                <p className="text-sm text-muted-foreground truncate">
                  {brand.website.replace(/^https?:\/\//, "")}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold">{brand.creatorCount}</div>
              <div className="text-xs text-muted-foreground">creators</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
