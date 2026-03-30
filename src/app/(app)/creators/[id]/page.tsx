import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlatformBadge, AddPlatformForm } from "@/components/features/creators";
import { getCreatorById } from "@/lib/actions/creators";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CreatorPage({ params }: Props) {
  const { id } = await params;
  const creator = await getCreatorById(id);

  if (!creator) {
    notFound();
  }

  const totalFollowers = creator.platforms.reduce(
    (sum, p) => sum + (p.followerCount || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/creators" className="hover:text-foreground">
          Creators
        </Link>
        <span>/</span>
        <span>{creator.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-6">
        {/* Avatar */}
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-semibold shrink-0">
          {creator.avatarUrl ? (
            <img
              src={creator.avatarUrl}
              alt={creator.name}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            creator.name.charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{creator.name}</h1>
            {creator.tier && (
              <Badge variant="secondary" className="capitalize">
                {creator.tier}
              </Badge>
            )}
            {creator.country && (
              <span className="text-2xl" title={creator.country}>
                {getFlagEmoji(creator.country)}
              </span>
            )}
          </div>
          {creator.email && (
            <p className="text-muted-foreground">{creator.email}</p>
          )}
          {creator.bio && <p className="mt-2">{creator.bio}</p>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {creator.platforms.length}
            </div>
            <p className="text-sm text-muted-foreground">Platforms</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {formatNumber(totalFollowers)}
            </div>
            <p className="text-sm text-muted-foreground">Total Followers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {creator.addresses.length}
            </div>
            <p className="text-sm text-muted-foreground">Addresses</p>
          </CardContent>
        </Card>
      </div>

      {/* Platforms */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Platforms</CardTitle>
          <AddPlatformForm creatorId={creator.id} />
        </CardHeader>
        <CardContent>
          {creator.platforms.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No platforms added yet.
            </p>
          ) : (
            <div className="space-y-3">
              {creator.platforms.map((platform) => (
                <div
                  key={platform.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <PlatformBadge
                      platformId={platform.platformId}
                      handle={platform.handle}
                      verified={platform.verified}
                    />
                    {platform.profileUrl && (
                      <a
                        href={platform.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        View Profile →
                      </a>
                    )}
                  </div>
                  <div className="text-right">
                    {platform.followerCount && (
                      <div className="font-semibold">
                        {formatNumber(platform.followerCount)} followers
                      </div>
                    )}
                    {platform.engagementRate && (
                      <div className="text-sm text-muted-foreground">
                        {platform.engagementRate}% engagement
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Addresses */}
      {creator.addresses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Shipping Addresses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {creator.addresses.map((address) => (
                <div key={address.id} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{address.label || "Address"}</span>
                    {address.isDefault && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {address.recipientName}
                    <br />
                    {address.street1}
                    {address.street2 && <>, {address.street2}</>}
                    <br />
                    {address.city}, {address.state} {address.postalCode}
                    <br />
                    {address.country}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
