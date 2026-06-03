import Link from "next/link";
import { notFound } from "next/navigation";
import { ShipmentForm, ShipmentDetail } from "@/components/features/shipments";
import { NextStepCard } from "@/components/ui/next-step-card";
import { getCampaignCreatorById } from "@/lib/actions/campaign-creators";
import {
  getShipment,
  getCreatorAddresses,
  getBrandProducts,
} from "@/lib/actions/shipments";
import { getPortalUrl } from "@/lib/actions/creator-portal";

type Props = {
  params: Promise<{ id: string; creatorId: string }>;
};

export default async function ShipmentPage({ params }: Props) {
  const { id: campaignId, creatorId } = await params;

  const campaignCreator = await getCampaignCreatorById(creatorId);

  if (!campaignCreator) {
    notFound();
  }

  const { campaign, brandCreator } = campaignCreator;
  const { creator } = brandCreator;

  const [shipment, addresses, products, portalUrl] = await Promise.all([
    getShipment(creatorId),
    getCreatorAddresses(creator.id),
    getBrandProducts(campaign.brand.id),
    getPortalUrl(creatorId),
  ]);

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
        <span>Shipment</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Shipment</h1>
        <p className="text-muted-foreground mt-1">
          {creator.name} • {campaign.name}
        </p>
      </div>

      {shipment ? (
        shipment.trackingNumber ? (
          <NextStepCard
            title="Send Portal Link"
            description="Shipment is tracked. Send the creator portal link so they can upload content when ready."
            href={portalUrl}
            actionLabel="Open Portal Link"
            primary
          />
        ) : (
          <NextStepCard
            title="Add Tracking"
            description="Shipment is created. Add tracking so product delivery is visible before content starts."
            href="#tracking"
            actionLabel="Add Tracking"
            primary
          />
        )
      ) : addresses.length === 0 ? (
        <NextStepCard
          title="Send Portal Link for Address"
          description="This creator has no shipping address yet. Send the portal link so they can save one."
          href={portalUrl}
          actionLabel="Open Portal Link"
          primary
        />
      ) : (
        <NextStepCard
          title="Create Shipment"
          description="Use the saved address to create the shipment record."
          href="#create-shipment"
          actionLabel="Create Shipment"
          primary
        />
      )}

      {/* Content */}
      {shipment ? (
        <ShipmentDetail shipment={shipment} />
      ) : (
        <div id="create-shipment">
          <ShipmentForm
            campaignCreatorId={creatorId}
          campaignId={campaignId}
          addresses={addresses}
            products={products}
          />
        </div>
      )}
    </div>
  );
}
