import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentUploadForm } from "@/components/features/content";
import { getCampaignCreatorById } from "@/lib/actions/campaign-creators";

type Props = {
  params: Promise<{ id: string; creatorId: string }>;
};

export default async function NewContentPage({ params }: Props) {
  const { id: campaignId, creatorId } = await params;

  const campaignCreator = await getCampaignCreatorById(creatorId);

  if (!campaignCreator) {
    notFound();
  }

  const { campaign, brandCreator } = campaignCreator;
  const { creator } = brandCreator;

  // Get creator's platforms for the form
  const platforms = creator.platforms.map((p) => ({
    id: p.id,
    platformId: p.platformId,
    handle: p.handle,
  }));

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/campaigns" className="hover:text-foreground">
          Campaigns
        </Link>
        <span>/</span>
        <Link href={`/campaigns/${campaignId}`} className="hover:text-foreground">
          {campaign.name}
        </Link>
        <span>/</span>
        <Link
          href={`/campaigns/${campaignId}/creators/${creatorId}`}
          className="hover:text-foreground"
        >
          {creator.name}
        </Link>
        <span>/</span>
        <Link
          href={`/campaigns/${campaignId}/creators/${creatorId}/content`}
          className="hover:text-foreground"
        >
          Content
        </Link>
        <span>/</span>
        <span>New</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Submit Content</h1>
        <p className="text-muted-foreground">
          Upload content for {campaign.name}
        </p>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <ContentUploadForm
          campaignCreatorId={creatorId}
          campaignId={campaignId}
          platforms={platforms}
        />
      </div>
    </div>
  );
}
