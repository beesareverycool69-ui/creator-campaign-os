import Link from "next/link";
import { notFound } from "next/navigation";
import { AgreementForm, AgreementDetail } from "@/components/features/agreements";
import { getCampaignCreatorById } from "@/lib/actions/campaign-creators";
import { getAgreement } from "@/lib/actions/agreements";

type Props = {
  params: Promise<{ id: string; creatorId: string }>;
};

export default async function AgreementPage({ params }: Props) {
  const { id: campaignId, creatorId } = await params;

  const [campaignCreator, agreement] = await Promise.all([
    getCampaignCreatorById(creatorId),
    getAgreement(creatorId),
  ]);

  if (!campaignCreator) {
    notFound();
  }

  const { campaign, brandCreator } = campaignCreator;
  const { creator } = brandCreator;

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
        <span>Agreement</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Agreement</h1>
        <p className="text-muted-foreground mt-1">
          {creator.name} • {campaign.name}
        </p>
      </div>

      {/* Content */}
      {agreement ? (
        <AgreementDetail agreement={agreement} />
      ) : (
        <AgreementForm
          campaignCreatorId={creatorId}
          campaignId={campaignId}
          defaultRate={
            campaignCreator.rate ? parseFloat(campaignCreator.rate) : undefined
          }
          defaultRateType={campaignCreator.rateType || undefined}
        />
      )}
    </div>
  );
}
